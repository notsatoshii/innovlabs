// POST /api/course/local: keep what a mission holds between its screens in
// the learner's own row (LocalSaveRequest -> { updatedAt }; migration 0013).
//
// What is kept, and nothing else: the assistant outputs pasted in an I11
// round (B1), the picks of I7s without a right answer (B1's account and
// material choice, M1.5's gut pick), and the slip flag of an ordered
// checklist. checkLocalPatch() checks every key against the stored mission;
// anything else is refused whole (422 with the refused keys). Each field
// sent replaces the stored one key by key; "" removes a round.
//
// The row is readable by its owner only (no staff policy) and written here
// with the service role after requireLearner(). A locked mission and a skip
// test are refused. Pays no XP: the I11 step route records the round.

import { requireLearner, ok, bad } from "@/lib/auth/guards";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { checkLocalPatch, mergeLocal } from "@/lib/course/local";
import type { CourseLocalRow } from "@/lib/course/types";
import { readJsonObject } from "@/app/api/artifacts/_lib/body";
import { loadPlayable, missionIdField } from "../_lib/request";

/** Two rounds of 20,000 characters in UTF-8 Korean, plus the ids. */
const LOCAL_BODY_BYTES = 160 * 1024;

export async function POST(req: Request) {
  const auth = await requireLearner();
  if ("response" in auth) return auth.response;

  const read = await readJsonObject(req, LOCAL_BODY_BYTES);
  if ("response" in read) return read.response;
  const missionId = missionIdField(read.body.missionId);
  if (!missionId) return bad("bad_request", 400);

  const supabase = await supabaseServer();
  const playable = await loadPlayable(supabase, auth.user.id, missionId);
  if ("response" in playable) return playable.response;

  const checked = checkLocalPatch(playable.mission, read.body);
  if (!checked.ok) return bad("validation", 422, checked.problems);

  const admin = supabaseAdmin();
  if (!admin) return bad("not_configured", 503);

  const { data: row, error: readError } = await admin
    .from("course_local")
    .select("rounds, choices, slip")
    .eq("user_id", auth.user.id)
    .eq("mission_id", missionId)
    .maybeSingle();
  if (readError) {
    console.error("course_local read failed:", readError.message);
    return bad("read_failed", 500);
  }

  const merged = mergeLocal((row as Pick<CourseLocalRow, "rounds" | "choices" | "slip"> | null) ?? null, checked.patch);
  const updatedAt = new Date().toISOString();
  const { error } = await admin
    .from("course_local")
    .upsert({ user_id: auth.user.id, mission_id: missionId, ...merged, updated_at: updatedAt }, { onConflict: "user_id,mission_id" });
  if (error) {
    console.error("course_local upsert failed:", error.message);
    return bad("store_failed", 500);
  }
  return ok({ updatedAt });
}
