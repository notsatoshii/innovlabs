// POST /api/artifacts/baseline: lock the capstone baseline (SP-W3-BL;
// phase-2c C4, C5, C9). Body { draft } (a BaselineDraft).
//
// Order of checks, nothing the client claims is trusted:
//   1. Signed in with a profile (requireLearner).
//   2. D5: Week 3 is open for this learner (weekOpenForUser with the service
//      role, the same cohort rule as the pages). closed → 403 week_closed,
//      not enrolled → 403, read failure → 503 (fail closed).
//   3. The draft is normalised and judged with the same checkBaseline the
//      form runs, against the learner's OWN "before" entries read here
//      (dry runs and other methods excluded by beforeEntriesFrom).
//   4. Minutes come from the cited entry (toBaselinePayload), never the client.
//   5. Evidence, when given, must be in the learner's own evidence folder AND
//      cited by one of their own time log entries.
//   6. Source ids (Work Map, blueprint) are kept only when they are the
//      learner's own events of that type; anything else becomes null.
// Then lock_baseline() appends the baseline_locked event and replaces
// user_profile.baseline in one transaction under a row lock. After a
// countersign it writes nothing and answers "frozen" (D3) → 409.

import { requireLearner, ok, bad } from "@/lib/auth/guards";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { formatMonthDay, weekOpenForUser } from "@/lib/courses/queries";
import { EVENT_TYPES } from "@/lib/profile/events";
import type { BaselineSnapshot } from "@/lib/profile/types";
import { isOwnEvidencePath } from "@/components/lab/rules";
import {
  beforeEntriesFrom,
  checkBaseline,
  parseBaselineDraft,
  toBaselinePayload,
} from "@/components/lab/rules-week3";
import { readJsonObject } from "../_lib/body";

/** A baseline draft at every limit is a few KB; anything far larger is not one. */
const MAX_BODY_BYTES = 32 * 1024;
/** Time log entries read for the check. Far above a 12-week course's real count. */
const ENTRY_LIMIT = 1000;

const NOT_ENROLLED_LINE = "수강 코드를 등록하면 확정할 수 있어요.";

interface LockResult {
  status: "ok" | "frozen" | "no_profile";
  event_id?: number;
  locked_at?: string;
}

export async function POST(req: Request) {
  const auth = await requireLearner();
  if ("response" in auth) return auth.response;
  const userId = auth.user.id;

  const read = await readJsonObject(req, MAX_BODY_BYTES);
  if ("response" in read) return read.response;
  const draft = parseBaselineDraft(read.body.draft);
  if (!draft) return bad("bad_request", 400);

  const admin = supabaseAdmin();
  if (!admin) return bad("not_configured", 503);

  // D5: the lock is enforced server-side for Week 3 (C9).
  const gate = await weekOpenForUser(admin, userId, 3);
  if (gate.state === "error") return bad("unavailable", 503);
  if (gate.state === "not_enrolled") return bad("not_enrolled", 403, [NOT_ENROLLED_LINE]);
  if (gate.state === "closed") {
    const opens = gate.opensOn ? formatMonthDay(new Date(gate.opensOn)) : null;
    return bad("week_closed", 403, [
      opens ? `3주차 수업이 열리는 ${opens}부터 확정할 수 있어요.` : "3주차 수업이 열리면 확정할 수 있어요.",
    ]);
  }

  // The learner's own time log, every method: the "before" entries for the
  // check, and every cited evidence path for the evidence rule.
  const { data: rows, error: rowsError } = await admin
    .from("profile_event")
    .select("id, created_at, data")
    .eq("user_id", userId)
    .eq("type", EVENT_TYPES.time_log_entry)
    .order("created_at", { ascending: false })
    .limit(ENTRY_LIMIT);
  if (rowsError || !rows) {
    console.error("baseline time log read failed:", rowsError?.message ?? "no rows");
    return bad("store_failed", 500);
  }
  const timeLog = rows as { id: number; created_at: string; data: unknown }[];
  const entries = beforeEntriesFrom(timeLog);

  const { errors } = checkBaseline(draft, entries);
  if (errors.length > 0) return bad("validation", 422, errors);
  const entry = entries.find((e) => e.id === draft.time_log_event_id);
  if (!entry) return bad("validation", 422, ["기준이 될 ‘기존 방식’ 시간 기록을 하나 골라 주세요."]);

  if (draft.evidence_ref !== null) {
    const ref = draft.evidence_ref;
    const cited = timeLog.some((row) => {
      const d = row.data as { evidence_ref?: unknown } | null;
      return typeof d?.evidence_ref === "string" && d.evidence_ref === ref;
    });
    if (!isOwnEvidencePath(ref, userId) || !cited) {
      return bad("validation", 422, ["고른 완성본 화면을 찾지 못했어요. 다시 골라 주세요."]);
    }
  }

  const source = await ownSource(admin, userId, draft.source);
  if (source === null) return bad("store_failed", 500);

  const payload = toBaselinePayload(draft, entry, new Date().toISOString(), source);

  const { data, error } = await admin.rpc("lock_baseline", { p_user: userId, p_payload: payload });
  if (error) {
    // Before migration 0011 is applied the function does not exist: not the learner's fault.
    console.error("lock_baseline failed:", error.message);
    return bad("unavailable", 503);
  }
  const result = data as LockResult | null;
  if (result?.status === "frozen") {
    return bad("frozen", 409, ["강사 확인을 받은 기준선이라 바꿀 수 없어요."]);
  }
  if (result?.status === "no_profile") return bad("no_profile", 409);
  if (result?.status !== "ok" || typeof result.event_id !== "number") {
    console.error("lock_baseline unexpected result:", result?.status ?? "none");
    return bad("store_failed", 500);
  }

  const snapshot: BaselineSnapshot = { ...payload, locked_event_id: result.event_id };
  return ok({ event_id: result.event_id, locked_at: result.locked_at ?? payload.signed_at, baseline: snapshot });
}

/**
 * The draft's source with every id checked against the learner's own events
 * of the right type; an id that is not theirs becomes null. Null on a failed read.
 */
async function ownSource(
  admin: NonNullable<ReturnType<typeof supabaseAdmin>>,
  userId: string,
  source: BaselineSnapshot["source"],
): Promise<BaselineSnapshot["source"] | null> {
  const wanted: [number, string][] = [];
  if (source.work_map_event_id !== null) wanted.push([source.work_map_event_id, EVENT_TYPES.work_map_submitted]);
  if (source.blueprint_event_id !== null) wanted.push([source.blueprint_event_id, EVENT_TYPES.blueprint_submitted]);
  if (wanted.length === 0) return { ...source };

  const { data, error } = await admin
    .from("profile_event")
    .select("id, type")
    .eq("user_id", userId)
    .in(
      "id",
      wanted.map(([id]) => id),
    );
  if (error || !data) {
    console.error("baseline source read failed:", error?.message ?? "no rows");
    return null;
  }
  const found = new Set((data as { id: number; type: string }[]).map((row) => `${row.id}:${row.type}`));
  const keep = (id: number | null, type: string) => (id !== null && found.has(`${id}:${type}`) ? id : null);
  const workMap = keep(source.work_map_event_id, EVENT_TYPES.work_map_submitted);
  const blueprint = keep(source.blueprint_event_id, EVENT_TYPES.blueprint_submitted);
  return {
    work_map_event_id: workMap,
    // A rank means nothing without the event it ranks in.
    candidate_rank: workMap !== null || blueprint !== null ? source.candidate_rank : null,
    blueprint_event_id: blueprint,
  };
}
