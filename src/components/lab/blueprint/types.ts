// View shapes the blueprint page (server) hands to the editor (client).
// Display-only: the contracts live in src/lib/courses/types.ts and
// src/lib/profile/events.ts and are imported, never redefined here.

import type { BlueprintDraft } from "@/lib/courses/types";
import type { BlueprintSubmittedPayload } from "@/lib/profile/events";

export type SetBlueprint = (next: BlueprintDraft | ((prev: BlueprintDraft) => BlueprintDraft)) => void;

/** One Work Map candidate the blueprint can be for. */
export interface CandidateOption {
  rank: 1 | 2 | 3;
  task: string;
}

/** One of the learner's saved harnesses, for a stage's "연결할 하네스". */
export interface HarnessOption {
  id: string;
  name: string;
  doc_type: string;
}

/** The newest submitted blueprint. */
export interface SubmittedView {
  eventId: number;
  /** "2026년 10월 4일". */
  submittedOn: string;
  blueprint: BlueprintSubmittedPayload;
}

/** The two time lines shown together after a dry run (dryRunLine / beforeLine). */
export interface TimeLines {
  /** Newest dry run, or null when none is logged yet. */
  dryRun: string | null;
  /** The Week 1 "before" figure, or null when there is none. */
  before: string | null;
}
