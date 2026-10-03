// Courses, cohorts, and lab contracts (docs/app/phases/phase-2.md).
// Row shapes mirror supabase/migrations/0007_courses.sql. Content shapes are
// the JSON files under content/courses/. API payloads are what the routes in
// src/app/api accept and return. Import from here; never redefine.

import type { TrackCode } from "@/lib/resources/types";
import type { AssistantId, BlueprintActor, DryRunRef } from "@/lib/profile/events";

// --- Rows ---

export type CohortTrack = TrackCode | "SPINE";

export interface Cohort {
  id: string;
  code: string; // 6 chars, A–Z 0–9
  name: string;
  track_code: CohortTrack;
  starts_on: string | null; // YYYY-MM-DD
  schedule_note: string | null;
  venue: string | null;
  org_code: string | null;
  open_week: number; // 0–12, staff override; weeks ≤ this are open regardless of date
  status: "planned" | "running" | "done";
  created_by: string | null;
  created_at: string;
}

export interface Enrollment {
  cohort_id: string;
  user_id: string;
  status: "active" | "dropped" | "completed";
  enrolled_at: string;
}

export type DraftKind = "work_map" | "drill" | "harness" | "blueprint" | "baseline";

// --- Course content (content/courses/) ---

/** content/courses/structure.json: the fixed 12-week shape every track shares. */
export interface CourseStructure {
  blocks: { title: string; weeks: [number, number]; summary: string }[];
  weeks: {
    week: number; // 1–12
    title: string; // Korean
    kind: "spine" | "cartridge" | "capstone";
    summary: string; // one sentence, Korean
    /** true when content/courses/spine/week-N.json exists. */
    hasPage: boolean;
  }[];
}

/** content/courses/spine/week-N.json: the learner-facing page for one session. */
export interface WeekContent {
  week: number;
  title: string;
  /** One sentence: what you leave the room with. */
  objective: string;
  /** What to bring / prepare before the session. */
  bring: string[];
  /** The idea of the session in two or three short paragraphs. */
  idea: string[];
  /** Lab parts in order. */
  lab: {
    title: string;
    minutes: number;
    steps: string[];
    done: string; // "done looks like"
    /** App lab this part uses, if any. */
    labHref?:
      | "/app/lab/work-map"
      | "/app/lab/drill"
      | "/app/lab/time-log"
      | "/app/lab/harness"
      | "/app/lab/corrections"
      | "/app/lab/workspace"
      | "/app/lab/blueprint"
      // Week 3 Part 3: the dry-run timer section of the blueprint page.
      | "/app/lab/blueprint#dry-run"
      | "/app/lab/baseline";
  }[];
  /** The real-work assignment for the week. */
  assignment: {
    summary: string;
    steps: string[];
    labHref?:
      | "/app/lab/time-log"
      | "/app/lab/corrections"
      // Week 3: the pipeline run, logged as 파이프라인 with the Week 3 header.
      | "/app/lab/time-log?from=week3";
  };
  /** One honest sentence: what is still left for a human (principle P3). */
  leftForHuman: string;
}

// --- Week 1 labs ---

export type RowKind = "P" | "T" | "M"; // M allowed in a draft, never at submit
export type Score = 1 | 2 | 3;

export interface WorkMapRow {
  id: string; // client-generated, stable within the draft
  category: string; // TaskClusterId a–h, or "x" for a learner-added category
  task: string; // verb phrase
  hours: number; // per week
  kind: RowKind | null;
}

export interface CandidateScores {
  recurs: Score | null; // 3 weekly or more · 2 monthly · 1 less
  digital_inputs: Score | null; // 3 already digital · 2 partly · 1 paper or in heads
  stable_rules: Score | null; // 3 could write them down · 2 mostly · 1 depends every time
  ownership: Score | null; // 3 end to end · 2 shared · 1 only a piece
  low_cost_wrong: Score | null; // 3 reviewed before it goes anywhere · 2 medium · 1 straight to client or 부장
}

export interface WorkMapDraft {
  version: 1;
  /** Extra categories the learner added (id "x1", "x2", …). */
  extraCategories: { id: string; label: string }[];
  rows: WorkMapRow[];
  /** Up to three candidates in rank order; rowId points at a P row. */
  candidates: { rowId: string; scores: CandidateScores }[];
}

export interface DrillDraft {
  version: 1;
  /** How many differences between Round 1 and Round 2 the learner marked. */
  differences: string[]; // each a short phrase; at least four at submit
  /** The thing Round 2 invented, assumed, or got wrong. */
  invention: string;
  /** One line: what a human still has to do to Round 2's output. */
  leftForHuman: string;
  /** Which task the drill ran on. */
  task: string;
}

export interface TimeLogInput {
  task: string;
  method: "before" | "harness" | "pipeline";
  started_at: string; // ISO
  ended_at: string; // ISO
  interruptions: number;
  /** Storage path in the evidence bucket, or null. */
  evidence_ref: string | null;
  /** Week 3 dry run only; method must be "pipeline" (phase-2c C1). */
  dry_run?: DryRunRef;
}

// --- API shapes ---

export interface ApiOk<T = Record<string, never>> {
  ok: true;
  data: T;
}
export interface ApiError {
  ok: false;
  error: string; // machine code, e.g. "invalid_code", "not_staff", "validation"
  /** Field-level problems for validation errors. */
  problems?: string[];
}
export type ApiResult<T = Record<string, never>> = ApiOk<T> | ApiError;

/** POST /api/cohort/join */
export interface JoinCohortRequest {
  code: string;
}
/** POST /api/staff/cohort */
export interface CreateCohortRequest {
  name: string;
  track_code: CohortTrack;
  starts_on: string | null;
  schedule_note: string | null;
  venue: string | null;
}
/** POST /api/staff/cohort/[id]/open-week */
export interface OpenWeekRequest {
  open_week: number;
}
/** POST /api/staff/cohort/[id]/enroll */
export interface StaffEnrollRequest {
  email: string;
}

/** Week n is open when staff opened it or its date has come. */
export function isWeekOpen(cohort: Pick<Cohort, "open_week" | "starts_on">, week: number, now = new Date()): boolean {
  if (week <= cohort.open_week) return true;
  if (!cohort.starts_on) return false;
  const start = new Date(`${cohort.starts_on}T00:00:00+09:00`); // sessions are in Seoul
  const opens = new Date(start.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
  return now.getTime() >= opens.getTime();
}

// --- Week 2 labs (harness library, correction log) ---

/** One harness being edited. The six parts of SP-W2-HC. */
export interface HarnessDraftItem {
  id: string; // client-generated, stable across versions
  name: string; // e.g. "주간업무보고"
  doc_type: string; // what kind of document it produces
  role: string;
  context: string;
  format: string;
  rules: string[]; // at most 10 at submit (the ten-rule cap)
  example: string; // the learner's own finished document, confidential parts removed
  fallbacks: string;
  /**
   * harness_template.id when started from a template (D1). Provenance only:
   * sameHarness ignores it, and it is copied into harness_saved.template_id.
   */
  template_id?: string;
}

/** artifact_draft kind "harness": every harness the learner is working on. */
export interface HarnessDraft {
  version: 1;
  items: HarnessDraftItem[];
}

export interface CorrectionInput {
  harness_id: string;
  original: string;
  changed_to: string;
  recurring: boolean;
  rule_written: boolean;
}

export const HARNESS_LIMITS = {
  maxHarnesses: 12,
  /** Saves of one harness. 12 x 80 stays under the 1,000-row read in the library queries. */
  maxVersions: 80,
  maxRules: 10,
  field: 1500, // role, context, format, fallbacks
  rule: 200,
  example: 6000,
  name: 60,
} as const;

/**
 * One row of public.harness_template (migration 0011, D1). Readable by staff
 * and by learners with an active enrollment; seeded by
 * scripts/seed-harness-templates.ts from the private drafts. The text never
 * lives in this repo.
 */
export interface HarnessTemplate {
  id: string; // "SP-HL-01"
  name: string;
  doc_type: string;
  parts: {
    role: string;
    context: string;
    format: string;
    rules: string[];
    example: string;
    fallbacks: string;
  };
  sort_order: number;
  updated_at: string;
}

/** harness_template ids. */
export const HARNESS_TEMPLATE_ID = /^SP-HL-[0-9]{2}$/;

// --- Week 3 labs (phase-2c.md): workspace check, blueprint, baseline ---

/** POST /api/artifacts/workspace body. null = not answered yet (a form state, refused at submit). */
export interface WorkspaceInput {
  assistant: AssistantId | null;
  assistant_other: string;
  path: "browser" | "agent" | null;
  workspace_name: string;
  instructions_set: boolean | null;
  references_uploaded: boolean | null;
  test_followed: boolean | null;
  uploads_blocked: boolean | null;
}

export const WORKSPACE_LIMITS = {
  workspaceName: 80,
  assistantOther: 40,
} as const;

export interface BlueprintStageDraft {
  id: string; // newId("s")
  name: string;
  kind: "P" | "T" | null;
  /** Coerced to "human" when kind is "T" (parseBlueprintDraft). */
  actor: BlueprintActor | null;
  needs: string;
  harness_id: string | null;
}

export interface BlueprintCheckpointDraft {
  id: string; // newId("c")
  after_stage_id: string;
  checks: string[];
}

/** artifact_draft kind "blueprint". */
export interface BlueprintDraft {
  version: 1;
  task: string;
  source: { work_map_event_id: number | null; candidate_rank: 1 | 2 | 3 | null };
  stages: BlueprintStageDraft[];
  checkpoints: BlueprintCheckpointDraft[];
  trigger: string;
  delivery: string;
  /**
   * Part 3 timer: the instant 시작 was tapped (ISO), or null. Kept in the
   * server draft (localStorage as backup) so a tab the phone discarded while
   * the learner was in the assistant app still knows when the run started.
   */
  dry_run_started_at: string | null;
}

export const BLUEPRINT_LIMITS = {
  task: 120,
  minStages: 3,
  maxStages: 12,
  /** Soft: the session plan's typical 6 to 10. */
  softMinStages: 6,
  softMaxStages: 10,
  stageName: 80,
  needs: 300,
  maxCheckpoints: 6,
  maxChecks: 6,
  check: 200,
  trigger: 200,
  delivery: 200,
} as const;

/** artifact_draft kind "baseline". */
export interface BaselineDraft {
  version: 1;
  task: string;
  source: {
    work_map_event_id: number | null;
    candidate_rank: 1 | 2 | 3 | null;
    blueprint_event_id: number | null;
  };
  current_method_stages: string[];
  /** The chosen "before" time_log_entry event id; minutes are never typed. */
  time_log_event_id: number | null;
  frequency: { count: number | null; per: "week" | "month" };
  evidence_ref: string | null;
  quality_checklist: string[];
  /** "제가 직접 확인했어요" tick. */
  confirmed: boolean;
}

export const BASELINE_LIMITS = {
  task: 120,
  minStages: 2,
  maxStages: 12,
  stage: 120,
  minChecklist: 4,
  maxChecklist: 6,
  checklistLine: 200,
  /** Instances per week or per month. */
  maxFrequency: 100,
} as const;

/** A "before" time log entry as the baseline form and route see it. */
export interface BeforeEntry {
  id: number;
  created_at: string;
  task: string;
  started_at: string;
  ended_at: string;
  evidence_ref: string | null;
}

/** POST /api/artifacts/blueprint */
export interface BlueprintSubmitRequest {
  draft: BlueprintDraft;
}
/** POST /api/artifacts/baseline */
export interface BaselineLockRequest {
  draft: BaselineDraft;
}
/** POST /api/staff/learner/[userId]/countersign */
export interface CountersignRequest {
  /** The baseline_locked event id the staff page displayed. */
  baseline_event_id: number;
}
/** POST /api/staff/learner/[userId]/track */
export interface TrackConfirmRequest {
  track: TrackCode;
}

/**
 * Where a learner stands for week n (weekOpenForUser in queries.ts, D5).
 * "error" means the read failed: routes fail closed with 503.
 */
export type WeekGate =
  | { state: "open"; cohort: Cohort }
  | { state: "closed"; cohort: Cohort; opensOn: string | null }
  | { state: "not_enrolled" }
  | { state: "error" };
