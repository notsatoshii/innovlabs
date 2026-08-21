// Routing logic v1.1 (employee path) — pure functions, no UI/storage deps.
// Spec: survey_schema_v1_1.md "Routing Logic v1.1". Spec wins on conflict.

import {
  CLUSTER_TRACK,
  HOUR_MIDPOINTS,
  type DepthFlag,
  type ScoringResult,
  type TaskClusterId,
  type TaskHours,
  type TrackId,
} from "./types";

// Option ids referenced by the rules (must match questions.ts).
export type RankId = "staff" | "assistant" | "manager_mid" | "team_lead" | "executive";
export type MgmtScopeId = "none" | "scope_1_3" | "scope_4_10" | "scope_10_plus";
export type DepartmentId =
  | "admin_hr"
  | "planning_strategy"
  | "marketing_content"
  | "sales_cs"
  | "data_analysis"
  | "finance_accounting"
  | "dev_it"
  | "production_logistics"
  | "other";
export type AiPolicyId = "free" | "approved_only" | "restricted" | "unknown";
export type PcEnvId = "install_free" | "browser_only" | "personal_device" | "unknown";

/**
 * Department prior (+1) mapping — Q3 [R-prior +1].
 * NOTE: the spec marks Q3 as a +1 prior but does not enumerate the mapping.
 * This table is a judgment call flagged for product review.
 */
export const DEPARTMENT_PRIOR: Record<DepartmentId, TrackId | null> = {
  admin_hr: "docs_admin",
  planning_strategy: "research_planning",
  marketing_content: "content_marketing",
  sales_cs: "sales_customer",
  data_analysis: "data_numbers",
  finance_accounting: "data_numbers",
  dev_it: "data_numbers",
  production_logistics: "docs_admin",
  other: null,
};

export interface ScoringInput {
  taskHours: TaskHours; // Q5
  topTimeSink: TaskClusterId; // Q6
  mostRepetitive: TaskClusterId; // Q7
  department: DepartmentId; // Q3
  rank: RankId; // Q4
  mgmtScope: MgmtScopeId; // Q5-a
  aiPolicy: AiPolicyId; // Q12
  pcEnv: PcEnvId; // Q13
}

/** Gate: IF (Q5-a ≥ 4–10명 OR Q4 ≥ 팀장) AND Q5f ≥ 6시간 → 관리·조율 competes. */
export function managerGate(input: ScoringInput): boolean {
  const seniorRank = input.rank === "team_lead" || input.rank === "executive";
  const wideScope = input.mgmtScope === "scope_4_10" || input.mgmtScope === "scope_10_plus";
  const meetingHours = input.taskHours.f >= 3; // bucket 3 = 6–10시간
  return (wideScope || seniorRank) && meetingHours;
}

/** Depth flag: full_agent IF Q13 ∈ {설치 자유, 개인 장비 병행} AND Q12 ≠ 제한적. */
export function depthFlag(input: ScoringInput): DepthFlag {
  const envOk = input.pcEnv === "install_free" || input.pcEnv === "personal_device";
  const policyOk = input.aiPolicy !== "restricted";
  return envOk && policyOk ? "full_agent" : "browser_only";
}

export function scoreSurvey(input: ScoringInput): ScoringResult {
  const gate = managerGate(input);

  const scores: Record<TrackId, number> = {
    docs_admin: 0,
    research_planning: 0,
    data_numbers: 0,
    sales_customer: 0,
    content_marketing: 0,
    management_coordination: 0,
  };

  const competes = (track: TrackId | null): track is TrackId =>
    track !== null && (track !== "management_coordination" || gate);

  // Base: Q5 hour midpoints into track buckets.
  for (const [cluster, bucket] of Object.entries(input.taskHours) as [
    TaskClusterId,
    number,
  ][]) {
    const track = CLUSTER_TRACK[cluster];
    if (competes(track)) scores[track] += HOUR_MIDPOINTS[bucket];
  }

  // Boosts: +2 Q6 track, +1 Q7 track, +1 department prior.
  const q6Track = CLUSTER_TRACK[input.topTimeSink];
  if (competes(q6Track)) scores[q6Track] += 2;
  const q7Track = CLUSTER_TRACK[input.mostRepetitive];
  if (competes(q7Track)) scores[q7Track] += 1;
  const prior = DEPARTMENT_PRIOR[input.department];
  if (competes(prior)) scores[prior] += 1;

  // Decision: top ≥ 1.5 × second → assign; else top-two user choice on teaser.
  const ranked = (Object.entries(scores) as [TrackId, number][])
    .filter(([track]) => track !== "management_coordination" || gate)
    .sort((x, y) => y[1] - x[1]);
  const [top, second] = ranked;

  const decision: ScoringResult["decision"] =
    top[1] > 0 && top[1] >= 1.5 * second[1]
      ? { type: "assigned", track: top[0] }
      : { type: "choice", topTwo: [top[0], second[0]] };

  return { scores, managerGate: gate, decision, depthFlag: depthFlag(input) };
}

/** Weekly hours the respondent reported on clusters belonging to `track` (teaser stat). */
export function weeklyHoursForTrack(taskHours: TaskHours, track: TrackId): number {
  let total = 0;
  for (const [cluster, bucket] of Object.entries(taskHours) as [TaskClusterId, number][]) {
    if (CLUSTER_TRACK[cluster] === track) total += HOUR_MIDPOINTS[bucket];
  }
  return total;
}
