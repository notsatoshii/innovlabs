// POST /api/artifacts/workspace: the Week 3 Part 1 workspace check
// (SP-W3-CP; phase-2c C6). Body is a WorkspaceInput. The input is normalised
// and judged again with the same checkWorkspace the form runs. A failed test
// is allowed (it is a warning, and the form shows the fix): the check records
// what happened, and the learner resubmits after fixing it. Each submit is a
// new workspace_setup event written with the service role (learners cannot
// insert lab events, migration 0009); nothing earlier is edited.
//
// user_profile.learning is then MERGED with mergeLearning, so blocked_tools
// and the reserved student fields survive (plan review 2). The event is the
// record; the snapshot can be rebuilt from the newest event if the second
// write fails.

import { requireLearner, ok, bad } from "@/lib/auth/guards";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { EVENT_TYPES } from "@/lib/profile/events";
import type { LearningSnapshot } from "@/lib/profile/types";
import {
  checkWorkspace,
  mergeLearning,
  parseWorkspaceInput,
  toWorkspacePayload,
} from "@/components/lab/rules-week3";
import { readJsonObject } from "../_lib/body";

export async function POST(req: Request) {
  const auth = await requireLearner();
  if ("response" in auth) return auth.response;

  const read = await readJsonObject(req, 8 * 1024);
  if ("response" in read) return read.response;
  const input = parseWorkspaceInput(read.body);
  if (!input) return bad("bad_request", 400);

  const { errors } = checkWorkspace(input);
  if (errors.length > 0) return bad("validation", 422, errors);

  const admin = supabaseAdmin();
  if (!admin) return bad("not_configured", 503);

  const payload = toWorkspacePayload(input);

  const { error: eventError } = await admin.from("profile_event").insert({
    user_id: auth.user.id,
    type: EVENT_TYPES.workspace_setup,
    visibility: "learner",
    data: payload,
  });
  if (eventError) {
    console.error("workspace event insert failed:", eventError.message);
    return bad("store_failed", 500);
  }

  // Read the stored object here, not from the session: another tab may have
  // written it since this request's session was read.
  const { data: row, error: readError } = await admin
    .from("user_profile")
    .select("learning")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (readError) {
    console.error("workspace learning read failed:", readError.message);
    return bad("store_failed", 500);
  }
  const existing = (row?.learning ?? null) as LearningSnapshot | null;
  const learning = mergeLearning(existing, payload);

  const { error: profileError } = await admin
    .from("user_profile")
    .update({ learning })
    .eq("user_id", auth.user.id);
  if (profileError) {
    console.error("workspace learning update failed:", profileError.message);
    return bad("store_failed", 500);
  }

  return ok({ workspace: payload, ready: learning.workspace_ready === true });
}
