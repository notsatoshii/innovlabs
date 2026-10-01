// POST /api/one-pager: return the signed-in learner's personalized one-pager,
// generating it on first call. RLS scopes the profile read to their own row;
// the cache write and the generation guard go through the service role.
//
// Spend guard (review P0-4, P2-11), in the order the checks run:
//   1. employee path only: no other path ever reaches the model
//   2. a current-version cached report is returned as is
//   3. no service-role client or no guard columns -> 503, never an unguarded call
//   4. atomic claim: one generation at a time per profile, MAX_ATTEMPTS in total
//   5. free text from `core` is capped before it reaches the prompt (lib/onepager/learner.ts)

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { generateOnePager } from "@/lib/onepager/generate";
import {
  claimGeneration,
  finishGeneration,
  releaseClaim,
  waitForOnePager,
} from "@/lib/onepager/claim";
import { isOnePager } from "@/lib/onepager/types";
import type { TrackId } from "@/lib/survey/types";
import { TRACKS } from "@/lib/survey/tracks";

/** How long a second request waits for the first one's report before giving up. */
const WAIT_FOR_OTHER_MS = 40_000;
const WAIT_INTERVAL_MS = 2_500;

// User-facing copy travels with the error code so the client can show it.
const MESSAGES = {
  generation_unavailable:
    "리포트 생성 기능은 아직 준비 중이에요. 준비되는 대로 이메일로 알려드릴게요.",
  generation_in_progress: "리포트를 만들고 있어요. 잠시 뒤에 다시 열어 주세요.",
  attempt_limit:
    "리포트를 만드는 데 문제가 이어지고 있어요. 번거로우시겠지만 InnovLabs 팀에 문의해 주시면 바로 확인해 드릴게요.",
  generation_failed: "잠시 연결이 원활하지 않았어요. 조금 뒤에 다시 시도해 주세요.",
} as const;

function fail(error: keyof typeof MESSAGES, status: number) {
  return NextResponse.json({ error, message: MESSAGES[error] }, { status });
}

export async function POST() {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profile")
    .select("path, track, depth_flag, core, one_pager")
    .eq("user_id", user.id)
    .single();
  if (profileError || !profile) {
    return NextResponse.json({ error: "no_profile" }, { status: 404 });
  }

  // The one-pager is the employee product (phase-hagwon.md H5): other paths
  // never reach the LLM, and nothing gets cached for them.
  if (profile.path !== "employee") {
    return NextResponse.json({ error: "no_one_pager_for_path" }, { status: 409 });
  }

  // `track` comes from a row the learner seeded: only a known id is used.
  const track: TrackId =
    typeof profile.track === "string" && Object.hasOwn(TRACKS, profile.track)
      ? (profile.track as TrackId)
      : "docs_admin";
  const trackName = TRACKS[track].name;

  // Generate once, serve cached afterwards. A report from an older version
  // (placeholder fact sheets) does not count and is regenerated.
  if (isOnePager(profile.one_pager)) {
    return NextResponse.json({ track, trackName, onePager: profile.one_pager, cached: true });
  }

  if (!process.env.ANTHROPIC_API_KEY) return fail("generation_unavailable", 503);

  // one_pager and the guard columns are service-role only (migration 0004
  // grants `authenticated` the identity fields and nothing else). Without the
  // service role nothing could be cached or counted, so nothing is generated.
  const admin = supabaseAdmin();
  if (!admin) {
    console.error("one-pager: SUPABASE_SECRET_KEY is not set; generation refused");
    return fail("generation_unavailable", 503);
  }

  const claim = await claimGeneration(admin, user.id);
  if (claim.status === "unavailable") {
    console.error("one-pager: generation guard unavailable:", claim.reason);
    return fail("generation_unavailable", 503);
  }
  if (claim.status === "exhausted") return fail("attempt_limit", 429);
  if (claim.status === "in_progress") {
    const other = await waitForOnePager(admin, user.id, {
      timeoutMs: WAIT_FOR_OTHER_MS,
      intervalMs: WAIT_INTERVAL_MS,
    });
    if (other) return NextResponse.json({ track, trackName, onePager: other, cached: true });
    return fail("generation_in_progress", 409);
  }

  let onePager;
  try {
    onePager = await generateOnePager({
      core: (profile.core ?? {}) as Record<string, unknown>,
      track,
      depthFlag: profile.depth_flag,
    });
  } catch (e) {
    console.error(`one-pager generation failed (attempt ${claim.attempt}):`, e);
    await releaseClaim(admin, user.id);
    return fail("generation_failed", 502);
  }

  // If the save fails the learner still gets this report; the claim is
  // released so a later visit can regenerate, within the attempt cap.
  const saved = await finishGeneration(admin, user.id, onePager);
  if (!saved) await releaseClaim(admin, user.id);

  // Service role: learners may not insert this type themselves (0009).
  await admin.from("profile_event").insert({
    user_id: user.id,
    type: "one_pager_generated",
    visibility: "learner",
    data: { track },
  });

  return NextResponse.json({ track, trackName, onePager, cached: false });
}
