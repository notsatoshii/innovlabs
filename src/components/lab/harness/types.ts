// Shapes passed from the harness page (server) to the library and editor (client).

import type { CorrectionInput, HarnessDraftItem } from "@/lib/courses/types";

/** The latest saved version of one harness. */
export interface SavedView {
  version: number;
  /** "2026년 10월 1일" */
  savedOn: string;
  /** What that version contains, to tell whether the draft has moved on since. */
  item: HarnessDraftItem;
}

/**
 * A corrected sentence carried over from the correction log
 * (`?h=<harness>&from=<event id>`), offered as the text of a new rule.
 */
export interface RulePrefill {
  eventId: number;
  rule: string;
  correction: CorrectionInput;
}

/**
 * A rule that came from the correction log and so far exists only in the
 * draft. The correction is logged as written when the harness is saved with
 * the rule still in it, and not before.
 */
export interface PendingRule {
  correction: CorrectionInput;
  /** Where the rule sits in the harness's rules. */
  index: number;
}
