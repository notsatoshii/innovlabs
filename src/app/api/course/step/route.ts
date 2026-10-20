// POST /api/course/step: a step that is not answer-checked (StepRequest ->
// StepResponse; I8, I9, I10, I11, terms). Pays the step's xp once (item =
// interaction id) and always records it, so the progress route can tell that
// the own-work steps of a mission were done.
//
// What is verified before paying, from data the learner cannot fake here:
//   I9 seed_rows             the work_map draft has >= 2 rows with a task
//   I9 work_map_rows         >= 12 rows with a task and hours > 0
//   I9 work_map_extra_row    >= 13 rows with a task
//   I9 work_map_classify     >= 1 row and none left unmarked or M (mixed rows split)
//   I9 work_map_candidates   a work_map_submitted event since the mission opened
//   I9 drill_*               a drill_completed event since the mission opened
//   I8 (when it pays)        a time_log_entry of that method with evidence since the mission opened
// "Since the mission opened" = after the latest done_at of the missions it
// requires (no bound for a mission that requires nothing). The draft and the
// events are written by the existing lab routes (O1-D5), so the UI calls
// those first and this route after.
// I10, I11 and terms pay on request: they are honest-practice steps (an I11
// paste stays in the browser and is never sent here, like the drill route).

import { requireLearner, ok, bad } from "@/lib/auth/guards";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { parseWorkMapDraft } from "@/components/lab/rules";
import { EVENT_TYPES } from "@/lib/profile/events";
import { STEP_TYPES, locateInteraction, stepAward } from "@/lib/course/score";
import { readXpRows } from "@/lib/course/state";
import type { Interaction, StepResponse } from "@/lib/course/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkMapDraft } from "@/lib/courses/types";
import { isUniqueViolation, loadPlayable, localIdField, missionIdField, missionXp, readCourseBody } from "../_lib/request";

const MIN_ROWS = { seed_rows: 2, work_map_rows: 12, work_map_extra_row: 13 } as const;

async function readDraft(client: SupabaseClient, userId: string): Promise<WorkMapDraft | null> {
  const { data, error } = await client
    .from("artifact_draft")
    .select("data")
    .eq("user_id", userId)
    .eq("kind", "work_map")
    .maybeSingle();
  if (error) throw new Error(`work_map draft read failed: ${error.message}`);
  return data ? parseWorkMapDraft((data as { data: unknown }).data) : null;
}

async function hasEventSince(
  admin: SupabaseClient,
  userId: string,
  type: string,
  since: string | null,
): Promise<boolean> {
  let q = admin.from("profile_event").select("id").eq("user_id", userId).eq("type", type);
  if (since) q = q.gte("created_at", since);
  const { data, error } = await q.limit(1);
  if (error) throw new Error(`profile_event read failed: ${error.message}`);
  return (data ?? []).length > 0;
}

async function hasTimeLogSince(admin: SupabaseClient, userId: string, method: string, since: string | null): Promise<boolean> {
  let q = admin
    .from("profile_event")
    .select("id")
    .eq("user_id", userId)
    .eq("type", EVENT_TYPES.time_log_entry)
    .eq("data->>method", method)
    .not("data->>evidence_ref", "is", null);
  if (since) q = q.gte("created_at", since);
  const { data, error } = await q.limit(1);
  if (error) throw new Error(`profile_event read failed: ${error.message}`);
  return (data ?? []).length > 0;
}

/** Null when verified, else the reason code (returned in `problems`). */
async function verify(
  it: Interaction,
  ctx: { client: SupabaseClient; admin: SupabaseClient; userId: string; since: string | null },
): Promise<string | null> {
  if (it.type === "I9") {
    switch (it.target) {
      case "seed_rows":
      case "work_map_rows":
      case "work_map_extra_row": {
        const draft = await readDraft(ctx.client, ctx.userId);
        const rows = (draft?.rows ?? []).filter(
          (r) => r.task.trim().length > 0 && (it.target !== "work_map_rows" || r.hours > 0),
        );
        return rows.length >= MIN_ROWS[it.target] ? null : `${it.target}_too_few`;
      }
      case "work_map_classify": {
        const draft = await readDraft(ctx.client, ctx.userId);
        const rows = draft?.rows ?? [];
        if (rows.length === 0) return "work_map_classify_empty";
        return rows.every((r) => r.kind === "P" || r.kind === "T") ? null : "work_map_classify_unmarked";
      }
      case "work_map_candidates":
        return (await hasEventSince(ctx.admin, ctx.userId, EVENT_TYPES.work_map_submitted, ctx.since))
          ? null
          : "work_map_not_submitted";
      case "drill_left_for_human":
      case "drill_invention":
        return (await hasEventSince(ctx.admin, ctx.userId, EVENT_TYPES.drill_completed, ctx.since))
          ? null
          : "drill_not_submitted";
    }
  }
  if (it.type === "I8" && it.xp) {
    return (await hasTimeLogSince(ctx.admin, ctx.userId, it.method, ctx.since)) ? null : "time_log_missing";
  }
  return null;
}

export async function POST(req: Request) {
  const auth = await requireLearner();
  if ("response" in auth) return auth.response;

  const read = await readCourseBody(req);
  if ("response" in read) return read.response;
  const missionId = missionIdField(read.body.missionId);
  const interactionId = localIdField(read.body.interactionId);
  if (!missionId || !interactionId) return bad("bad_request", 400);

  const supabase = await supabaseServer();
  const playable = await loadPlayable(supabase, auth.user.id, missionId);
  if ("response" in playable) return playable.response;
  const { mission, access } = playable;

  const located = locateInteraction(mission, interactionId);
  if (!located) return bad("unknown_interaction", 404);
  if (!STEP_TYPES.has(located.interaction.type)) return bad("not_step", 400);

  const admin = supabaseAdmin();
  if (!admin) return bad("not_configured", 503);

  let prior;
  try {
    prior = await readXpRows(supabase, auth.user.id, [mission.id]);
  } catch (e) {
    console.error((e as Error).message);
    return bad("read_failed", 500);
  }
  const award = stepAward(located.interaction, located.screen.beat, prior);
  if (!award) return bad("not_step", 400);

  let amount = 0;
  if (award.insert) {
    let problem: string | null;
    try {
      problem = await verify(located.interaction, {
        client: supabase,
        admin,
        userId: auth.user.id,
        since: access.openedAt,
      });
    } catch (e) {
      console.error((e as Error).message);
      return bad("read_failed", 500);
    }
    if (problem) return bad("not_verified", 422, [problem]);

    const { error } = await admin.from("course_xp").insert({
      user_id: auth.user.id,
      mission_id: mission.id,
      part: award.part,
      item: award.item,
      amount: award.amount,
      correct: null,
    });
    if (error && !isUniqueViolation(error)) {
      console.error("course_xp insert failed:", error.message);
      return bad("store_failed", 500);
    }
    amount = error ? 0 : award.amount;
  }

  let total: number;
  try {
    total = await missionXp(supabase, auth.user.id, mission);
  } catch (e) {
    console.error((e as Error).message);
    return bad("read_failed", 500);
  }
  const response: StepResponse = { amount, missionXp: total };
  return ok(response);
}
