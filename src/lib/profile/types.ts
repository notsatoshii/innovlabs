// Row types for the living profile (user_profile) and its derived snapshots.
// Shapes mirror supabase/migrations/0001_init.sql + 0004_app_phase1.sql and
// docs/app/phases/phase-1.md §5. The survey_response row is never read by
// the client (no select policy), so it has no type here.

import type { DepthFlag, Path, TrackId } from "@/lib/survey/types";

export type StaffRole = "admin" | "instructor";

/** Work Map snapshot (Week 1, SP-W1-WM). Rebuilt from work_map_submitted events. */
export interface WorkMapSnapshot {
  version: 1;
  submitted_at: string;
  categories: { id: string; label: string; hours_survey: number }[];
  rows: { category: string; task: string; hours: number; kind: "P" | "T" }[];
  totals: { p_hours: number; t_hours: number };
  candidates: {
    task_row: number;
    scores: {
      recurs: 1 | 2 | 3;
      digital_inputs: 1 | 2 | 3;
      stable_rules: 1 | 2 | 3;
      ownership: 1 | 2 | 3;
      low_cost_wrong: 1 | 2 | 3;
    };
    total: number;
    rank: 1 | 2 | 3;
  }[];
}

/** Tool and path facts about the learner (Weeks 1 to 3). */
export interface LearningSnapshot {
  version: 1;
  assistant?: string;
  blocked_tools?: string[];
  path?: "browser" | "agent";
  workspace_ready?: boolean;
  /** Week 3 workspace check: company IT blocks uploads (a capability, not a tool name). */
  uploads_blocked?: boolean;
  /** Week 3 workspace check: what the learner named the workspace. */
  workspace_name?: string;
  /**
   * Reserved for the student curriculum. Writers MERGE into the existing
   * object (POST /api/artifacts/workspace); a full replace would erase these.
   */
  style?: string;
  level?: string;
}

/**
 * Locked baseline (Week 3, SP-W3-BL; phase-2c C4, C5). Written only by the
 * lock_baseline() and countersign_baseline() functions (migration 0011).
 * The countersigned baseline is the baseline_locked event that the
 * countersign names (countersign_event_id → baseline_event_id), never "the
 * latest baseline_locked". Per person, readable only by the learner and staff;
 * any org-facing view aggregates it with n >= 5 per slice (rule 5, Phase 5).
 */
export interface BaselineSnapshot {
  version: 1;
  /** The baseline_locked event this snapshot is (added by lock_baseline()). */
  locked_event_id: number;
  /** The capstone task. Fixed from here (D3: frozen after countersign). */
  task: string;
  /** Where the task came from. candidate_rank 2 is allowed (session plan Part 4 step 1). */
  source: {
    work_map_event_id: number | null;
    candidate_rank: 1 | 2 | 3 | null;
    blueprint_event_id: number | null;
  };
  /** Stages as done today, in order. */
  current_method_stages: string[];
  /** The learner's own pre-harness time_log_entry (method "before", no dry_run). */
  time_log_event_id: number;
  /** created_at of that entry; staff flag one logged within a day of signed_at. */
  time_logged_at: string;
  /** Computed by the route from that entry's started_at/ended_at. */
  minutes_per_instance: number;
  frequency: { count: number; per: "week" | "month" };
  /** A path in the learner's own evidence folder that one of their time log entries cites. */
  evidence_ref: string | null;
  /** Quality checklist v0, 4 to 6 lines. Week 11 scores both outputs against it. */
  quality_checklist: string[];
  /** The learner's own confirmation (ISO). */
  signed_at: string;
  countersigned_at?: string;
  /** Staff user id and role. Never an email: the learner reads this row. */
  countersigned_by?: { user_id: string; role: StaffRole };
  countersign_event_id?: number;
}

/** One row of public.user_profile as the client sees it. */
export interface UserProfile {
  user_id: string;
  created_at: string;
  updated_at: string;
  survey_response_id: string | null;
  path: Path;
  track: TrackId | null;
  track_via: "auto" | "user_choice" | "skip_default" | null;
  depth_flag: DepthFlag | null;
  core: Record<string, unknown>;
  org_code: string | null;
  consented_at: string;
  consent_version: string;
  marketing_consent: boolean;
  one_pager: unknown | null;
  one_pager_generated_at: string | null;
  display_name: string | null;
  company_name: string | null;
  job_title: string | null;
  work_map: WorkMapSnapshot | null;
  learning: LearningSnapshot | null;
  baseline: BaselineSnapshot | null;
}

/** The only columns a learner may update (column-level grant in 0004). */
export type UserProfileEditable = Pick<
  UserProfile,
  "display_name" | "company_name" | "job_title" | "marketing_consent"
>;
