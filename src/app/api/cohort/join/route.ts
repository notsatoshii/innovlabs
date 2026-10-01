// POST /api/cohort/join — enrollment by cohort code (phase-2.md P1).
//
// The learner types the 6-character code the instructor shared in the room.
// The only thing taken from the client is that code: the user comes from the
// session, the cohort and its track from the database. Both writes
// (enrollment, and the staff-written `enrolled` event) use the service role
// after the learner guard, because neither table is client-writable.
//
// Idempotent: posting the same code again while enrolled returns ok and
// writes nothing.

import { bad, ok, requireLearner } from "@/lib/auth/guards";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { EVENT_TYPES } from "@/lib/profile/events";
import type { Cohort, Enrollment, JoinCohortRequest } from "@/lib/courses/types";

const CODE_PATTERN = /^[A-Z0-9]{6}$/;

export async function POST(req: Request) {
  const auth = await requireLearner();
  if ("response" in auth) return auth.response;
  const userId = auth.user.id;

  let body: Partial<JoinCohortRequest> | null;
  try {
    body = (await req.json()) as Partial<JoinCohortRequest> | null;
  } catch {
    return bad("bad_json", 400);
  }

  // Abuse guard: anything that is not a well-formed code never reaches the
  // database.
  const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
  if (!CODE_PATTERN.test(code)) return bad("invalid_code", 400);

  // Six characters can be guessed: at most 10 tries per learner per 10 minutes
  // (per server process; enough to make guessing pointless for one cohort).
  if (!allowAttempt(auth.user.id)) return bad("too_many_attempts", 429);

  const admin = supabaseAdmin();
  if (!admin) return bad("server_not_configured", 503);

  const { data: cohortRow, error: cohortError } = await admin
    .from("cohort")
    .select("id,track_code,status")
    .eq("code", code)
    .maybeSingle();
  if (cohortError) {
    console.error("cohort/join: cohort lookup failed:", cohortError.message);
    return bad("lookup_failed", 500);
  }
  if (!cohortRow) return bad("invalid_code", 404);
  const cohort = cohortRow as Pick<Cohort, "id" | "track_code" | "status">;

  const { data: existingRow, error: existingError } = await admin
    .from("enrollment")
    .select("status")
    .eq("cohort_id", cohort.id)
    .eq("user_id", userId)
    .maybeSingle();
  if (existingError) {
    console.error("cohort/join: enrollment lookup failed:", existingError.message);
    return bad("lookup_failed", 500);
  }
  const existing = existingRow as Pick<Enrollment, "status"> | null;
  if (existing) {
    // Already in: nothing to write. A dropped or completed enrollment is a
    // staff decision, so a code never flips it back to active.
    return existing.status === "active" ? ok({}) : bad("enrollment_inactive", 409);
  }

  if (cohort.status === "done") return bad("cohort_closed", 409);

  const { error: enrollError } = await admin
    .from("enrollment")
    .insert({ cohort_id: cohort.id, user_id: userId, status: "active" });
  if (enrollError) {
    // 23505: a parallel request (double tap) inserted the row first. That
    // request writes the event, so this one is done.
    if (enrollError.code === "23505") return ok({});
    console.error("cohort/join: enrollment insert failed:", enrollError.message);
    return bad("store_failed", 500);
  }

  const { error: eventError } = await admin.from("profile_event").insert({
    user_id: userId,
    type: EVENT_TYPES.enrolled,
    visibility: "learner",
    data: { version: 1, cohort_id: cohort.id, track: cohort.track_code, via: "code" },
  });
  if (eventError) {
    // Keep "enrolled ⇒ an enrolled event exists": take the new row back so a
    // retry writes both, instead of leaving an enrollment the log never saw.
    console.error("cohort/join: enrolled event insert failed:", eventError.message);
    const { error: undoError } = await admin
      .from("enrollment")
      .delete()
      .eq("cohort_id", cohort.id)
      .eq("user_id", userId);
    if (undoError) {
      console.error("cohort/join: could not undo enrollment after event failure:", undoError.message);
    }
    return bad("store_failed", 500);
  }

  return ok({});
}

const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
const ATTEMPT_LIMIT = 10;
const attempts = new Map<string, number[]>();

function allowAttempt(userId: string): boolean {
  const now = Date.now();
  const recent = (attempts.get(userId) ?? []).filter((t) => now - t < ATTEMPT_WINDOW_MS);
  if (recent.length >= ATTEMPT_LIMIT) {
    attempts.set(userId, recent);
    return false;
  }
  recent.push(now);
  attempts.set(userId, recent);
  return true;
}
