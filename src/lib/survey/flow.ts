// Employee survey step sequencing (Q5 variant + B2B conditional section).

import type { Q5Variant, TaskClusterId } from "./types";
import { TASK_CLUSTERS } from "./questions";

export type Step =
  | { kind: "question"; questionId: string; section: number }
  | { kind: "hours-grid"; section: 2 }
  | { kind: "hours-seq"; cluster: TaskClusterId; section: 2 };

export function buildSteps(q5Variant: Q5Variant, hasOrgCode: boolean): Step[] {
  const steps: Step[] = [];
  const q = (questionId: string, section: number): Step => ({
    kind: "question",
    questionId,
    section,
  });

  // Section 1 — 기본 정보
  steps.push(q("q1", 1), q("q2", 1), q("q3", 1), q("q4", 1), q("q5a", 1));

  // Section 2 — 업무 시간 분포 (Q5 A/B pilot: grid vs sequential)
  if (q5Variant === "grid") {
    steps.push({ kind: "hours-grid", section: 2 });
  } else {
    for (const cluster of TASK_CLUSTERS) {
      steps.push({ kind: "hours-seq", cluster: cluster.id, section: 2 });
    }
  }
  steps.push(q("q6", 2), q("q7", 2));

  // Section 3 — 대표 업무 심층
  steps.push(q("q8", 3), q("q9", 3));

  // Section 4 — 도구 · 환경
  steps.push(q("q10", 4), q("q11", 4), q("q12", 4), q("q13", 4), q("q14", 4));

  // Section 5 — 목표 · 기대
  steps.push(q("q15", 5), q("q16", 5), q("q17", 5), q("q18", 5));

  // Section 6 — B2B conditional (partner-link entrants only)
  if (hasOrgCode) {
    steps.push(q("qb1", 6), q("qb2", 6));
  }

  // Optional final — attribution (skippable)
  steps.push(q("attribution", hasOrgCode ? 6 : 5));

  return steps;
}
