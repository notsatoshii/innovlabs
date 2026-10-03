// POST /api/artifacts/blueprint: submit the Week 3 pipeline blueprint
// (SP-W3-BP, phase-2c C3). Body { draft } (a BlueprintSubmitRequest). The
// draft is normalised with parseBlueprintDraft and judged again with the same
// checkBlueprint the editor runs, against the caller's own saved harness ids,
// so nothing the client claims is trusted.
//
// Ownership checks done here, never on the client:
// - a stage's harness_id must be one of the caller's own harness_saved ids
//   (checkBlueprint with that set);
// - source.work_map_event_id must be one of the caller's own
//   work_map_submitted events, and source.candidate_rank a rank that event has.
//
// Each submit appends a new blueprint_submitted event with the service role
// (learners cannot insert lab events, migration 0009); the newest one is the
// current blueprint. Nothing is updated or deleted. A submit identical to the
// newest blueprint (a retry after a lost response) writes nothing and answers
// with that event, so a dry run never has two copies to choose between.
// No week gate here: Week 3 labs other than the baseline keep 2a's soft lock (D5).

import { requireLearner, ok, bad } from "@/lib/auth/guards";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { EVENT_TYPES, type BlueprintSubmittedPayload } from "@/lib/profile/events";
import { blueprintFromSaved, checkBlueprint, parseBlueprintDraft, toBlueprintPayload } from "@/components/lab/rules-week3";
import { readJsonObject } from "../_lib/body";

/** A draft at every BLUEPRINT_LIMITS cap is about 60 KB of UTF-8; anything larger is not a blueprint. */
const MAX_BODY_BYTES = 96 * 1024;

const SOURCE_MISMATCH = "워크맵 후보를 찾지 못했어요. 설계도 위쪽에서 후보를 다시 골라 주세요.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(req: Request) {
  const auth = await requireLearner();
  if ("response" in auth) return auth.response;

  const read = await readJsonObject(req, MAX_BODY_BYTES);
  if ("response" in read) return read.response;
  const draft = parseBlueprintDraft(read.body.draft);
  if (!draft) return bad("bad_request", 400);

  const admin = supabaseAdmin();
  if (!admin) return bad("not_configured", 503);
  const userId = auth.user.id;

  // The caller's own harness ids, read only when a stage links one. Reads the
  // id out of each payload, not the harness text.
  let harnessIds: Set<string> | undefined;
  if (draft.stages.some((s) => s.harness_id)) {
    const { data, error } = await admin
      .from("profile_event")
      .select("harness_id:data->>harness_id")
      .eq("user_id", userId)
      .eq("type", EVENT_TYPES.harness_saved)
      .limit(5000);
    if (error || !data) {
      console.error("blueprint harness id read failed:", error?.message ?? "no rows");
      return bad("store_failed", 500);
    }
    harnessIds = new Set(
      (data as unknown as { harness_id: string | null }[]).flatMap((row) => (row.harness_id ? [row.harness_id] : [])),
    );
  }

  const { errors } = checkBlueprint(draft, harnessIds);
  if (errors.length > 0) return bad("validation", 422, errors);

  // Source: the caller's own Work Map event and a rank it actually has.
  let source: BlueprintSubmittedPayload["source"] = { work_map_event_id: null, candidate_rank: null };
  if (draft.source.work_map_event_id !== null) {
    const { data: row, error } = await admin
      .from("profile_event")
      .select("data")
      .eq("id", draft.source.work_map_event_id)
      .eq("user_id", userId)
      .eq("type", EVENT_TYPES.work_map_submitted)
      .maybeSingle();
    if (error) {
      console.error("blueprint work map read failed:", error.message);
      return bad("store_failed", 500);
    }
    if (!row) return bad("validation", 422, [SOURCE_MISMATCH]);
    const rank = draft.source.candidate_rank;
    const candidates = isRecord(row.data) && Array.isArray(row.data.candidates) ? row.data.candidates : [];
    if (rank !== null && !candidates.some((c) => isRecord(c) && c.rank === rank)) {
      return bad("validation", 422, [SOURCE_MISMATCH]);
    }
    source = { work_map_event_id: draft.source.work_map_event_id, candidate_rank: rank };
  }

  const payload = toBlueprintPayload(draft, source);

  // Same as the newest blueprint: answer with it instead of writing a copy.
  const { data: newest, error: newestError } = await admin
    .from("profile_event")
    .select("id, created_at, data")
    .eq("user_id", userId)
    .eq("type", EVENT_TYPES.blueprint_submitted)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1);
  if (newestError || !newest) {
    console.error("blueprint newest read failed:", newestError?.message ?? "no rows");
    return bad("store_failed", 500);
  }
  if (newest.length > 0) {
    const previous = blueprintFromSaved(newest[0].data);
    if (previous && JSON.stringify(previous) === JSON.stringify(payload)) {
      return ok({ event_id: newest[0].id as number, created_at: newest[0].created_at as string, blueprint: previous });
    }
  }

  const { data: inserted, error: insertError } = await admin
    .from("profile_event")
    .insert({
      user_id: userId,
      type: EVENT_TYPES.blueprint_submitted,
      visibility: "learner",
      data: payload,
    })
    .select("id, created_at")
    .single();
  if (insertError || !inserted) {
    console.error("blueprint event insert failed:", insertError?.message ?? "no row");
    return bad("store_failed", 500);
  }

  return ok({ event_id: inserted.id as number, created_at: inserted.created_at as string, blueprint: payload });
}
