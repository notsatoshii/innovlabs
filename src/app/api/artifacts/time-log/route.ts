// POST /api/artifacts/time-log: add one time log entry (SP-W1-TL).
// Body is a TimeLogInput. Re-validates with the same checkTimeLog the form
// runs (end after start, 12 hours at most, whole interruptions) plus one
// server-only check: an evidence path must sit in the caller's own folder of
// the evidence bucket. The entry is appended as a time_log_entry event with
// the service role. Entries are never edited or removed (append-only log).

import { requireLearner, ok, bad } from "@/lib/auth/guards";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { EVENT_TYPES, type TimeLogEntryPayload } from "@/lib/profile/events";
import { checkTimeLog, parseTimeLogInput } from "@/components/lab/rules";
import { readJsonObject } from "../_lib/body";

export async function POST(req: Request) {
  const auth = await requireLearner();
  if ("response" in auth) return auth.response;

  const read = await readJsonObject(req, 8 * 1024);
  if ("response" in read) return read.response;
  const input = parseTimeLogInput(read.body);
  if (!input) return bad("bad_request", 400);

  const errors = checkTimeLog(input, auth.user.id);
  if (errors.length > 0) return bad("validation", 422, errors);

  const admin = supabaseAdmin();
  if (!admin) return bad("not_configured", 503);

  const entry: TimeLogEntryPayload = {
    version: 1,
    task: input.task,
    method: input.method,
    // Stored in one canonical form whatever offset the client sent.
    started_at: new Date(input.started_at).toISOString(),
    ended_at: new Date(input.ended_at).toISOString(),
    interruptions: input.interruptions,
    evidence_ref: input.evidence_ref,
  };

  const { error } = await admin.from("profile_event").insert({
    user_id: auth.user.id,
    type: EVENT_TYPES.time_log_entry,
    visibility: "learner",
    data: entry,
  });
  if (error) {
    console.error("time log event insert failed:", error.message);
    return bad("store_failed", 500);
  }

  return ok({ entry });
}
