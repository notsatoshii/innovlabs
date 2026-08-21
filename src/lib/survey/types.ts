// Core domain types for survey schema v1.1.
// Spec: survey_schema_v1_1.md — spec wins over code on conflict.

export const SCHEMA_VERSION = "1.1";

export type Path = "employee" | "solo" | "student";

/** Q5 task clusters a–h (g is baseline-only, maps to no track). */
export type TaskClusterId = "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h";

/**
 * 5-bucket hour scale index: 거의 없음 / 1–2시간 / 3–5시간 / 6–10시간 / 10시간 이상.
 * Midpoints (spec): 0 / 1.5 / 4 / 8 / 12.
 */
export type HourBucket = 0 | 1 | 2 | 3 | 4;
export const HOUR_MIDPOINTS: readonly number[] = [0, 1.5, 4, 8, 12];
export const HOUR_BUCKET_LABELS: readonly string[] = [
  "거의 없음",
  "1–2시간",
  "3–5시간",
  "6–10시간",
  "10시간 이상",
];

export type TrackId =
  | "docs_admin" // 문서·행정
  | "research_planning" // 리서치·기획
  | "data_numbers" // 데이터·수치
  | "sales_customer" // 영업·고객
  | "content_marketing" // 콘텐츠·마케팅
  | "management_coordination"; // 관리·조율 (manager-gate conditional)

export type DepthFlag = "full_agent" | "browser_only";

export type Q5Variant = "grid" | "seq";

/** Cluster → track mapping. g → null (baseline only); f competes only when the manager gate passes. */
export const CLUSTER_TRACK: Record<TaskClusterId, TrackId | null> = {
  a: "docs_admin",
  b: "research_planning",
  c: "data_numbers",
  d: "sales_customer",
  e: "content_marketing",
  f: "management_coordination",
  g: null,
  h: "docs_admin",
};

export type TaskHours = Record<TaskClusterId, HourBucket>;

export interface ScoringResult {
  scores: Record<TrackId, number>;
  managerGate: boolean;
  decision:
    | { type: "assigned"; track: TrackId }
    | { type: "choice"; topTwo: [TrackId, TrackId] };
  depthFlag: DepthFlag;
}

/**
 * Immutable survey response (spec rule 2): written exactly once at submission.
 * In Phase 1 this lives in sessionStorage; in Phase 2 it becomes the
 * insert-only `survey_response` row. No update path may exist anywhere.
 */
export interface SurveyResponse {
  schema_version: typeof SCHEMA_VERSION;
  path: Path;
  submitted_at: string; // ISO timestamp
  q5_variant: Q5Variant | null; // A/B pilot; null on non-employee paths
  org_code: string | null; // B2B partner-link entrants only
  answers: Record<string, unknown>;
  scoring: ScoringResult | null; // employee path only
}

/** Append-only event log (Phase 1 in-memory analog of `profile_event`). */
export interface ProfileEvent {
  type:
    | "fork_selected"
    | "survey_completed"
    | "track_assigned"
    | "track_overridden"
    | "stub_completed";
  at: string;
  data?: Record<string, unknown>;
}
