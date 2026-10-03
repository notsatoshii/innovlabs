// Shapes passed from the baseline page (server) to the baseline editor and
// summary. Dates are formatted on the server so the client renders the same
// text it was handed.

import type { BeforeEntry } from "@/lib/courses/types";
import type { BlueprintSubmittedPayload } from "@/lib/profile/events";

/** A "before" time log entry as the form lists it. */
export interface BeforeEntryView extends BeforeEntry {
  minutes: number;
  /** "10월 1일 (목)", the day the work started. */
  dayLabel: string;
  /** Short-lived signed link to the entry's evidence, when it has one and signing worked. */
  evidenceUrl: string | null;
}

/** The newest dry run (time log entry with dry_run), shown beside the Week 1 time. */
export interface DryRunView {
  minutes: number;
  dayLabel: string;
}

/** A Work Map candidate the learner can take as the capstone task. */
export interface CandidateOption {
  rank: 1 | 2 | 3;
  task: string;
}

/** The newest submitted blueprint (prefill and the "가져오기" button). */
export interface BlueprintRef {
  eventId: number;
  blueprint: BlueprintSubmittedPayload;
}

/** D5 as the form needs it: whether 확정 is possible now, and why not. */
export type LockGateView =
  | { state: "open" }
  | { state: "closed"; opensOn: string | null } // "10월 14일" or null without a start date
  | { state: "not_enrolled" }
  | { state: "error" };
