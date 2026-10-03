// "처음부터 다시 하기" (review A9): forget this browser's copy of the survey
// so the next person on a shared office PC starts from zero instead of
// landing on the previous person's teaser.
//
// What this does and does not touch:
//   - It removes only this browser's keys: the tab's draft, response, event
//     log, assigned track, row id and consent (sessionStorage), the 학원
//     draft, and the 24-hour copy plus any hand-off (localStorage, backup.ts).
//   - The survey_response row in the database is NOT touched (insert-only,
//     CLAUDE.md rule 2): nothing is updated or deleted, nothing is sent.
//     A finished but unregistered row simply stays unclaimed, like the row of
//     anyone who leaves after the teaser.
//
// Kept out of storage.ts on purpose: its response API stays write-once.

import { clearBackup, loadBackup } from "./backup";
import {
  CONSENT_KEY,
  DRAFT_KEY,
  EVENTS_KEY,
  RESPONSE_ID_KEY,
  RESPONSE_KEY,
  TRACK_KEY,
} from "./storage";
import { HAGWON_DRAFT_KEY } from "@/components/hagwon/survey/draft";
import type { SurveyResponse } from "./types";

const SESSION_KEYS = [
  DRAFT_KEY,
  RESPONSE_KEY,
  EVENTS_KEY,
  TRACK_KEY,
  RESPONSE_ID_KEY,
  CONSENT_KEY,
  HAGWON_DRAFT_KEY,
];

/** Forget this browser's survey state (both paths). Never throws. */
export function forgetLocalSurvey(): void {
  try {
    for (const key of SESSION_KEYS) window.sessionStorage.removeItem(key);
  } catch {
    // storage blocked: nothing was stored either
  }
  clearBackup();
}

/**
 * A finished survey this browser still holds, read WITHOUT side effects
 * (loadResponse() would copy the 24-hour backup into this tab). Used by the
 * fork to ask before anything is forgotten.
 */
export function peekLocalResponse(): SurveyResponse | null {
  try {
    const raw = window.sessionStorage.getItem(RESPONSE_KEY);
    if (raw) return JSON.parse(raw) as SurveyResponse;
  } catch {
    // fall through to the backup
  }
  return loadBackup()?.response ?? null;
}
