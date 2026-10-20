// POST /api/course/answer: one scored item (AnswerRequest -> AnswerResponse,
// src/lib/course/types.ts; phase-online.md O1-D4).
//
// The server finds the interaction in the stored mission, re-checks the
// answer against the content, and computes the amount from the learner's
// prior rows (combo, retry, hint) with score.ts. The client never sends a
// number that is paid. The row is written with the service role; the unique
// index (user, mission, item) makes a replay pay 0 instead of failing.
// A locked mission is refused (409 mission_locked).
// An item with `evidence` (M1.5 확인) pays only when that record exists since
// the mission opened (422 not_verified otherwise, nothing written): XP on
// evidence, never on the tap alone (L1 review 2026-10-21).

import { requireLearner, ok, bad } from "@/lib/auth/guards";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { EVENT_TYPES } from "@/lib/profile/events";
import { ANSWER_TYPES, evidenceOf, locateInteraction, scoreAnswer } from "@/lib/course/score";
import { readXpRows } from "@/lib/course/state";
import type { AnswerResponse } from "@/lib/course/types";
import { isUniqueViolation, loadPlayable, localIdField, missionIdField, missionXp, readCourseBody } from "../_lib/request";

function answerField(value: unknown): AnswerRequestAnswer | undefined {
  if (typeof value === "string") return value.length <= 2000 ? value : undefined;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (Array.isArray(value) && value.length >= 1 && value.length <= 8 && value.every((v) => typeof v === "string" && v.length <= 40)) {
    return value as string[];
  }
  return undefined;
}
type AnswerRequestAnswer = string | string[] | number;

export async function POST(req: Request) {
  const auth = await requireLearner();
  if ("response" in auth) return auth.response;

  const read = await readCourseBody(req);
  if ("response" in read) return read.response;
  const missionId = missionIdField(read.body.missionId);
  const interactionId = localIdField(read.body.interactionId);
  const rawKey = read.body.itemKey;
  const itemKey = rawKey === undefined || rawKey === null ? undefined : typeof rawKey === "string" && rawKey.length <= 30 ? rawKey : null;
  const answer = answerField(read.body.answer);
  if (!missionId || !interactionId || itemKey === null || answer === undefined) return bad("bad_request", 400);

  const supabase = await supabaseServer();
  const playable = await loadPlayable(supabase, auth.user.id, missionId);
  if ("response" in playable) return playable.response;
  const { mission, access } = playable;

  const located = locateInteraction(mission, interactionId);
  if (!located) return bad("unknown_interaction", 404);
  if (!ANSWER_TYPES.has(located.interaction.type)) return bad("not_answer_item", 400);

  const admin = supabaseAdmin();
  if (!admin) return bad("not_configured", 503);

  let prior;
  try {
    prior = await readXpRows(supabase, auth.user.id, [mission.id]);
  } catch (e) {
    console.error((e as Error).message);
    return bad("read_failed", 500);
  }

  const scored = scoreAnswer({
    mission,
    interaction: located.interaction,
    beat: located.screen.beat,
    itemKey: itemKey || undefined,
    answer,
    prior,
  });
  if (!scored.ok) return bad(scored.error, scored.error === "retry_not_allowed" ? 409 : 400);
  const award = scored.award;

  const evidence = evidenceOf(located.interaction);
  if (award.insert && evidence) {
    let q = admin.from("profile_event").select("id").eq("user_id", auth.user.id).eq("type", EVENT_TYPES[evidence]);
    if (access.openedAt) q = q.gte("created_at", access.openedAt);
    const { data, error } = await q.limit(1);
    if (error) {
      console.error("profile_event read failed:", error.message);
      return bad("read_failed", 500);
    }
    if ((data ?? []).length === 0) return bad("not_verified", 422, ["work_map_not_submitted"]);
  }

  let amount = award.insert ? award.amount : 0;
  if (award.insert) {
    const { error } = await admin.from("course_xp").insert({
      user_id: auth.user.id,
      mission_id: mission.id,
      part: award.part,
      item: award.item,
      amount: award.amount,
      correct: award.correct,
    });
    if (error) {
      if (!isUniqueViolation(error)) {
        console.error("course_xp insert failed:", error.message);
        return bad("store_failed", 500);
      }
      amount = 0; // a concurrent request paid this item first
    }
  }

  let total: number;
  try {
    total = await missionXp(supabase, auth.user.id, mission);
  } catch (e) {
    console.error((e as Error).message);
    return bad("read_failed", 500);
  }

  const response: AnswerResponse = {
    correct: award.correct,
    amount,
    ...(award.combo ? { combo: award.combo } : {}),
    ...(award.retry ? { retry: true } : {}),
    missionXp: total,
  };
  return ok(response);
}
