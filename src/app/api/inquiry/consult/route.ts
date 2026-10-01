// POST /api/inquiry/consult — the 학원 path's 30분 진단 상담 request
// (phase-hagwon.md H6), moved off the browser: migration 0009 removes the
// public insert policy on `inquiry`, so the CTA posts here instead.
//
// Request:  { contact?: string }   only when the account has no email
// Response: ApiResult<{ requested: true; already: boolean }>
//
// Everything else is taken from the session: the name, 학원명 and 직함 from
// the profile, the module list and hours recomputed from the stored answers
// (profile.core), the same way 나의 AI 교육 shows them. One request per
// account: a second call answers ok without writing. Both rows (the inquiry
// and the consult_requested event) are written with the service role after
// requireLearner().

import { requireLearner, ok, bad } from "@/lib/auth/guards";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { EVENT_TYPES, type ConsultRequestedPayload } from "@/lib/profile/events";
import type { HagwonAnswers, HagwonResult } from "@/lib/hagwon/types";
import { scoreHagwon } from "@/lib/hagwon/scoring";
import { MODULES } from "@/lib/hagwon/modules";
import { createRateLimiter, isJsonRequest, isSameOrigin, readJsonBody } from "../_lib/request";

const MESSAGE_MAX = 4000; // CHECK on public.inquiry (migration 0009)
const CONTACT_MIN = 5;
const CONTACT_MAX = 80;
const RESPONDENT_ROLE = { director: "원장", manager: "실장·부원장", staff: "직원" } as const;

// 3 attempts per account per 10 minutes (the dedupe below makes more pointless).
const perUser = createRateLimiter({ windowMs: 10 * 60 * 1000, limit: 3 });

/** Same minimal shape check as HagwonEducation before scoring. */
function isHagwonAnswers(core: unknown): core is HagwonAnswers {
  if (!core || typeof core !== "object") return false;
  const a = core as Record<string, unknown>;
  const q4 = a.q4;
  if (!Array.isArray(q4) || q4.length !== 3 || !q4.every((v) => typeof v === "string")) return false;
  if (!Array.isArray(a.q1) || typeof a.q0 !== "string") return false;
  return ["q2_teachers", "q5a", "q6a", "q7a", "q8a"].every((key) => typeof a[key] === "number");
}

/** One line the team reads in the inquiry table: modules, hours, Q12. */
function summary(result: HagwonResult): string {
  const modules = result.recommended.map((id) => `${id} ${MODULES[id].name}`).join(", ") || "없음";
  const hours = `주 ${result.hours.low}–${result.hours.high}시간`;
  const goal = result.successGoal ?? "없음";
  return `[학원 진단] 추천 모듈: ${modules}; ${hours}; 목표: ${goal}`.slice(0, MESSAGE_MAX);
}

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return bad("origin_not_allowed", 403);
  if (!isJsonRequest(req)) return bad("unsupported_media_type", 415);

  const auth = await requireLearner();
  if ("response" in auth) return auth.response;
  const { user, profile } = auth;

  if (profile.path !== "hagwon") return bad("wrong_path", 409);
  if (!perUser(user.id)) return bad("rate_limited", 429);

  const read = await readJsonBody(req, 2 * 1024);
  if (!read.ok) return bad(read.reason, read.reason === "too_large" ? 413 : 400);

  const admin = supabaseAdmin();
  if (!admin) {
    console.error("inquiry/consult: SUPABASE_SECRET_KEY is not set");
    return bad("not_configured", 503);
  }

  // One request per account: the event log is the source of truth.
  const { count, error: countError } = await admin
    .from("profile_event")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("type", EVENT_TYPES.consult_requested);
  if (countError) {
    console.error("inquiry/consult: event lookup failed:", countError.message);
    return bad("store_failed", 500);
  }
  if ((count ?? 0) > 0) return ok({ requested: true as const, already: true });

  if (!isHagwonAnswers(profile.core)) return bad("no_result", 422);
  let result: HagwonResult;
  try {
    result = scoreHagwon(profile.core);
  } catch {
    return bad("no_result", 422);
  }
  const respondent = profile.core.q0 in RESPONDENT_ROLE ? profile.core.q0 : "director";

  // Contact address: the account email, or what the 원장 typed when the
  // account has none (a Kakao account without the email scope).
  const accountEmail = user.email?.trim() ?? "";
  let contact = accountEmail;
  if (!contact) {
    const typed = typeof read.body.contact === "string" ? read.body.contact.trim() : "";
    if (typed.length < CONTACT_MIN || typed.length > CONTACT_MAX) return bad("contact_required", 422);
    contact = typed;
  }

  const { error: inquiryError } = await admin.from("inquiry").insert({
    name: profile.display_name?.trim() || "원장",
    company: profile.company_name?.trim() || "미입력",
    role: profile.job_title?.trim() || RESPONDENT_ROLE[respondent],
    email: contact,
    interest: "training",
    team_size: null,
    message: summary(result),
    locale: "ko",
    source: "app-hagwon",
    user_agent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
  });
  if (inquiryError) {
    console.error("inquiry/consult: inquiry insert failed:", inquiryError.message);
    return bad("store_failed", 500);
  }

  const payload: ConsultRequestedPayload = {
    version: 1,
    path: "hagwon",
    modules: result.recommended,
    hours: [result.hours.low, result.hours.high],
  };
  const { error: eventError } = await admin.from("profile_event").insert({
    user_id: user.id,
    survey_response_id: profile.survey_response_id,
    type: EVENT_TYPES.consult_requested,
    visibility: "learner",
    data: payload,
  });
  // The inquiry row is the lead and it is stored; a missing event only means
  // the button could be offered once more.
  if (eventError) console.error("inquiry/consult: event insert failed:", eventError.message);

  return ok({ requested: true as const, already: false });
}
