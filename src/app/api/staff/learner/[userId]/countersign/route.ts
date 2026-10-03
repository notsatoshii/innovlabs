// POST /api/staff/learner/[userId]/countersign — the instructor's check of a
// learner's locked baseline (Week 3 Part 4; phase-2c C5, C9, D3, D5).
// Request: CountersignRequest { baseline_event_id } — the baseline_locked
// event the staff page displayed. Response: ApiResult<{ countersign:
// { event_id, countersigned_at, baseline_event_id, already } }>.
//
// Order: requireStaff() → ids → no self-countersign → D5 (Week 3 open in the
// learner's active cohort, fail closed) → countersign_baseline() with the
// service role. The function is the one transaction: it takes the learner's
// profile row lock, refuses a stale id (the learner locked again since the
// page loaded), returns the existing stamp on a double tap ("already") and
// writes the learner-visible baseline_countersigned event with the staff
// user id and role, never an email. After it the baseline is frozen (D3).
// A learner cannot reach this: requireStaff() answers 403, and the function
// itself can be executed by the service role only (migration 0011).

import { ok, bad, requireStaff } from "@/lib/auth/guards";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { weekOpenForUser } from "@/lib/courses/queries";
import { fmtDate, isUuid } from "@/components/staff/format";
import type { CountersignResult } from "@/components/staff/results";
import { badJson, notConfigured, readBody, serverError } from "../../../_shared";

const BASELINE_WEEK = 3;

function noSuchLearner() {
  return bad("no_such_learner", 404, ["수강생을 찾지 못했어요. 명단에서 다시 열어 주세요."]);
}

function unavailable(detail: unknown) {
  console.error("staff route countersign_unavailable:", detail);
  return bad("unavailable", 503, ["지금은 확인할 수 없어요. 잠시 후 다시 시도해 주세요."]);
}

function isEventId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const auth = await requireStaff();
  if ("response" in auth) return auth.response;

  const { userId } = await params;
  if (!isUuid(userId)) return noSuchLearner();

  const body = await readBody(req);
  if (!body) return badJson();
  if (!isEventId(body.baseline_event_id)) return badJson();
  const baselineEventId = body.baseline_event_id;

  // No self-countersign (C9). The function refuses it too ("self").
  if (auth.user.id === userId) {
    return bad("self", 403, ["본인 기준선은 직접 확인할 수 없어요. 다른 강사에게 부탁해 주세요."]);
  }

  const admin = supabaseAdmin();
  if (!admin) return notConfigured();

  // D5: Week 3 must be open in the learner's active cohort. Fail closed.
  const gate = await weekOpenForUser(admin, userId, BASELINE_WEEK);
  if (gate.state === "error") return unavailable("week gate read failed");
  if (gate.state === "not_enrolled") {
    return bad("not_enrolled", 403, ["이 수강생은 지금 수강 중인 코호트가 없어요. 등록 상태를 먼저 확인해 주세요."]);
  }
  if (gate.state === "closed") {
    return bad("week_closed", 403, [
      gate.opensOn
        ? `이 수강생의 코호트는 3주차가 아직 열리지 않았어요. ${fmtDate(gate.opensOn)}에 열려요.`
        : "이 수강생의 코호트는 3주차가 아직 열리지 않았어요. 코호트 화면에서 주차를 먼저 열어 주세요.",
    ]);
  }

  const { data, error } = await admin.rpc("countersign_baseline", {
    p_user: userId,
    p_baseline_event_id: baselineEventId,
    p_by_user: auth.user.id,
    p_by_role: auth.staffRole,
  });
  // A missing function (0011 not applied) lands here too.
  if (error) return unavailable(error.message);

  const result = (data ?? {}) as {
    status?: string;
    event_id?: number;
    countersigned_at?: string;
    baseline_event_id?: number;
  };
  switch (result.status) {
    case "ok":
    case "already": {
      if (!isEventId(result.event_id) || typeof result.countersigned_at !== "string") {
        return serverError("countersign_bad_result", result);
      }
      const payload: CountersignResult = {
        countersign: {
          event_id: result.event_id,
          countersigned_at: result.countersigned_at,
          baseline_event_id: isEventId(result.baseline_event_id) ? result.baseline_event_id : baselineEventId,
          already: result.status === "already",
        },
      };
      return ok(payload);
    }
    case "stale":
      return bad("stale", 409, ["방금 수강생이 기준선을 다시 확정했어요. 새로고침해 주세요."]);
    case "no_baseline":
      return bad("no_baseline", 409, ["이 수강생은 아직 기준선을 확정하지 않았어요. 새로고침해 주세요."]);
    case "self":
      return bad("self", 403, ["본인 기준선은 직접 확인할 수 없어요. 다른 강사에게 부탁해 주세요."]);
    case "no_profile":
      return noSuchLearner();
    default:
      return serverError("countersign_bad_result", result);
  }
}
