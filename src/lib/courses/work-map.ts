// Work Map rules (Week 1, SP-W1-WM and SP-W1-SC), shared by the editor and
// the submit route so the client and the server can never disagree.
// Source: docs/curriculum/innovlabs-spine-w1-session-plan.md, lab Parts 1–3.
// Hard errors block submission; warnings are shown and allowed (phase-2 P7).

import { TASK_CLUSTERS } from "@/lib/survey/questions";
import { HOUR_MIDPOINTS, type TaskClusterId } from "@/lib/survey/types";
import type { WorkMapSnapshot } from "@/lib/profile/types";
import type { CandidateScores, Score, WorkMapDraft, WorkMapRow } from "./types";

export const SCORE_CRITERIA: { key: keyof CandidateScores; label: string; options: [string, string, string] }[] = [
  { key: "recurs", label: "얼마나 자주 하나요?", options: ["그보다 드물게", "한 달에 한 번쯤", "매주 또는 그 이상"] },
  { key: "digital_inputs", label: "필요한 자료가 이미 파일로 있나요?", options: ["종이나 머릿속에 있어요", "일부만 있어요", "이미 다 있어요"] },
  { key: "stable_rules", label: "하는 방법을 글로 적을 수 있나요?", options: ["매번 달라요", "대체로 적을 수 있어요", "적을 수 있어요"] },
  { key: "ownership", label: "처음부터 끝까지 내 일인가요?", options: ["일부만 맡아요", "나눠서 해요", "처음부터 끝까지 내 일이에요"] },
  { key: "low_cost_wrong", label: "첫 결과가 틀려도 괜찮은가요?", options: ["바로 고객이나 부장님께 가요", "보통이에요", "내가 먼저 검토해요"] },
];

/** Categories and hours seeded from the survey (Q5 task_hours), plus the learner's extras. */
export function seedCategories(core: Record<string, unknown>): { id: string; label: string; hours_survey: number }[] {
  const raw = (core.task_hours ?? {}) as Record<string, unknown>;
  return TASK_CLUSTERS.map((c) => {
    const bucket = raw[c.id as TaskClusterId];
    const hours = typeof bucket === "number" && bucket >= 0 && bucket <= 4 ? HOUR_MIDPOINTS[bucket] : 0;
    return { id: c.id, label: c.label, hours_survey: hours };
  });
}

export function emptyDraft(): WorkMapDraft {
  return { version: 1, extraCategories: [], rows: [], candidates: [] };
}

export function totals(rows: WorkMapRow[]): { p_hours: number; t_hours: number; m_hours: number; all: number } {
  let p = 0;
  let t = 0;
  let m = 0;
  for (const r of rows) {
    const h = Number.isFinite(r.hours) ? r.hours : 0;
    if (r.kind === "P") p += h;
    else if (r.kind === "T") t += h;
    else if (r.kind === "M") m += h;
  }
  return { p_hours: round1(p), t_hours: round1(t), m_hours: round1(m), all: round1(p + t + m) };
}

export function candidateTotal(scores: CandidateScores): number | null {
  const values = Object.values(scores);
  if (values.some((v) => v === null)) return null;
  return (values as Score[]).reduce((s, v) => s + v, 0);
}

export interface WorkMapCheck {
  errors: string[]; // Korean, shown next to the submit button
  warnings: string[]; // Korean, shown but not blocking
}

export function checkWorkMap(draft: WorkMapDraft): WorkMapCheck {
  const errors: string[] = [];
  const warnings: string[] = [];
  const rows = draft.rows;

  if (rows.length === 0) errors.push("업무를 한 줄 이상 적어 주세요.");
  if (rows.some((r) => r.task.trim().length < 2)) errors.push("이름이 비어 있는 업무가 있어요.");
  if (rows.some((r) => !(r.hours > 0))) errors.push("시간이 0인 업무가 있어요. 대략이라도 적어 주세요.");
  if (rows.some((r) => r.kind === null)) errors.push("아직 분류하지 않은 업무가 있어요. P나 T를 골라 주세요.");
  if (rows.some((r) => r.kind === "M")) {
    errors.push("M(섞임)으로 남은 업무가 있어요. 처리 부분과 판단 부분, 두 줄로 나눠 주세요.");
  }

  const byId = new Map(rows.map((r) => [r.id, r]));
  if (draft.candidates.length !== 3) {
    errors.push("자동화 후보를 세 개 골라 주세요.");
  }
  const seen = new Set<string>();
  draft.candidates.forEach((c, i) => {
    const row = byId.get(c.rowId);
    const n = i + 1;
    if (!row) {
      errors.push(`후보 ${n}의 업무를 찾을 수 없어요. 다시 골라 주세요.`);
      return;
    }
    if (seen.has(c.rowId)) errors.push(`후보 ${n}이 다른 후보와 같은 업무예요.`);
    seen.add(c.rowId);
    if (row.kind !== "P") errors.push(`후보 ${n}은 P(처리) 업무여야 해요.`);
    if (row.hours < 1) errors.push(`후보 ${n}은 주 1시간 이상인 업무여야 해요.`);
    const total = candidateTotal(c.scores);
    if (total === null) errors.push(`후보 ${n}의 다섯 항목 점수를 모두 매겨 주세요.`);
    else if (total < 11) warnings.push(`후보 ${n}의 점수가 ${total}점이에요. 11점 이상이면 더 좋은 후보예요.`);
    if (n <= 2 && c.scores.ownership !== null && c.scores.ownership < 3) {
      warnings.push(`후보 ${n}은 처음부터 끝까지 내 일인 업무가 좋아요. 아니라면 3순위로 내려 보세요.`);
    }
  });
  const first = draft.candidates[0];
  if (first && first.scores.recurs !== null && first.scores.recurs < 3) {
    errors.push("후보 1은 매주 하는 업무여야 해요. 이번 주 시간 기록에 잡혀야 하거든요.");
  }

  if (rows.length > 0 && rows.length < 10) warnings.push("업무가 10줄보다 적어요. 너무 크게 묶은 건 아닌지 살펴보세요.");
  if (rows.length > 30) warnings.push("업무가 30줄을 넘어요. 너무 잘게 나눈 건 아닌지 살펴보세요.");
  const sum = totals(rows).all;
  if (rows.length > 0 && (sum < 25 || sum > 50)) {
    warnings.push(`합계가 주 ${sum}시간이에요. 보통 25~50시간 사이에 들어와요.`);
  }

  return { errors, warnings };
}

/** The immutable snapshot written to user_profile.work_map and the event payload. */
export function toSnapshot(
  draft: WorkMapDraft,
  core: Record<string, unknown>,
  submittedAt: string,
): WorkMapSnapshot {
  const categories = [
    ...seedCategories(core),
    ...draft.extraCategories.map((c) => ({ id: c.id, label: c.label, hours_survey: 0 })),
  ];
  const rows = draft.rows.map((r) => ({
    category: r.category,
    task: r.task.trim(),
    hours: r.hours,
    kind: r.kind as "P" | "T",
  }));
  const index = new Map(draft.rows.map((r, i) => [r.id, i]));
  const t = totals(draft.rows);
  return {
    version: 1,
    submitted_at: submittedAt,
    categories,
    rows,
    totals: { p_hours: t.p_hours, t_hours: t.t_hours },
    candidates: draft.candidates.map((c, i) => ({
      task_row: index.get(c.rowId) ?? -1,
      scores: c.scores as WorkMapSnapshot["candidates"][number]["scores"],
      total: candidateTotal(c.scores) ?? 0,
      rank: (i + 1) as 1 | 2 | 3,
    })),
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
