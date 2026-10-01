// Turns the profile's `core` (the survey answers, written by the browser and
// therefore untrusted) into a small, bounded set of facts for the one-pager.
//
// Review P0-4: every free-text field is capped before it can reach the prompt,
// and option ids are only ever passed through as their known labels; an
// unknown id becomes "" instead of being echoed.

import { QUESTIONS, TASK_CLUSTERS } from "@/lib/survey/questions";
import { TRACKS } from "@/lib/survey/tracks";
import { CLUSTER_TRACK, type TaskClusterId, type TrackId } from "@/lib/survey/types";

/** Hard caps (characters) on learner free text entering the prompt. */
export const TEXT_CAPS = {
  mirror_text: 1000, // Q8, a paragraph
  friction_text: 500, // Q9, one sentence
  ten_hours_text: 500, // Q16, one sentence
  department_other: 100, // Q3 "기타" follow-up
} as const;

/**
 * Q15 and Q18 are fed to the model as these phrases, not as the raw option
 * labels: two Q18 labels are themselves absolute claims ("완전히 자동화",
 * "절반으로") that the model would repeat as outcomes (review P1-9).
 */
const GOAL_PHRASES: Record<string, string> = {
  time_back: "야근을 줄이고 내 시간을 되찾는 것",
  performance: "업무 성과와 평가를 높이는 것",
  career_change: "이직이나 커리어 전환을 준비하는 것",
  side_business: "사업이나 부업을 키우는 것",
  team_productivity: "팀과 조직의 생산성을 높이는 것",
  keep_up_trends: "AI 흐름을 놓치지 않고 따라가는 것",
};

const SUCCESS_PHRASES: Record<string, string> = {
  automate_one: "반복 업무 하나를 처음부터 끝까지 자동화해 보는 것",
  halve_docs: "문서 작업에 드는 시간을 눈에 띄게 줄이는 것",
  confident_ai: "AI 도구를 자신 있게 쓰는 것",
  team_adoption: "배운 것을 팀에 도입하는 것",
  apply_business: "사업이나 부업에 실제로 적용하는 것",
};

/** Q5 bucket bounds in hours: 거의 없음 / 1–2 / 3–5 / 6–10 / 10시간 이상 (open). */
const BUCKET_LOW = [0, 1, 3, 6, 10] as const;
const BUCKET_HIGH = [0, 2, 5, 10, 10] as const;
const OPEN_BUCKET = 4;

export interface HoursFigure {
  /** Korean phrase, e.g. "9~15시간", "13~15시간 이상", "10시간 이상". */
  label: string;
  /** Normalized figure as the guard sees it: "9~15" or "10". */
  key: string;
  /** True when label contains a numeric range (low ≠ high). */
  isRange: boolean;
}

export interface LearnerFacts {
  track: TrackId;
  trackName: string;
  industry: string;
  department: string;
  departmentOther: string;
  topTimeSink: string;
  mostRepetitive: string;
  mirrorText: string;
  frictionText: string;
  tenHoursText: string;
  goal: string;
  success: string;
  depth: "full_agent" | "browser_only";
  /**
   * Weekly hours the learner reported for this track's task clusters (Q5),
   * as the range their own buckets span. Falls back to all clusters when the
   * track's clusters are all "거의 없음". null when nothing was reported.
   */
  hours: HoursFigure | null;
  /** Whether `hours` covers the track's clusters or the whole week. */
  hoursScope: "track" | "all" | null;
}

/** Collapse whitespace, drop control characters and angle brackets, cap length. */
export function cleanText(value: unknown, cap: number): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/\p{Cc}/gu, " ")
    .replace(/[<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, cap);
}

function optionLabel(questionId: string, optionId: unknown): string {
  if (typeof optionId !== "string") return "";
  return QUESTIONS[questionId]?.options?.find((o) => o.id === optionId)?.label ?? "";
}

/** Own-property lookup: `core` is untrusted, so "constructor" must not resolve. */
function phrase(table: Record<string, string>, id: unknown): string {
  return typeof id === "string" && Object.hasOwn(table, id) ? table[id] : "";
}

function clusterLabel(id: unknown): string {
  return TASK_CLUSTERS.find((c) => c.id === id)?.label ?? "";
}

function hoursFor(
  taskHours: Record<string, unknown>,
  include: (cluster: TaskClusterId) => boolean,
): HoursFigure | null {
  let low = 0;
  let high = 0;
  let open = false;
  for (const { id } of TASK_CLUSTERS) {
    if (!include(id)) continue;
    const bucket = taskHours[id];
    if (typeof bucket !== "number" || !Number.isInteger(bucket) || bucket < 0 || bucket > 4) {
      continue;
    }
    low += BUCKET_LOW[bucket];
    high += BUCKET_HIGH[bucket];
    if (bucket === OPEN_BUCKET) open = true;
  }
  if (high === 0) return null;
  const isRange = low !== high;
  const key = isRange ? `${low}~${high}` : `${low}`;
  return { key, isRange, label: `${key}시간${open ? " 이상" : ""}` };
}

export function buildLearnerFacts(
  core: Record<string, unknown>,
  track: TrackId,
  depthFlag: string | null,
): LearnerFacts {
  const rawHours = core.task_hours;
  const taskHours =
    rawHours && typeof rawHours === "object" ? (rawHours as Record<string, unknown>) : {};

  const trackHours = hoursFor(taskHours, (c) => CLUSTER_TRACK[c] === track);
  const allHours = trackHours ? null : hoursFor(taskHours, () => true);

  return {
    track,
    trackName: TRACKS[track].name,
    industry: optionLabel("q1", core.industry),
    department: optionLabel("q3", core.department),
    departmentOther: cleanText(core.department_other, TEXT_CAPS.department_other),
    topTimeSink: clusterLabel(core.top_time_sink),
    mostRepetitive: clusterLabel(core.most_repetitive),
    mirrorText: cleanText(core.mirror_text, TEXT_CAPS.mirror_text),
    frictionText: cleanText(core.friction_text, TEXT_CAPS.friction_text),
    tenHoursText: cleanText(core.ten_hours_text, TEXT_CAPS.ten_hours_text),
    goal: phrase(GOAL_PHRASES, core.primary_goal),
    success: phrase(SUCCESS_PHRASES, core.success_definition),
    depth: depthFlag === "full_agent" ? "full_agent" : "browser_only",
    hours: trackHours ?? allHours,
    hoursScope: trackHours ? "track" : allHours ? "all" : null,
  };
}
