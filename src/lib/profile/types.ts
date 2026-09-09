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
  /** Reserved for the student curriculum. */
  style?: string;
  level?: string;
}

/** Locked baseline (Week 3, SP-W3-BL). */
export interface BaselineSnapshot {
  version: 1;
  task: string;
  current_method_stages: string[];
  minutes_per_instance: number;
  frequency: string;
  evidence_ref: string | null;
  quality_checklist: string[];
  signed_at: string;
  countersigned_at?: string;
  countersigned_by?: string;
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
