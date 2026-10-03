// POST /api/artifacts/time-log: add one time log entry (SP-W1-TL).
// Body is a TimeLogInput. Re-validates with the same checkTimeLog the form
// runs (end after start, 12 hours at most, whole interruptions) plus one
// server-only check: an evidence path must sit in the caller's own folder of
// the evidence bucket. The entry is appended as a time_log_entry event with
// the service role. Entries are never edited or removed (append-only log).
//
// Week 3 dry run (phase-2c C1): the body may carry dry_run { blueprint_event_id,
// checkpoint_id }. Only with method "pipeline" (checkTimeLog), only for one
// of the caller's own blueprint_submitted events, and only naming a checkpoint
// that blueprint has. Anything else is refused, never stored as a plain entry.

import { requireLearner, ok, bad } from "@/lib/auth/guards";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { EVENT_TYPES, type TimeLogEntryPayload } from "@/lib/profile/events";
import { checkTimeLog, parseTimeLogInput } from "@/components/lab/rules";
import { blueprintFromSaved } from "@/components/lab/rules-week3";
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

  if (input.dry_run) {
    const { data: row, error: blueprintError } = await admin
      .from("profile_event")
      .select("data")
      .eq("id", input.dry_run.blueprint_event_id)
      .eq("user_id", auth.user.id)
      .eq("type", EVENT_TYPES.blueprint_submitted)
      .maybeSingle();
    if (blueprintError) {
      console.error("time log dry-run blueprint read failed:", blueprintError.message);
      return bad("store_failed", 500);
    }
    const blueprint = row ? blueprintFromSaved(row.data) : null;
    const checkpointId = input.dry_run.checkpoint_id;
    if (!blueprint || !blueprint.checkpoints.some((c) => c.id === checkpointId)) {
      return bad("validation", 422, ["시험 실행한 설계도를 찾지 못했어요. 설계도 화면에서 다시 시작해 주세요."]);
    }
  }

  const entry: TimeLogEntryPayload = {
    version: 1,
    task: input.task,
    method: input.method,
    // Stored in one canonical form whatever offset the client sent.
    started_at: new Date(input.started_at).toISOString(),
    ended_at: new Date(input.ended_at).toISOString(),
    interruptions: input.interruptions,
    evidence_ref: input.evidence_ref,
    ...(input.dry_run ? { dry_run: input.dry_run } : {}),
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
