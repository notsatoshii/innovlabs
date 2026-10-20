// POST /api/course/progress: the furthest screen reached, and the mission's
// end (ProgressRequest -> ProgressResponse).
//
// - `screen` must be an index of the mission's screens; the stored screen
//   only moves forward (a conditional update, so concurrent requests cannot
//   move it back).
// - `done: true` is accepted only with the last screen's index, and only when
//   every own-work step (I9) of the mission was recorded by /api/course/step,
//   so a badge always points at an artifact. done_at is set once.
// - On done, the mission's badges are inserted with "on conflict do nothing";
//   the response lists only the ones this request added. Badges are inserted
//   on every done request, so a failure between done_at and the badges heals
//   on the next one.
// - A skip test takes only { screen: 0 }: the row records when the test
//   started (the skip route times the set from it). Its result is written by
//   /api/course/skip.

import { requireLearner, ok, bad } from "@/lib/auth/guards";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { missionInteractions } from "@/lib/course/score";
import { readXpRows } from "@/lib/course/state";
import type { ProgressResponse } from "@/lib/course/types";
import { loadPlayable, missionIdField, readCourseBody } from "../_lib/request";

export async function POST(req: Request) {
  const auth = await requireLearner();
  if ("response" in auth) return auth.response;

  const read = await readCourseBody(req);
  if ("response" in read) return read.response;
  const missionId = missionIdField(read.body.missionId);
  const screen = read.body.screen;
  const done = read.body.done;
  if (!missionId || typeof screen !== "number" || !Number.isInteger(screen) || screen < 0) return bad("bad_request", 400);
  if (done !== undefined && typeof done !== "boolean") return bad("bad_request", 400);

  const supabase = await supabaseServer();
  const playable = await loadPlayable(supabase, auth.user.id, missionId, true);
  if ("response" in playable) return playable.response;
  const { mission, access } = playable;

  const admin = supabaseAdmin();
  if (!admin) return bad("not_configured", 503);
  const userId = auth.user.id;
  const now = new Date().toISOString();

  if (mission.kind === "skip_test") {
    if (screen !== 0 || done) return bad("skip_test_route", 400);
    if (access.progress?.result) return bad("already_taken", 409);
    const { error } = await admin
      .from("course_progress")
      .upsert(
        { user_id: userId, mission_id: mission.id, screen: 0, updated_at: now },
        { onConflict: "user_id,mission_id", ignoreDuplicates: true },
      );
    if (error) {
      console.error("course_progress insert failed:", error.message);
      return bad("store_failed", 500);
    }
    const response: ProgressResponse = { screen: 0, doneAt: null, badges: [] };
    return ok(response);
  }

  const last = mission.screens.length - 1;
  if (screen > last) return bad("bad_screen", 400);
  if (done && screen !== last) return bad("not_last_screen", 400);

  if (done) {
    const ownWork = missionInteractions(mission)
      .map((x) => x.interaction)
      .filter((i) => i.type === "I9")
      .map((i) => i.id);
    if (ownWork.length > 0) {
      let rows;
      try {
        rows = await readXpRows(supabase, userId, [mission.id]);
      } catch (e) {
        console.error((e as Error).message);
        return bad("read_failed", 500);
      }
      const recorded = new Set(rows.map((r) => r.item));
      const missing = ownWork.filter((id) => !recorded.has(id));
      if (missing.length > 0) return bad("steps_missing", 409, missing);
    }
  }

  // 1. Make sure the row exists (never overwrites one).
  const insert = await admin
    .from("course_progress")
    .upsert(
      { user_id: userId, mission_id: mission.id, screen, updated_at: now },
      { onConflict: "user_id,mission_id", ignoreDuplicates: true },
    );
  if (insert.error) {
    console.error("course_progress insert failed:", insert.error.message);
    return bad("store_failed", 500);
  }
  // 2. Move the screen forward only.
  const forward = await admin
    .from("course_progress")
    .update({ screen, updated_at: now })
    .eq("user_id", userId)
    .eq("mission_id", mission.id)
    .lt("screen", screen);
  if (forward.error) {
    console.error("course_progress update failed:", forward.error.message);
    return bad("store_failed", 500);
  }
  // 3. done_at once.
  if (done) {
    const finish = await admin
      .from("course_progress")
      .update({ done_at: now, updated_at: now })
      .eq("user_id", userId)
      .eq("mission_id", mission.id)
      .is("done_at", null);
    if (finish.error) {
      console.error("course_progress done failed:", finish.error.message);
      return bad("store_failed", 500);
    }
  }

  // 4. Badges (append-only; existing ones are left alone and not returned).
  let awarded: string[] = [];
  if (done && mission.badges && mission.badges.length > 0) {
    const { data, error } = await admin
      .from("course_badge")
      .upsert(
        mission.badges.map((b) => ({ user_id: userId, badge_id: b.id, mission_id: mission.id })),
        { onConflict: "user_id,badge_id", ignoreDuplicates: true },
      )
      .select("badge_id");
    if (error) {
      console.error("course_badge insert failed:", error.message);
      return bad("store_failed", 500);
    }
    awarded = ((data ?? []) as { badge_id: string }[]).map((r) => r.badge_id);
  }

  const { data: row, error: readError } = await admin
    .from("course_progress")
    .select("screen, done_at")
    .eq("user_id", userId)
    .eq("mission_id", mission.id)
    .maybeSingle();
  if (readError || !row) {
    console.error("course_progress read failed:", readError?.message ?? "no row");
    return bad("read_failed", 500);
  }
  const stored = row as { screen: number; done_at: string | null };
  const response: ProgressResponse = { screen: stored.screen, doneAt: stored.done_at, badges: awarded };
  return ok(response);
}
