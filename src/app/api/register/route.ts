// POST /api/register — seed the living profile at the registration gate
// (spec data model #2; review finding P1-3).
//
// The browser sends an id and the identity fields, nothing else that matters:
//   - the survey answers, path and org_code come from the immutable
//     survey_response row, read here with the service role;
//   - the employee track and depth flag come from scoring those stored
//     answers again on the server (scoreSurvey is pure), not from the
//     scoring the browser stored next to them;
//   - the sign-in method comes from the session.
// The only client input that reaches the track is the respondent's pick
// between the two tracks the server's own scoring offers.
//
// survey_response is only ever SELECTed here (rule 2: insert-only, no update
// path). The gate stays after the survey and teaser (rule 3): the row was
// inserted anonymously before this route is ever called.
//
// Fresh account: INSERT user_profile, then a `registered` event.
// Existing row:  UPDATE the four learner-editable columns only, then
//                `consent_given` and `profile_updated` events. Track, core,
//                consent record and derived columns are never rewritten.
//
// Request / response: RegisterRequest → ApiResult<RegisterData>
// (./_lib/contract.ts).

import type { User } from "@supabase/supabase-js";
import { ok, bad } from "@/lib/auth/guards";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  EVENT_TYPES,
  type ConsentGivenPayload,
  type ProfileUpdatedPayload,
  type RegisteredPayload,
} from "@/lib/profile/events";
import { COMPANY_NAME_MAX, DISPLAY_NAME_MAX, JOB_TITLE_MAX } from "@/components/profile/fields";
import { scoreSurvey } from "@/lib/survey/scoring";
import { TRACKS } from "@/lib/survey/tracks";
import type { DepthFlag, Path, TrackId } from "@/lib/survey/types";
import {
  createRateLimiter,
  isJsonRequest,
  isSameOrigin,
  readJsonBody,
} from "@/app/api/inquiry/_lib/request";
import { looksLikeHagwonAnswers, parseScoringInput } from "./_lib/answers";
import { CONSENT_VERSION, type RegisterData, type RegisterErrorCode } from "./_lib/contract";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_BODY_BYTES = 8 * 1024;
// Same ceiling as the CHECK on survey_response.answers (migration 0009); rows
// written before the constraint existed are refused here.
const MAX_ANSWERS_BYTES = 32768;

// 10 attempts per account per 10 minutes.
const perUser = createRateLimiter({ windowMs: 10 * 60 * 1000, limit: 10 });

function fail(code: RegisterErrorCode, status: number, problems?: string[]) {
  return bad(code, status, problems);
}

function methodOf(user: User): RegisteredPayload["method"] {
  const provider = user.app_metadata?.provider;
  return provider === "google" || provider === "kakao" ? provider : "email";
}

/** Optional identity field: string or null/undefined; "" becomes null. `false` = wrong type or too long. */
function optionalText(value: unknown, max: number): string | null | false {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed.length > max) return false;
  return trimmed || null;
}

interface ResponseRow {
  id: string;
  path: string;
  org_code: string | null;
  answers: unknown;
  scoring: unknown;
}

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return fail("origin_not_allowed", 403);
  if (!isJsonRequest(req)) return fail("unsupported_media_type", 415);

  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return fail("not_authenticated", 401);
  if (!perUser(user.id)) return fail("rate_limited", 429);

  const read = await readJsonBody(req, MAX_BODY_BYTES);
  if (!read.ok) return fail(read.reason, read.reason === "too_large" ? 413 : 400);
  const body = read.body;

  // --- identity fields and consent (the only values taken from the client) ---
  const displayName = typeof body.display_name === "string" ? body.display_name.trim() : "";
  if (!displayName) return fail("display_name_required", 422);
  if (displayName.length > DISPLAY_NAME_MAX) return fail("validation", 422, ["display_name"]);
  const companyName = optionalText(body.company_name, COMPANY_NAME_MAX);
  if (companyName === false) return fail("validation", 422, ["company_name"]);
  const jobTitle = optionalText(body.job_title, JOB_TITLE_MAX);
  if (jobTitle === false) return fail("validation", 422, ["job_title"]);
  if (body.privacy_consent !== true) return fail("consent_required", 422);
  if (typeof body.marketing_consent !== "boolean") return fail("validation", 422, ["marketing_consent"]);
  const marketingConsent = body.marketing_consent;

  const admin = supabaseAdmin();
  if (!admin) {
    console.error("register: SUPABASE_SECRET_KEY is not set; nobody can register");
    return fail("not_configured", 503);
  }

  // --- existing row: identity fields and the marketing toggle only ---
  const updateExisting = async (existing: { path: string; survey_response_id: string | null }) => {
    const { error: updateError } = await admin
      .from("user_profile")
      .update({
        display_name: displayName,
        company_name: companyName,
        job_title: jobTitle,
        marketing_consent: marketingConsent,
      })
      .eq("user_id", user.id);
    if (updateError) {
      console.error("register: profile update failed:", updateError.message);
      return fail("store_failed", 500);
    }
    // The row keeps its original consent_version; the fact that the person
    // ticked the current text goes on the append-only log.
    const { error: eventError } = await admin.from("profile_event").insert([
      {
        user_id: user.id,
        survey_response_id: existing.survey_response_id,
        type: EVENT_TYPES.consent_given,
        visibility: "learner",
        data: {
          version: 1,
          consent_version: CONSENT_VERSION,
          marketing_consent: marketingConsent,
        } satisfies ConsentGivenPayload,
      },
      {
        user_id: user.id,
        survey_response_id: existing.survey_response_id,
        type: EVENT_TYPES.profile_updated,
        visibility: "learner",
        data: {
          version: 1,
          fields: ["display_name", "company_name", "job_title", "marketing_consent"],
        } satisfies ProfileUpdatedPayload,
      },
    ]);
    if (eventError) console.error("register: event insert failed:", eventError.message);
    return ok<RegisterData>({ created: false, path: existing.path as Path });
  };

  const lookup = async () =>
    admin
      .from("user_profile")
      .select("path, survey_response_id")
      .eq("user_id", user.id)
      .maybeSingle();

  const { data: existing, error: lookupError } = await lookup();
  if (lookupError) {
    console.error("register: profile lookup failed:", lookupError.message);
    return fail("store_failed", 500);
  }
  if (existing) return updateExisting(existing);

  // --- fresh account: build the profile from the stored response ---
  const responseId = typeof body.survey_response_id === "string" ? body.survey_response_id : "";
  if (!UUID.test(responseId)) return fail("response_required", 422);

  const { data: rowData, error: rowError } = await admin
    .from("survey_response")
    .select("id, path, org_code, answers, scoring")
    .eq("id", responseId)
    .maybeSingle();
  if (rowError) {
    console.error("register: response lookup failed:", rowError.message);
    return fail("store_failed", 500);
  }
  if (!rowData) return fail("response_not_found", 404);
  const row = rowData as ResponseRow;

  // A response seeds one profile. (Unique index in 0009 is the backstop.)
  const { data: claimed, error: claimError } = await admin
    .from("user_profile")
    .select("user_id")
    .eq("survey_response_id", row.id)
    .limit(1);
  if (claimError) {
    console.error("register: claim lookup failed:", claimError.message);
    return fail("store_failed", 500);
  }
  if (claimed && claimed.length > 0) return fail("response_claimed", 409);

  if (!row.answers || typeof row.answers !== "object" || Array.isArray(row.answers)) {
    return fail("invalid_response", 422);
  }
  const answers = row.answers as Record<string, unknown>;
  if (new TextEncoder().encode(JSON.stringify(answers)).length > MAX_ANSWERS_BYTES) {
    return fail("invalid_response", 422);
  }

  let track: TrackId | null = null;
  let trackVia: "auto" | "user_choice" | "skip_default" | null = null;
  let depthFlag: DepthFlag | null = null;

  if (row.path === "employee") {
    const input = parseScoringInput(answers);
    if (!input) return fail("invalid_response", 422);
    const scoring = scoreSurvey(input);
    depthFlag = scoring.depthFlag;

    // The stored scoring was computed in the browser. It is not used; a
    // difference is worth a log line (ids only, no answers).
    const stored = row.scoring as { decision?: unknown; depthFlag?: unknown } | null;
    if (
      JSON.stringify(stored?.decision ?? null) !== JSON.stringify(scoring.decision) ||
      stored?.depthFlag !== scoring.depthFlag
    ) {
      console.warn(`register: stored scoring differs from the server's for response ${row.id}`);
    }

    if (scoring.decision.type === "assigned") {
      track = scoring.decision.track;
      trackVia = "auto";
    } else {
      // Close call: the respondent picked on the teaser. Only one of the two
      // offered tracks is accepted; anything else is the spec default.
      const choice = body.track_choice as { track?: unknown; via?: unknown } | null | undefined;
      const picked =
        choice && typeof choice === "object" && typeof choice.track === "string" && choice.track in TRACKS
          ? (choice.track as TrackId)
          : null;
      if (picked && choice?.via === "user_choice" && scoring.decision.topTwo.includes(picked)) {
        track = picked;
        trackVia = "user_choice";
      } else {
        track = "docs_admin";
        trackVia = "skip_default";
      }
    }
  } else if (row.path === "hagwon") {
    // 학원 path (phase-hagwon.md H5): modules instead of tracks. No track, no
    // track_via, no depth flag; the result is recomputed from core when shown.
    if (!looksLikeHagwonAnswers(answers)) return fail("invalid_response", 422);
  } else {
    // solo / student are waitlist stubs in v1 (rule 6): no profile.
    return fail("invalid_response", 422);
  }

  const { error: insertError } = await admin.from("user_profile").insert({
    user_id: user.id,
    survey_response_id: row.id,
    path: row.path,
    track,
    track_via: trackVia,
    depth_flag: depthFlag,
    core: answers,
    org_code: row.org_code,
    consented_at: new Date().toISOString(), // server clock, at the moment of registration
    consent_version: CONSENT_VERSION,
    marketing_consent: marketingConsent,
    display_name: displayName,
    company_name: companyName,
    job_title: jobTitle,
  });
  if (insertError) {
    if (insertError.code === "23505") {
      // Either this account got its row a moment ago (double submit), or the
      // response was claimed in between (unique index).
      const { data: now } = await lookup();
      if (now) return updateExisting(now);
      return fail("response_claimed", 409);
    }
    console.error("register: profile insert failed:", insertError.message);
    return fail("store_failed", 500);
  }

  const fields: RegisteredPayload["fields"] = ["display_name"];
  if (companyName) fields.push("company_name");
  if (jobTitle) fields.push("job_title");
  const { error: eventError } = await admin.from("profile_event").insert({
    user_id: user.id,
    survey_response_id: row.id,
    type: EVENT_TYPES.registered,
    visibility: "learner",
    data: { version: 1, fields, method: methodOf(user) } satisfies RegisteredPayload,
  });
  if (eventError) console.error("register: registered event failed:", eventError.message);

  return ok<RegisterData>({ created: true, path: row.path as Path });
}
