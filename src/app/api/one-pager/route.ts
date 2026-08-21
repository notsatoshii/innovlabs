// POST /api/one-pager — generate (or return the cached) personalized one-pager
// for the signed-in user. RLS scopes all reads/writes to their own profile row.

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { generateOnePager, type OnePager } from "@/lib/onepager/generate";
import type { TrackId } from "@/lib/survey/types";
import { TRACKS } from "@/lib/survey/tracks";

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
    .select("track, depth_flag, core, one_pager")
    .eq("user_id", user.id)
    .single();
  if (profileError || !profile) {
    return NextResponse.json({ error: "no_profile" }, { status: 404 });
  }

  const track = (profile.track ?? "docs_admin") as TrackId;

  // Generate once, serve cached afterwards.
  if (profile.one_pager) {
    return NextResponse.json({
      track,
      trackName: TRACKS[track].name,
      onePager: profile.one_pager as OnePager,
      cached: true,
    });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "generation_unavailable" }, { status: 503 });
  }

  let onePager: OnePager;
  try {
    onePager = await generateOnePager({
      core: (profile.core ?? {}) as Record<string, unknown>,
      track,
      depthFlag: profile.depth_flag,
    });
  } catch (e) {
    console.error("one-pager generation failed:", e);
    return NextResponse.json({ error: "generation_failed" }, { status: 502 });
  }

  const { error: saveError } = await supabase
    .from("user_profile")
    .update({
      one_pager: onePager,
      one_pager_generated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);
  if (saveError) {
    console.error("one-pager save failed:", saveError.message);
  }

  await supabase.from("profile_event").insert({
    user_id: user.id,
    type: "one_pager_generated",
    data: { track },
  });

  return NextResponse.json({
    track,
    trackName: TRACKS[track].name,
    onePager,
    cached: false,
  });
}
