// One-pager generation (Phase 3) — server-side only.
// Spec rule 4: template with constrained slots, never free-form.
//   Slot 1 Mirror        <- Q8, Q9, Q6, Q7, Q3, Q1 (industry)
//   Slot 2 Week mapping  <- track + Q8 keywords + depth flag + STATIC fact sheet
//                           (the model may not invent curriculum facts)
//   Slot 3 Hedged outcome<- Q5 totals, Q15, Q18 — range + measurement framing
//                           ONLY; banned-vocabulary checked after generation
//   Slot 4 Close         <- Q16, Q15

import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { QUESTIONS, TASK_CLUSTERS } from "@/lib/survey/questions";
import { TRACKS } from "@/lib/survey/tracks";
import {
  CLUSTER_TRACK,
  HOUR_MIDPOINTS,
  type TaskClusterId,
  type TrackId,
} from "@/lib/survey/types";

export interface OnePager {
  mirror: string;
  weeks: { week: number; title: string; connection: string }[];
  outcome: string;
  closing: string;
}

/** Spec rule 4: absolute-promise vocabulary that must never appear in Slot 3. */
const BANNED_OUTCOME_WORDS = /보장|반드시|무조건|100\s*%|확실(히|하게)|틀림없/;

function optionLabel(questionId: string, optionId: unknown): string {
  if (typeof optionId !== "string") return "";
  const q = QUESTIONS[questionId];
  return q?.options?.find((o) => o.id === optionId)?.label ?? optionId;
}

function clusterLabel(id: unknown): string {
  return TASK_CLUSTERS.find((c) => c.id === id)?.label ?? "";
}

function factSheet(track: TrackId): string {
  const file = path.join(process.cwd(), "content", "tracks", `${track}.md`);
  return fs.readFileSync(file, "utf-8");
}

function buildPrompt(core: Record<string, unknown>, track: TrackId, depthFlag: string | null) {
  const taskHours = (core.task_hours ?? {}) as Partial<Record<TaskClusterId, number>>;
  const trackWeeklyHours = (Object.entries(taskHours) as [TaskClusterId, number][])
    .filter(([cluster]) => CLUSTER_TRACK[cluster] === track)
    .reduce((sum, [, bucket]) => sum + (HOUR_MIDPOINTS[bucket] ?? 0), 0);

  const profile = [
    `업종: ${optionLabel("q1", core.industry)}`,
    `직무: ${optionLabel("q3", core.department)}${core.department_other ? ` (${core.department_other})` : ""}`,
    `직급: ${optionLabel("q4", core.rank)}`,
    `주당 트랙 관련 업무 시간(자가 보고): 약 ${trackWeeklyHours}시간`,
    `가장 시간을 많이 쓰는 업무: ${clusterLabel(core.top_time_sink)}`,
    `가장 반복적인 업무: ${clusterLabel(core.most_repetitive)}`,
    `본인이 설명한 반복 업무: ${core.mirror_text ?? ""}`,
    `가장 답답한 부분: ${core.friction_text ?? ""}`,
    `학습 환경: ${depthFlag === "full_agent" ? "설치형 도구까지 활용 가능" : "브라우저 기반 도구 중심"}`,
    `가장 얻고 싶은 것: ${optionLabel("q15", core.primary_goal)}`,
    `3개월 뒤 성공의 정의: ${optionLabel("q18", core.success_definition)}`,
    `10시간이 생긴다면: ${core.ten_hours_text ?? ""}`,
    `주당 학습 가능 시간: ${optionLabel("q17", core.learning_time)}`,
  ].join("\n");

  const system = `당신은 한국 직장인 대상 AI 워크플로우 교육 과정의 맞춤 리포트 작성자입니다.
응답자의 설문 내용을 바탕으로 리포트의 네 슬롯을 작성합니다.

규칙 (반드시 준수):
1. 모든 문장은 정중한 존댓말, 따뜻하지만 전문적인 톤으로 작성합니다.
2. weeks 슬롯은 아래 제공되는 "커리큘럼 팩트 시트"에 명시된 사실만 사용합니다.
   팩트 시트에 없는 주차, 도구, 산출물, 기능을 절대 만들어내지 마세요.
3. outcome 슬롯은 범위(예: "30~50% 수준")와 측정 방법(예: "주간 소요 시간을 기록해 비교")
   프레이밍만 사용합니다. 절대적 약속 금지: "보장", "반드시", "무조건", "100%",
   "확실히" 같은 표현을 사용하지 마세요. 결과는 개인차가 있음을 자연스럽게 담습니다.
4. mirror 슬롯은 응답자가 쓴 표현을 활용해 "내 상황을 정확히 이해했다"는 느낌을 주되,
   설문에 없는 사실을 추측하지 마세요. 업종에 맞는 예시를 골라 주세요.
5. closing 슬롯은 응답자의 "10시간이 생긴다면" 답변과 목표를 연결해 2~3문장으로
   마무리합니다. 과장 없이, 구체적으로.
6. 출력은 아래 JSON 형식만 반환합니다. JSON 외의 텍스트를 출력하지 마세요.

출력 JSON 형식:
{
  "mirror": "문단 (3~4문장)",
  "weeks": [{"week": 1, "title": "주차 제목", "connection": "이 주차가 응답자의 업무와 어떻게 연결되는지 1~2문장"}, ...],
  "outcome": "문단 (2~3문장, 범위+측정 프레이밍)",
  "closing": "문단 (2~3문장)"
}`;

  const user = `## 배정된 트랙
${TRACKS[track].name} — ${TRACKS[track].oneLiner}

## 커리큘럼 팩트 시트 (weeks 슬롯은 이 내용만 사용)
${factSheet(track)}

## 응답자 프로필
${profile}

위 정보로 네 슬롯을 작성해 주세요.`;

  return { system, user };
}

function parseOnePager(raw: string): OnePager {
  const jsonStart = raw.indexOf("{");
  const jsonEnd = raw.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) throw new Error("no JSON in response");
  const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) as OnePager;
  if (
    typeof parsed.mirror !== "string" ||
    !Array.isArray(parsed.weeks) ||
    typeof parsed.outcome !== "string" ||
    typeof parsed.closing !== "string"
  ) {
    throw new Error("malformed one-pager JSON");
  }
  return parsed;
}

export async function generateOnePager(opts: {
  core: Record<string, unknown>;
  track: TrackId;
  depthFlag: string | null;
}): Promise<OnePager> {
  const client = new Anthropic(); // ANTHROPIC_API_KEY from server env
  const { system, user } = buildPrompt(opts.core, opts.track, opts.depthFlag);

  const request = (extra: string) =>
    client.messages.create({
      model: "claude-opus-5",
      max_tokens: 4096,
      system,
      messages: [{ role: "user", content: extra ? `${user}\n\n${extra}` : user }],
    });

  let response = await request("");
  let text = response.content.find((b) => b.type === "text")?.text ?? "";
  let onePager = parseOnePager(text);

  // Slot 3 vocabulary guard (spec rule 4): one strict retry, then hard fail —
  // never ship an absolute promise.
  if (BANNED_OUTCOME_WORDS.test(onePager.outcome)) {
    response = await request(
      "중요: 이전 시도에서 outcome 슬롯에 금지된 절대적 표현이 포함되었습니다. " +
        "범위와 측정 프레이밍만 사용해 다시 작성해 주세요.",
    );
    text = response.content.find((b) => b.type === "text")?.text ?? "";
    onePager = parseOnePager(text);
    if (BANNED_OUTCOME_WORDS.test(onePager.outcome)) {
      throw new Error("outcome slot failed vocabulary guard twice");
    }
  }
  return onePager;
}
