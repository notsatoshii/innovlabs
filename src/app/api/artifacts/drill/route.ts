// POST /api/artifacts/drill: submit the Week 1 basics drill sheet (SP-W1-BAS).
// Body { draft }. Re-validates with the same checkDrill the form runs, then
// appends a drill_completed event. The two assistant outputs never reach the
// platform; only the learner's notes about them do.
//
// The event is written with the service role when it is configured and with
// the caller's own client otherwise: the insert policy (0005) lets a learner
// append their own learner-visibility events, and this route touches no
// derived column, so it does not need to refuse when the key is missing.

import { requireLearner, ok, bad } from "@/lib/auth/guards";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { EVENT_TYPES } from "@/lib/profile/events";
import { checkDrill, parseDrillDraft, writtenDifferences } from "@/components/lab/rules";
import { readJsonObject } from "../_lib/body";

export async function POST(req: Request) {
  const auth = await requireLearner();
  if ("response" in auth) return auth.response;

  const read = await readJsonObject(req);
  if ("response" in read) return read.response;
  const draft = parseDrillDraft(read.body.draft);
  if (!draft) return bad("bad_request", 400);

  const errors = checkDrill(draft);
  if (errors.length > 0) return bad("validation", 422, errors);

  const differences = writtenDifferences(draft);
  const payload = {
    version: 1 as const,
    task: draft.task.trim(),
    differences_count: differences.length,
    differences,
    invention_found: draft.invention.trim(),
    whats_left_for_human: draft.leftForHuman.trim(),
  };

  // Service role only, like the other artifact routes: once learners lose the
  // right to insert lab event types directly, a client fallback would fail.
  const db = supabaseAdmin();
  if (!db) return bad("not_configured", 503);
  const { error } = await db.from("profile_event").insert({
    user_id: auth.user.id,
    type: EVENT_TYPES.drill_completed,
    visibility: "learner",
    data: payload,
  });
  if (error) {
    console.error("drill event insert failed:", error.message);
    return bad("store_failed", 500);
  }

  return ok({ drill: payload });
}
