// Draft persistence for the 학원 survey (sessionStorage). Own key namespace:
// the employee draft in src/lib/survey/storage.ts is never read or written
// from this path. The submitted response still goes through submitResponse()
// (write-once) so both paths share one response slot per browser session.

import type { HagwonAnswers, PainItem } from "@/lib/hagwon/types";

export const HAGWON_DRAFT_KEY = "hagwon_draft_v0_2";

/**
 * In-progress answers. Q4 is kept as a 3-slot array (1위, 2위, 3위) with null
 * for slots not yet chosen, so each ranking screen can exclude the others.
 */
export type DraftAnswers = Omit<Partial<HagwonAnswers>, "q4"> & {
  q4?: (PainItem | null)[];
};

export interface HagwonDraft {
  answers: DraftAnswers;
  step: number;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function loadHagwonDraft(): HagwonDraft | null {
  if (!isBrowser()) return null;
  try {
    const raw = sessionStorage.getItem(HAGWON_DRAFT_KEY);
    return raw ? (JSON.parse(raw) as HagwonDraft) : null;
  } catch {
    return null;
  }
}

export function saveHagwonDraft(draft: HagwonDraft): void {
  if (!isBrowser()) return;
  try {
    sessionStorage.setItem(HAGWON_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // non-fatal: the flow keeps working in memory
  }
}

export function clearHagwonDraft(): void {
  if (!isBrowser()) return;
  sessionStorage.removeItem(HAGWON_DRAFT_KEY);
}
