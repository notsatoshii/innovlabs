// Courses, cohorts, and lab contracts (docs/app/phases/phase-2.md).
// Row shapes mirror supabase/migrations/0007_courses.sql. Content shapes are
// the JSON files under content/courses/. API payloads are what the routes in
// src/app/api accept and return. Import from here; never redefine.

import type { TrackCode } from "@/lib/resources/types";

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
    labHref?: "/app/lab/work-map" | "/app/lab/drill" | "/app/lab/time-log";
  }[];
  /** The real-work assignment for the week. */
  assignment: { summary: string; steps: string[]; labHref?: "/app/lab/time-log" };
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
