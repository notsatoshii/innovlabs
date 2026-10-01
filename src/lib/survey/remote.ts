// Supabase persistence for the funnel (Phase 2). sessionStorage remains the
// in-flow source of truth; these helpers mirror it to the database.
//
// What the browser still writes directly (anon / authenticated key, RLS):
//   survey_response  insert only, before the gate (rules 2 and 3)
//   profile_event    the client-written types only (allowlist in migration 0009)
//   waitlist         the stub paths
//   user_profile     UPDATE of the four identity columns (updateProfileFields)
// The profile row itself is written by POST /api/register (seedProfile below
// is its thin client): the server builds it from the stored survey_response.

import { supabaseBrowser } from "@/lib/supabase/client";
import type { Path, SurveyResponse } from "./types";
import { loadResponse, loadResponseId, saveResponseId } from "./storage";
import { EVENT_TYPES, type ProfileUpdatedPayload } from "@/lib/profile/events";
import type { UserProfileEditable } from "@/lib/profile/types";
import type { ApiResult } from "@/lib/courses/types";
import {
  CONSENT_VERSION,
  type RegisterData,
  type RegisterRequest,
  type TrackChoice,
} from "@/app/api/register/_lib/contract";

// Defined with the route's contract so the server never imports this browser
// module; re-exported for callers that read it from here.
export { CONSENT_VERSION };

/**
 * INSERT one survey_response row under a client-generated id (the table has
 * no SELECT policy, so INSERT ... RETURNING would be refused by RLS).
 * A duplicate-key answer means the row is already there, which counts as
 * success: nothing is ever updated (rule 2).
 */
async function insertResponseRow(id: string, response: SurveyResponse): Promise<boolean> {
  try {
    const { error } = await supabaseBrowser().from("survey_response").insert({
      id,
      schema_version: response.schema_version,
      path: response.path,
      q5_variant: response.q5_variant,
      org_code: response.org_code,
      answers: response.answers,
      scoring: response.scoring,
    });
    return !error || error.code === "23505";
  } catch {
    return false;
  }
}

/**
 * Insert the immutable survey_response row (anonymous — before the gate).
 * Idempotent per browser session: skips if an id is already stored.
 * Failures are non-fatal; ensureResponseRow() retries at registration.
 */
export async function insertSurveyResponse(response: SurveyResponse): Promise<string | null> {
  const existing = loadResponseId();
  if (existing) return existing;
  const id = crypto.randomUUID();
  if (!(await insertResponseRow(id, response))) return null;
  saveResponseId(id);
  return id;
}

/** Retry helper: make sure the local response has a DB row before profile seeding. */
export async function ensureResponseRow(): Promise<string | null> {
  const existing = loadResponseId();
  if (existing) return existing;
  const local = loadResponse();
  if (!local) return null;
  return insertSurveyResponse(local);
}

/**
 * Append to profile_event (user_id filled by the session if any). Only the
 * client-written types pass the insert policy (migration 0009); every other
 * type is written by a server route. Resolves to whether the row was stored,
 * so a caller can check before it says "done"; never throws.
 */
export async function logEventRemote(
  type: string,
  data: Record<string, unknown> = {},
): Promise<boolean> {
  try {
    const supabase = supabaseBrowser();
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("profile_event").insert({
      user_id: auth.user?.id ?? null,
      survey_response_id: loadResponseId(),
      type,
      data,
    });
    return !error;
  } catch {
    return false;
  }
}

/** Waitlist capture from the solo/student stubs (bundled consent). */
export async function insertWaitlist(entry: {
  path: "solo" | "student";
  email: string;
  answers: Record<string, string>;
}): Promise<boolean> {
  try {
    const { error } = await supabaseBrowser().from("waitlist").insert({
      path: entry.path,
      email: entry.email,
      answers: entry.answers,
      newsletter_consent: true, // bundled consent checkbox covers newsletter
      consent_version: CONSENT_VERSION,
    });
    // 23505 = duplicate (path, email): the person is already on the list.
    if (error && error.code !== "23505") return false;
    return true;
  } catch {
    return false;
  }
}

/** The only columns a learner may update (column-level grant in migration 0004). */
const EDITABLE_COLUMNS = [
  "display_name",
  "company_name",
  "job_title",
  "marketing_consent",
] as const satisfies readonly (keyof UserProfileEditable)[];

function pickEditable(fields: Partial<UserProfileEditable>): Partial<UserProfileEditable> {
  const patch: Record<string, unknown> = {};
  for (const key of EDITABLE_COLUMNS) {
    if (fields[key] !== undefined) patch[key] = fields[key];
  }
  return patch as Partial<UserProfileEditable>;
}

export interface SeedProfileResult {
  ok: boolean;
  /** Machine code: a RegisterErrorCode from the route, or "network". */
  error?: string;
  /** Path of the profile, as the server read it from the stored response. */
  path?: Path;
  created?: boolean;
}

async function postRegister(body: RegisterRequest): Promise<SeedProfileResult> {
  try {
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as ApiResult<RegisterData>;
    if (json.ok) return { ok: true, path: json.data.path, created: json.data.created };
    return { ok: false, error: json.error };
  } catch {
    return { ok: false, error: "network" };
  }
}

/**
 * Seed user_profile at registration (spec data model #2): a thin client for
 * POST /api/register. The server reads the immutable survey_response row by
 * id and builds the profile from THAT (path, answers, org_code, and a fresh
 * scoring for track and depth flag); nothing in this tab's storage is trusted
 * for those. What goes up from here: the row id, the identity fields, the
 * consent flags, and the teaser pick between two close tracks, which the
 * server checks against its own scoring.
 *
 * Existing row (interrupted flow, or an account from before the identity
 * fields existed): the route updates only the identity fields and the
 * marketing toggle and logs `consent_given` + `profile_updated`. There is
 * deliberately no path that rewrites track, core, consent, or the derived
 * columns of an existing row.
 *
 * No profile without a baseline: when the response row is not in the
 * database the route refuses (`response_required` / `response_not_found`) and
 * the caller shows a retry, instead of creating a profile that points at
 * nothing.
 */
export async function seedProfile(opts: {
  /**
   * Row id when it is already known and this tab holds no answers (hand-off
   * from an in-app browser). Otherwise resolved from this tab's storage,
   * inserting the row first if the earlier attempt failed.
   */
  responseId?: string | null;
  trackChoice: TrackChoice | null;
  marketingConsent: boolean;
  displayName: string;
  companyName?: string | null;
  jobTitle?: string | null;
}): Promise<SeedProfileResult> {
  const displayName = opts.displayName.trim();
  if (!displayName) return { ok: false, error: "display_name_required" };

  const handedOff = Boolean(opts.responseId);
  const responseId = opts.responseId ?? (await ensureResponseRow());

  const body: RegisterRequest = {
    survey_response_id: responseId,
    display_name: displayName,
    company_name: opts.companyName?.trim() || null,
    job_title: opts.jobTitle?.trim() || null,
    privacy_consent: true, // the caller only gets here after the required box
    marketing_consent: opts.marketingConsent,
    track_choice: opts.trackChoice,
  };

  const result = await postRegister(body);
  if (result.ok || result.error !== "response_not_found" || handedOff || !responseId) return result;

  // This tab remembers an id but the row never reached the database. Insert
  // it under the same id (insert only, never an update) and ask once more.
  const local = loadResponse();
  if (!local || !(await insertResponseRow(responseId, local))) return result;
  return postRegister(body);
}

/**
 * Update the learner-editable profile columns for the signed-in user
 * (display_name, company_name, job_title, marketing_consent) and append a
 * `profile_updated` event. Any other column is refused by the database's
 * column-level grant, and this helper never sends one. updated_at is set by
 * the database trigger.
 */
export async function updateProfileFields(
  fields: Partial<UserProfileEditable>,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = supabaseBrowser();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "not_authenticated" };

  const patch = pickEditable(fields);
  const changed = Object.keys(patch) as ProfileUpdatedPayload["fields"];
  if (changed.length === 0) return { ok: true };

  const { error } = await supabase
    .from("user_profile")
    .update(patch)
    .eq("user_id", auth.user.id);
  if (error) return { ok: false, error: error.message };

  await logEventRemote(EVENT_TYPES.profile_updated, {
    version: 1,
    fields: changed,
  } satisfies ProfileUpdatedPayload);
  return { ok: true };
}
