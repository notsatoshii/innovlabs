// Supabase persistence for the funnel (Phase 2). sessionStorage remains the
// in-flow source of truth; these helpers mirror it to the database.

import { supabaseBrowser } from "@/lib/supabase/client";
import type { SurveyResponse, TrackId } from "./types";
import { loadResponse, loadResponseId, saveResponseId } from "./storage";
import {
  EVENT_TYPES,
  type ConsentGivenPayload,
  type ProfileUpdatedPayload,
  type RegisteredPayload,
} from "@/lib/profile/events";
import type { UserProfileEditable } from "@/lib/profile/types";

// Bumped 2026-09 (Phase 1a): the consent text now names the identity fields
// and staff access to learning data (docs/app/phases/phase-1.md §5.3).
export const CONSENT_VERSION = "2026-09-v2";

/**
 * Insert the immutable survey_response row (anonymous — before the gate).
 * Idempotent per browser session: skips if an id is already stored.
 * Failures are non-fatal; ensureResponseRow() retries at registration.
 */
export async function insertSurveyResponse(response: SurveyResponse): Promise<string | null> {
  const existing = loadResponseId();
  if (existing) return existing;
  try {
    // Client-generated id: survey_response has no SELECT policy (clients can
    // never read it back), so INSERT ... RETURNING would be rejected by RLS.
    const id = crypto.randomUUID();
    const { error } = await supabaseBrowser().from("survey_response").insert({
      id,
      schema_version: response.schema_version,
      path: response.path,
      q5_variant: response.q5_variant,
      org_code: response.org_code,
      answers: response.answers,
      scoring: response.scoring,
    });
    if (error) return null;
    saveResponseId(id);
    return id;
  } catch {
    return null;
  }
}

/** Retry helper: make sure the local response has a DB row before profile seeding. */
export async function ensureResponseRow(): Promise<string | null> {
  const existing = loadResponseId();
  if (existing) return existing;
  const local = loadResponse();
  if (!local) return null;
  return insertSurveyResponse(local);
}

/** Fire-and-forget append to profile_event (user_id filled by session if any). */
export async function logEventRemote(
  type: string,
  data: Record<string, unknown> = {},
): Promise<void> {
  try {
    const supabase = supabaseBrowser();
    const { data: auth } = await supabase.auth.getUser();
    await supabase.from("profile_event").insert({
      user_id: auth.user?.id ?? null,
      survey_response_id: loadResponseId(),
      type,
      data,
    });
  } catch {
    // non-fatal
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

/**
 * Seed user_profile from the frozen survey response at registration
 * (spec data model #2). Keyed by user_id.
 *
 * Fresh account: one INSERT with the survey snapshot and the identity
 * fields, then a `registered` event. Existing row (interrupted flow, or an
 * account from before the identity fields existed): the client may UPDATE
 * only the learner-editable columns (column-level grant in migration 0004),
 * so the survey snapshot stays as it is and only the identity fields and the
 * marketing toggle are written, followed by a `profile_updated` event.
 * There is deliberately no path that rewrites track, core, consent, or the
 * derived columns of an existing row.
 */
export async function seedProfile(opts: {
  track: TrackId | null;
  trackVia: "auto" | "user_choice" | "skip_default" | null;
  marketingConsent: boolean;
  displayName: string;
  companyName?: string | null;
  jobTitle?: string | null;
  method: RegisteredPayload["method"];
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = supabaseBrowser();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "not_authenticated" };

  const displayName = opts.displayName.trim();
  if (!displayName) return { ok: false, error: "display_name_required" };
  const companyName = opts.companyName?.trim() || null;
  const jobTitle = opts.jobTitle?.trim() || null;

  const { data: existing, error: lookupError } = await supabase
    .from("user_profile")
    .select("user_id")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (lookupError) return { ok: false, error: lookupError.message };

  if (existing) {
    // The person just ticked the current consent text; the row keeps its
    // original consent_version (not learner-updatable), so record the fact
    // on the append-only log instead.
    await logEventRemote(EVENT_TYPES.consent_given, {
      version: 1,
      consent_version: CONSENT_VERSION,
      marketing_consent: opts.marketingConsent,
    } satisfies ConsentGivenPayload);
    return updateProfileFields({
      display_name: displayName,
      company_name: companyName,
      job_title: jobTitle,
      marketing_consent: opts.marketingConsent,
    });
  }

  const local = loadResponse();
  if (!local) return { ok: false, error: "no_survey_response" };

  const responseId = await ensureResponseRow();

  const { error } = await supabase.from("user_profile").insert({
    user_id: auth.user.id,
    survey_response_id: responseId,
    path: local.path,
    track: opts.track,
    track_via: opts.trackVia,
    depth_flag: local.scoring?.depthFlag ?? null,
    core: local.answers,
    org_code: local.org_code,
    consented_at: new Date().toISOString(),
    consent_version: CONSENT_VERSION,
    marketing_consent: opts.marketingConsent,
    display_name: displayName,
    company_name: companyName,
    job_title: jobTitle,
  });
  if (error) return { ok: false, error: error.message };

  const fields: RegisteredPayload["fields"] = ["display_name"];
  if (companyName) fields.push("company_name");
  if (jobTitle) fields.push("job_title");
  await logEventRemote(EVENT_TYPES.registered, {
    version: 1,
    fields,
    method: opts.method,
  } satisfies RegisteredPayload);
  return { ok: true };
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
