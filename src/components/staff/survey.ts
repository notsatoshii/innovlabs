// Staff view of a learner's survey answers, read from user_profile.core (the
// snapshot seeded at registration; survey_response itself has no select
// policy). Employee path: labelled rows. Other paths: raw key and value.
//
// FIELDS mirrors FIELD_BY_QUESTION in src/components/survey/SurveyFlow.tsx
// (not exported there); the option labels come from the question definitions.

import { QUESTIONS, TASK_CLUSTERS } from "@/lib/survey/questions";
import { HOUR_BUCKET_LABELS } from "@/lib/survey/types";

const FIELDS: { field: string; question: string; label: string }[] = [
  { field: "industry", question: "q1", label: "업종" },
  { field: "company_size", question: "q2", label: "회사 규모" },
  { field: "department", question: "q3", label: "직무" },
  { field: "rank", question: "q4", label: "직급" },
  { field: "mgmt_scope", question: "q5a", label: "관리 범위" },
  { field: "top_time_sink", question: "q6", label: "시간이 가장 많이 드는 업무" },
  { field: "most_repetitive", question: "q7", label: "가장 반복적인 업무" },
  { field: "mirror_text", question: "q8", label: "매주 반복하는 업무 (직접 작성)" },
  { field: "friction_text", question: "q9", label: "그 업무에서 답답한 점" },
  { field: "ai_maturity", question: "q10", label: "AI 활용 정도" },
  { field: "tools_used", question: "q11", label: "써 본 AI 도구" },
  { field: "ai_policy", question: "q12", label: "회사의 AI 사용 분위기" },
  { field: "pc_env", question: "q13", label: "업무용 PC 환경" },
  { field: "work_stack", question: "q14", label: "협업 도구" },
  { field: "primary_goal", question: "q15", label: "가장 얻고 싶은 것" },
  { field: "ten_hours_text", question: "q16", label: "주 10시간이 생긴다면" },
  { field: "learning_time", question: "q17", label: "주당 학습 가능 시간" },
  { field: "success_definition", question: "q18", label: "3개월 뒤 성공의 기준" },
  { field: "org_dept", question: "qb1", label: "소속 부서" },
  { field: "org_team", question: "qb2", label: "소속 팀" },
  { field: "attribution", question: "attribution", label: "알게 된 경로" },
];

function optionLabel(question: string, id: unknown): string {
  if (typeof id !== "string") return "";
  return QUESTIONS[question]?.options?.find((o) => o.id === id)?.label ?? id;
}

export interface SurveyRow {
  label: string;
  value: string;
}

/** Answered questions only, in survey order (Q5 hours are separate). */
export function employeeSurveyRows(core: Record<string, unknown>): SurveyRow[] {
  const rows: SurveyRow[] = [];
  for (const { field, question, label } of FIELDS) {
    const raw = core[field];
    let value = "";
    if (Array.isArray(raw)) {
      value = raw.map((id) => optionLabel(question, id)).filter(Boolean).join(", ");
    } else if (typeof raw === "string") {
      const isChoice = QUESTIONS[question]?.type !== "text";
      value = isChoice ? optionLabel(question, raw) : raw.trim();
      const other = core[`${field}_other`];
      if (isChoice && typeof other === "string" && other.trim()) {
        value = `${value.replace(" (직접 입력)", "")}: ${other.trim()}`;
      }
    }
    if (value) rows.push({ label, value });
  }
  return rows;
}

/** Q5: weekly hours per task category as the learner answered them. */
export function taskHourRows(core: Record<string, unknown>): { id: string; label: string; hours: string }[] {
  const raw = core.task_hours;
  if (!raw || typeof raw !== "object") return [];
  const hours = raw as Record<string, unknown>;
  return TASK_CLUSTERS.flatMap((cluster) => {
    const bucket = hours[cluster.id];
    if (typeof bucket !== "number" || !Number.isInteger(bucket)) return [];
    const label = HOUR_BUCKET_LABELS[bucket];
    return label ? [{ id: cluster.id, label: cluster.label, hours: label }] : [];
  });
}

/** Fallback for paths without a labelled summary: every stored answer as text. */
export function rawSurveyRows(core: Record<string, unknown>): SurveyRow[] {
  return Object.entries(core).map(([key, value]) => ({
    label: key,
    value: typeof value === "string" ? value : JSON.stringify(value) ?? "",
  }));
}
