// Supabase persistence for the funnel (Phase 2). sessionStorage remains the
// in-flow source of truth; these helpers mirror it to the database.

import { supabaseBrowser } from "@/lib/supabase/client";
import type { SurveyResponse, TrackId } from "./types";
import { loadResponse, loadResponseId, saveResponseId } from "./storage";

export const CONSENT_VERSION = "2026-08-v1";

/**
 * Insert the immutable survey_response row (anonymous — before the gate).
 * Idempotent per browser session: skips if an id is already stored.
 * Failures are non-fatal; ensureResponseRow() retries at registration.
 */
export async function insertSurveyResponse(response: SurveyResponse): Promise<string | null> {
  const existing = loadResponseId();
  if (existing) return existing;
  try {
    const { data, error } = await supabaseBrowser()
      .from("survey_response")
      .insert({
        schema_version: response.schema_version,
        path: response.path,
        q5_variant: response.q5_variant,
        org_code: response.org_code,
        answers: response.answers,
        scoring: response.scoring,
      })
      .select("id")
      .single();
    if (error || !data) return null;
    saveResponseId(data.id as string);
    return data.id as string;
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

/**
 * Seed user_profile from the frozen survey response at registration
 * (spec data model #2). Upsert keyed by user_id: re-registration after an
 * interrupted flow updates the same profile.
 */
export async function seedProfile(opts: {
  track: TrackId | null;
  trackVia: "auto" | "user_choice" | "skip_default" | null;
  marketingConsent: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = supabaseBrowser();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "not_authenticated" };

  const local = loadResponse();
  if (!local) return { ok: false, error: "no_survey_response" };

  const responseId = await ensureResponseRow();

  const { error } = await supabase.from("user_profile").upsert(
    {
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
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) return { ok: false, error: error.message };

  await logEventRemote("registered", {
    track: opts.track,
    consent_version: CONSENT_VERSION,
  });
  return { ok: true };
}
