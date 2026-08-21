// Phase 1 client-side persistence (sessionStorage) — replaced by Supabase in Phase 2.
// Mirrors the data-model rules: survey_response is write-once, events are append-only.

import type { ProfileEvent, SurveyResponse } from "./types";

const DRAFT_KEY = "survey_draft_v1_1";
const RESPONSE_KEY = "survey_response_v1_1";
const EVENTS_KEY = "profile_events_v1_1";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

// --- Draft (mutable while the survey is in progress) ---

export interface SurveyDraft {
  answers: Record<string, unknown>;
  step: number;
  q5Variant: "grid" | "seq" | null;
  orgCode: string | null;
}

export function loadDraft(): SurveyDraft | null {
  if (!isBrowser()) return null;
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as SurveyDraft) : null;
  } catch {
    return null;
  }
}

export function saveDraft(draft: SurveyDraft): void {
  if (!isBrowser()) return;
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function clearDraft(): void {
  if (!isBrowser()) return;
  sessionStorage.removeItem(DRAFT_KEY);
}

// --- Response (immutable once written — spec rule 2) ---

export function loadResponse(): SurveyResponse | null {
  if (!isBrowser()) return null;
  try {
    const raw = sessionStorage.getItem(RESPONSE_KEY);
    return raw ? (JSON.parse(raw) as SurveyResponse) : null;
  } catch {
    return null;
  }
}

/**
 * Write-once: refuses to overwrite an existing response and returns the
 * original. There is deliberately no update/delete function for responses.
 */
export function submitResponse(response: SurveyResponse): SurveyResponse {
  const existing = loadResponse();
  if (existing) return existing;
  sessionStorage.setItem(RESPONSE_KEY, JSON.stringify(response));
  clearDraft();
  return response;
}

// --- Events (append-only log — profile_event analog) ---

export function appendEvent(event: Omit<ProfileEvent, "at">): void {
  if (!isBrowser()) return;
  try {
    const raw = sessionStorage.getItem(EVENTS_KEY);
    const events: ProfileEvent[] = raw ? JSON.parse(raw) : [];
    events.push({ ...event, at: new Date().toISOString() });
    sessionStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  } catch {
    // non-fatal in Phase 1
  }
}

// --- Assigned track (Phase 1 analog of user_profile.track; set once via teaser) ---

const TRACK_KEY = "assigned_track_v1_1";

export function loadAssignedTrack(): string | null {
  if (!isBrowser()) return null;
  return sessionStorage.getItem(TRACK_KEY);
}

export function saveAssignedTrack(track: string): void {
  if (!isBrowser()) return;
  sessionStorage.setItem(TRACK_KEY, track);
}

// --- Supabase row id for the submitted response (set once after insert) ---

const RESPONSE_ID_KEY = "survey_response_id_v1_1";

export function loadResponseId(): string | null {
  if (!isBrowser()) return null;
  return sessionStorage.getItem(RESPONSE_ID_KEY);
}

export function saveResponseId(id: string): void {
  if (!isBrowser()) return;
  sessionStorage.setItem(RESPONSE_ID_KEY, id);
}

// --- Registration consent (given on the consent screen, recorded at seeding) ---

const CONSENT_KEY = "register_consent_v1_1";

export interface ConsentState {
  agreedAt: string;
  marketing: boolean;
}

export function loadConsent(): ConsentState | null {
  if (!isBrowser()) return null;
  try {
    const raw = sessionStorage.getItem(CONSENT_KEY);
    return raw ? (JSON.parse(raw) as ConsentState) : null;
  } catch {
    return null;
  }
}

export function saveConsent(state: ConsentState): void {
  if (!isBrowser()) return;
  sessionStorage.setItem(CONSENT_KEY, JSON.stringify(state));
}

/** Read the append-only event log (for deriving track_via at registration). */
export function loadEvents(): ProfileEvent[] {
  if (!isBrowser()) return [];
  try {
    const raw = sessionStorage.getItem(EVENTS_KEY);
    return raw ? (JSON.parse(raw) as ProfileEvent[]) : [];
  } catch {
    return [];
  }
}
