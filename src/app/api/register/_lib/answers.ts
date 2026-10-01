// Shape checks on a stored survey_response.answers object, done on the server
// before a profile is built from it. The row was inserted anonymously from a
// browser, so nothing about it is taken on trust: the employee answers are
// re-read into a ScoringInput (and re-scored by the route), the 학원 answers
// get the same minimal check 나의 AI 교육 applies before it scores them.

import type {
  AiPolicyId,
  DepartmentId,
  MgmtScopeId,
  PcEnvId,
  RankId,
  ScoringInput,
} from "@/lib/survey/scoring";
import type { HourBucket, TaskClusterId, TaskHours } from "@/lib/survey/types";

// Option ids, kept equal to src/lib/survey/questions.ts (and the id types in
// scoring.ts, which `satisfies` enforces at compile time).
const CLUSTERS = ["a", "b", "c", "d", "e", "f", "g", "h"] as const satisfies readonly TaskClusterId[];
const DEPARTMENTS = [
  "admin_hr",
  "planning_strategy",
  "marketing_content",
  "sales_cs",
  "data_analysis",
  "finance_accounting",
  "dev_it",
  "production_logistics",
  "other",
] as const satisfies readonly DepartmentId[];
const RANKS = ["staff", "assistant", "manager_mid", "team_lead", "executive"] as const satisfies readonly RankId[];
const MGMT_SCOPES = ["none", "scope_1_3", "scope_4_10", "scope_10_plus"] as const satisfies readonly MgmtScopeId[];
const AI_POLICIES = ["free", "approved_only", "restricted", "unknown"] as const satisfies readonly AiPolicyId[];
const PC_ENVS = ["install_free", "browser_only", "personal_device", "unknown"] as const satisfies readonly PcEnvId[];

function oneOf<T extends string>(list: readonly T[], value: unknown): T | null {
  return typeof value === "string" && (list as readonly string[]).includes(value) ? (value as T) : null;
}

/** The eight routing inputs (Q3, Q4, Q5-a, Q5, Q6, Q7, Q12, Q13), or null when any is missing or off-list. */
export function parseScoringInput(answers: Record<string, unknown>): ScoringInput | null {
  const hours = answers.task_hours;
  if (!hours || typeof hours !== "object" || Array.isArray(hours)) return null;
  const taskHours = {} as TaskHours;
  for (const cluster of CLUSTERS) {
    const bucket = (hours as Record<string, unknown>)[cluster];
    if (typeof bucket !== "number" || !Number.isInteger(bucket) || bucket < 0 || bucket > 4) return null;
    taskHours[cluster] = bucket as HourBucket;
  }

  const topTimeSink = oneOf(CLUSTERS, answers.top_time_sink);
  const mostRepetitive = oneOf(CLUSTERS, answers.most_repetitive);
  const department = oneOf(DEPARTMENTS, answers.department);
  const rank = oneOf(RANKS, answers.rank);
  const mgmtScope = oneOf(MGMT_SCOPES, answers.mgmt_scope);
  const aiPolicy = oneOf(AI_POLICIES, answers.ai_policy);
  const pcEnv = oneOf(PC_ENVS, answers.pc_env);
  if (!topTimeSink || !mostRepetitive || !department || !rank || !mgmtScope || !aiPolicy || !pcEnv) {
    return null;
  }
  return { taskHours, topTimeSink, mostRepetitive, department, rank, mgmtScope, aiPolicy, pcEnv };
}

/** Same minimal check as HagwonEducation: enough for scoreHagwon not to throw. */
export function looksLikeHagwonAnswers(answers: Record<string, unknown>): boolean {
  const q4 = answers.q4;
  if (!Array.isArray(q4) || q4.length !== 3 || !q4.every((v) => typeof v === "string")) return false;
  if (!Array.isArray(answers.q1) || typeof answers.q0 !== "string") return false;
  return ["q2_teachers", "q5a", "q6a", "q7a", "q8a"].every((key) => typeof answers[key] === "number");
}
