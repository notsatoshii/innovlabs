// A 24-hour copy of the submitted survey in localStorage (review finding
// P0-5). sessionStorage, where the funnel keeps its state, dies with the tab:
// an in-app browser that is closed and reopened, or a second tab, used to
// start again from zero. This copy lets /register pick the response back up.
//
// Rules kept:
//   - Write-once, like the response itself (rule 2): an unexpired copy is
//     never replaced by a different response. Only its empty bookkeeping
//     fields (row id, chosen track) are filled in later.
//   - Nothing here is sent anywhere. The database row stays the baseline.
//   - Expires 24 hours after it was first written and is removed when the
//     registration finishes.
//
// No import from storage.ts on purpose, so storage.ts can import this file
// (see the proposed patch in the 2026-10 hardening report).

import type { Path, SurveyResponse, TrackId } from "@/lib/survey/types";

const BACKUP_KEY = "survey_backup_v1";
const HANDOFF_KEY = "register_handoff_v1";
const TTL_MS = 24 * 60 * 60 * 1000;

export type TrackVia = "auto" | "user_choice" | "skip_default";

export interface SurveyBackup {
  v: 1;
  /** Epoch ms. Fixed when the copy is first written; never extended. */
  expiresAt: number;
  /** null in a browser that only received a hand-off link (no answers there). */
  response: SurveyResponse | null;
  /** survey_response row id, once the insert has succeeded. */
  responseId: string | null;
  path: Path | null;
  track: TrackId | null;
  trackVia: TrackVia | null;
}

function storage(kind: "local" | "session"): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null; // storage blocked (private mode in some webviews)
  }
}

function read(): SurveyBackup | null {
  const store = storage("local");
  if (!store) return null;
  try {
    const raw = store.getItem(BACKUP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SurveyBackup;
    if (parsed?.v !== 1 || typeof parsed.expiresAt !== "number") return null;
    if (Date.now() >= parsed.expiresAt) {
      store.removeItem(BACKUP_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function write(backup: SurveyBackup): void {
  try {
    storage("local")?.setItem(BACKUP_KEY, JSON.stringify(backup));
  } catch {
    // quota or blocked storage: the flow still works within this tab
  }
}

/** The unexpired copy, or null. An expired one is deleted on the way. */
export function loadBackup(): SurveyBackup | null {
  return read();
}

/**
 * Mirror the submitted response. If an unexpired copy of ANOTHER response
 * exists it is left alone (write-once); for the same response only the empty
 * bookkeeping fields are filled in.
 */
export function mirrorResponseToBackup(
  response: SurveyResponse,
  meta: { responseId: string | null; track: TrackId | null; trackVia: TrackVia | null },
): void {
  const existing = read();
  if (!existing) {
    write({
      v: 1,
      expiresAt: Date.now() + TTL_MS,
      response,
      responseId: meta.responseId,
      path: response.path,
      track: meta.track,
      trackVia: meta.trackVia,
    });
    return;
  }
  const same = existing.response !== null && existing.response.submitted_at === response.submitted_at;
  if (!same) return;
  const next: SurveyBackup = {
    ...existing,
    responseId: existing.responseId ?? meta.responseId,
    track: existing.track ?? meta.track,
    trackVia: existing.trackVia ?? meta.trackVia,
  };
  if (
    next.responseId !== existing.responseId ||
    next.track !== existing.track ||
    next.trackVia !== existing.trackVia
  ) {
    write(next);
  }
}

export function clearBackup(): void {
  try {
    storage("local")?.removeItem(BACKUP_KEY);
    storage("session")?.removeItem(HANDOFF_KEY);
  } catch {
    // non-fatal
  }
}

// --- hand-off: continuing in another browser with only the row id ---

/**
 * What the external browser needs to finish a registration that was started
 * in an in-app browser: the id of the stored survey_response row. The server
 * reads the answers from that row; none of them travel in the link. `path`
 * and the track are display hints and a teaser choice the server re-checks.
 */
export interface Handoff {
  responseId: string;
  path: Path;
  track: TrackId | null;
  trackVia: TrackVia | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TRACK_IDS: readonly TrackId[] = [
  "docs_admin",
  "research_planning",
  "data_numbers",
  "sales_customer",
  "content_marketing",
  "management_coordination",
];
const VIAS: readonly TrackVia[] = ["auto", "user_choice", "skip_default"];

/** Query string for the link opened in the external browser. */
export function handoffQuery(handoff: Handoff): string {
  const q = new URLSearchParams({ rid: handoff.responseId, p: handoff.path });
  if (handoff.track) q.set("t", handoff.track);
  if (handoff.trackVia) q.set("via", handoff.trackVia);
  return q.toString();
}

/** Parse ?rid=…&p=…[&t=…&via=…]; null unless the id and path are well-formed. */
export function parseHandoff(params: URLSearchParams): Handoff | null {
  const rid = params.get("rid") ?? "";
  const p = params.get("p");
  if (!UUID.test(rid) || (p !== "employee" && p !== "hagwon")) return null;
  const t = params.get("t");
  const via = params.get("via");
  return {
    responseId: rid,
    path: p,
    track: TRACK_IDS.includes(t as TrackId) ? (t as TrackId) : null,
    trackVia: VIAS.includes(via as TrackVia) ? (via as TrackVia) : null,
  };
}

/**
 * Remember a hand-off for this tab (it must survive the OAuth round trip),
 * and for 24 hours in localStorage when this browser holds no copy yet.
 */
export function saveHandoff(handoff: Handoff): void {
  try {
    storage("session")?.setItem(HANDOFF_KEY, JSON.stringify(handoff));
  } catch {
    // non-fatal
  }
  if (!read()) {
    write({
      v: 1,
      expiresAt: Date.now() + TTL_MS,
      response: null,
      responseId: handoff.responseId,
      path: handoff.path,
      track: handoff.track,
      trackVia: handoff.trackVia,
    });
  }
}

/** The hand-off this tab arrived with (kept across the OAuth round trip). */
export function loadSessionHandoff(): Handoff | null {
  try {
    const raw = storage("session")?.getItem(HANDOFF_KEY);
    if (!raw) return null;
    const h = JSON.parse(raw) as Handoff;
    if (UUID.test(h?.responseId ?? "") && (h.path === "employee" || h.path === "hagwon")) return h;
  } catch {
    // unreadable: treat as absent
  }
  return null;
}

/** A hand-off kept in localStorage by an earlier tab of this browser, else null. */
export function loadStoredHandoff(): Handoff | null {
  const backup = read();
  if (backup && backup.response === null && backup.responseId && backup.path) {
    if (backup.path !== "employee" && backup.path !== "hagwon") return null;
    return {
      responseId: backup.responseId,
      path: backup.path,
      track: backup.track,
      trackVia: backup.trackVia,
    };
  }
  return null;
}
