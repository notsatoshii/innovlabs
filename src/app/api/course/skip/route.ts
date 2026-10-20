// POST /api/course/skip: the level's skip test (SkipRequest; game design
// §3.1, L1 "Skip-ahead test").
//
// Graded against the level's skip_test mission (its I1, its pick and its I3
// hold the answer keys). Pass = every card right, the pick right, the planted
// error found within two taps, and the set inside 180 seconds. The time is
// the larger of the client's count and the server's own: from the start row
// that POST /api/course/progress { missionId: <skip test>, screen: 0 } wrote
// when the test opened (client count only when there is no start row).
//
// One attempt: the result is written once (conditional on result is null)
// and a second request gets 409 already_taken. The test is offered only while
// no mission of the level is done (409 not_available).
//
// On a pass, every scored item on the skippable screens of the level's
// missions is credited at the plain first-try rate as a "skip:<item>" row,
// leaving out items already answered; the answer and step routes then pay 0
// for those items, so skipping never pays more than playing.
//
// Response: { result: "passed" | "failed", credited, cardsRight, cardsTotal,
// pickRight, spotFound, inTime }. SkipRequest has no course; it defaults to
// spine0 (skip tests exist for Levels 1 to 3) and an optional `course` is read.

import { requireLearner, ok, bad } from "@/lib/auth/guards";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { getLevelMissions, onPath, skipTestOf } from "@/lib/course/content";
import { gradeSkipTest, skipCredits } from "@/lib/course/score";
import { getMissionAccess, readXpRows } from "@/lib/course/state";
import { COURSES } from "@/lib/course/validate";
import type { MissionContent } from "@/lib/course/types";
import { readCourseBody } from "../_lib/request";

function strings(value: unknown, max: number, each: number): string[] | null {
  if (!Array.isArray(value) || value.length > max) return null;
  return value.every((v) => typeof v === "string" && v.length <= each) ? (value as string[]) : null;
}

export async function POST(req: Request) {
  const auth = await requireLearner();
  if ("response" in auth) return auth.response;

  const read = await readCourseBody(req);
  if ("response" in read) return read.response;
  const b = read.body;
  const course = b.course === undefined ? "spine0" : b.course;
  const level = b.level;
  const cards = strings(b.cards, 30, 10);
  const spotTaps = strings(b.spotTaps, 20, 300);
  const pick = typeof b.pick === "string" && b.pick.length <= 40 ? b.pick : null;
  const seconds = typeof b.seconds === "number" && Number.isFinite(b.seconds) ? b.seconds : null;
  if (
    typeof course !== "string" ||
    !COURSES.includes(course as MissionContent["course"]) ||
    typeof level !== "number" ||
    !Number.isInteger(level) ||
    level < 1 ||
    level > 12 ||
    !cards ||
    !spotTaps ||
    pick === null ||
    seconds === null
  ) {
    return bad("bad_request", 400);
  }

  const supabase = await supabaseServer();
  const all = await getLevelMissions(course, level);
  const test = skipTestOf(all);
  if (!test) return bad("no_skip_test", 404);
  const path = onPath(all);
  const userId = auth.user.id;

  let access;
  try {
    access = await getMissionAccess(userId, test, supabase);
  } catch (e) {
    console.error((e as Error).message);
    return bad("read_failed", 500);
  }
  if (access.progress?.result) return bad("already_taken", 409);
  if (access.status === "locked") return bad("not_available", 409);

  const admin = supabaseAdmin();
  if (!admin) return bad("not_configured", 503);

  const startedAt = access.progress ? Date.parse(access.progress.updated_at) : NaN;
  const serverSeconds = Number.isFinite(startedAt) ? Math.max(0, (Date.now() - startedAt) / 1000) : 0;
  const graded = gradeSkipTest(test, { cards, pick, spotTaps, seconds: Math.max(seconds, serverSeconds) });
  if (!graded.ok) {
    if (graded.error === "not_a_skip_test") console.error(`skip test ${test.id} has no I1, pick or I3`);
    return bad(graded.error, graded.error === "bad_answer" ? 400 : 500);
  }
  const { grade } = graded;
  const result = grade.passed ? "passed" : "failed";

  // The one attempt: the row exists (start record or not), then the result
  // is set only where it is still null.
  const now = new Date().toISOString();
  const ensure = await admin
    .from("course_progress")
    .upsert(
      { user_id: userId, mission_id: test.id, screen: 0, updated_at: now },
      { onConflict: "user_id,mission_id", ignoreDuplicates: true },
    );
  if (ensure.error) {
    console.error("course_progress insert failed:", ensure.error.message);
    return bad("store_failed", 500);
  }
  const { data: claimed, error: claimError } = await admin
    .from("course_progress")
    .update({ result, done_at: now, screen: Math.max(0, test.screens.length - 1), updated_at: now })
    .eq("user_id", userId)
    .eq("mission_id", test.id)
    .is("result", null)
    .select("mission_id");
  if (claimError) {
    console.error("course_progress result failed:", claimError.message);
    return bad("store_failed", 500);
  }
  if (!claimed || claimed.length === 0) return bad("already_taken", 409);

  let credited = 0;
  if (grade.passed && path.length > 0) {
    let prior;
    try {
      prior = await readXpRows(
        supabase,
        userId,
        path.map((m) => m.id),
      );
    } catch (e) {
      console.error((e as Error).message);
      return bad("read_failed", 500);
    }
    const rows = path.flatMap((m) =>
      skipCredits(
        m,
        prior.filter((r) => r.mission_id === m.id),
      ).map((c) => ({ user_id: userId, mission_id: m.id, part: c.part, item: c.item, amount: c.amount, correct: true })),
    );
    if (rows.length > 0) {
      const { data, error } = await admin
        .from("course_xp")
        .upsert(rows, { onConflict: "user_id,mission_id,item", ignoreDuplicates: true })
        .select("amount");
      if (error) {
        // The result stands; the credit can be re-run by hand from the rows above.
        console.error("skip credit insert failed:", error.message);
        return bad("store_failed", 500);
      }
      credited = ((data ?? []) as { amount: number }[]).reduce((s, r) => s + r.amount, 0);
    }
  }

  return ok({ result, credited, ...grade });
}
