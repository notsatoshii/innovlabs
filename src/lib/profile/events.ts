// Event catalog for public.profile_event (append-only log, spec data model #3).
// Documented here rather than as a DB enum so Phase 2 and 3 can add types
// without a migration. Every payload carries `version` so a later shape
// change is a re-derivation of the profile snapshots, never a data loss.
// Source: docs/app/phases/phase-1.md §5.4, derived from the spine session
// plans in docs/curriculum.

export type EventVisibility = "learner" | "staff";

export const EVENT_TYPES = {
  // Week 0: funnel and registration (exist since Phase 1 to 2 of the funnel)
  fork_selected: "fork_selected",
  survey_completed: "survey_completed",
  track_assigned: "track_assigned",
  track_overridden: "track_overridden",
  stub_completed: "stub_completed",
  registered: "registered",
  profile_updated: "profile_updated",
  consent_given: "consent_given",
  one_pager_generated: "one_pager_generated",
  course_waitlist_joined: "course_waitlist_joined",
  enrolled: "enrolled",
  // Week 1 (SP-W1-WM, SP-W1-BAS, SP-W1-TL)
  work_map_submitted: "work_map_submitted",
  drill_completed: "drill_completed",
  time_log_entry: "time_log_entry",
  // Week 2 (SP-HL-*, SP-W2-CL)
  harness_saved: "harness_saved",
  correction_logged: "correction_logged",
  // Week 3 (SP-W3-BP, SP-W3-BL)
  workspace_setup: "workspace_setup",
  blueprint_submitted: "blueprint_submitted",
  baseline_locked: "baseline_locked",
  baseline_countersigned: "baseline_countersigned",
  // Any week
  lab_completed: "lab_completed",
  checkin: "checkin",
  instructor_note: "instructor_note",
  // Week 11
  capstone_measured: "capstone_measured",
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];

/** Which events a learner must never see. Everything else is 'learner'. */
export const STAFF_ONLY_EVENTS: ReadonlySet<EventType> = new Set<EventType>([
  EVENT_TYPES.instructor_note,
]);

/**
 * Events that record a staff action. The insert policy in migration 0004
 * refuses these from anyone without a staff role (keep the two lists equal).
 */
export const STAFF_WRITTEN_EVENTS: ReadonlySet<EventType> = new Set<EventType>([
  EVENT_TYPES.enrolled,
  EVENT_TYPES.baseline_countersigned,
  EVENT_TYPES.instructor_note,
]);

export function visibilityFor(type: EventType): EventVisibility {
  return STAFF_ONLY_EVENTS.has(type) ? "staff" : "learner";
}

/** Which phase writes each event (for reviewers; not used at runtime). */
export const EVENT_PHASE: Record<EventType, 1 | 2 | 3> = {
  fork_selected: 1,
  survey_completed: 1,
  track_assigned: 1,
  track_overridden: 1,
  stub_completed: 1,
  registered: 1,
  profile_updated: 1,
  consent_given: 1,
  one_pager_generated: 1,
  course_waitlist_joined: 1,
  enrolled: 2,
  work_map_submitted: 2,
  drill_completed: 2,
  time_log_entry: 2,
  harness_saved: 2,
  correction_logged: 2,
  workspace_setup: 2,
  blueprint_submitted: 2,
  baseline_locked: 2,
  baseline_countersigned: 2,
  lab_completed: 2,
  checkin: 2,
  instructor_note: 3,
  capstone_measured: 2,
};

// --- Payloads written in Phase 1 ---

export interface RegisteredPayload {
  version: 1;
  fields: ("display_name" | "company_name" | "job_title")[];
  method: "google" | "kakao" | "email";
}

export interface ProfileUpdatedPayload {
  version: 1;
  fields: ("display_name" | "company_name" | "job_title" | "marketing_consent")[];
}

export interface ConsentGivenPayload {
  version: 1;
  consent_version: string;
  marketing_consent: boolean;
}

// --- Payloads reserved for Phase 2 (shapes fixed now so screens add UI only) ---

export interface TimeLogEntryPayload {
  version: 1;
  task: string;
  method: "before" | "harness" | "pipeline";
  started_at: string;
  ended_at: string;
  interruptions: number;
  evidence_ref: string | null;
}

export interface HarnessSavedPayload {
  version: 1;
  harness_id: string;
  harness_version: number;
  doc_type: string;
  parts: {
    role: string;
    context: string;
    format: string;
    rules: string[]; // capped at 10 by validation (SP-W2 ten-rule cap)
    example_ref: string | null;
    fallbacks: string;
  };
}

export interface CorrectionLoggedPayload {
  version: 1;
  harness_id: string;
  original: string;
  changed_to: string;
  recurring: boolean;
  rule_written: boolean;
}

export interface BlueprintSubmittedPayload {
  version: 1;
  task: string;
  stages: {
    order: number;
    name: string;
    kind: "P" | "T";
    actor: "assistant" | "human" | "assistant_checked";
    needs: string;
  }[];
  checkpoints: { after_stage: number; checks: string[] }[];
  trigger: string;
  delivery: string;
  dry_run_minutes?: number;
}

export interface InstructorNotePayload {
  version: 1;
  note: string;
  by: string; // staff email
}

export interface CapstoneMeasuredPayload {
  version: 1;
  before: { minutes: number; evidence_ref: string | null };
  after: { minutes: number; evidence_ref: string | null };
  checklist_scores: { item: string; before: boolean; after: boolean }[];
}
