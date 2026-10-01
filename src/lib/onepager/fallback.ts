// Templated slot text, used when a model-written slot fails the guard twice
// (or the model's answer is unusable). Built only from option labels the code
// already knows and from static curriculum facts: no learner free text, no
// figure other than the learner's own reported hours. The page never fails
// because of a guard violation; it degrades to these.

import { TOTAL_WEEKS } from "./curriculum";
import type { LearnerFacts } from "./learner";

/** True when the last Hangul syllable of `word` ends in a consonant (받침). */
function hasBatchim(word: string): boolean {
  for (let i = word.length - 1; i >= 0; i--) {
    const code = word.charCodeAt(i);
    if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 !== 0;
  }
  return false;
}

/** Picks the object particle for a quoted label: ‘…’을 / ‘…’를. */
function eul(word: string): string {
  return hasBatchim(word) ? "을" : "를";
}

function hoursSentence(facts: LearnerFacts): string {
  if (!facts.hours) return "";
  const scope =
    facts.hoursScope === "track" ? "이 트랙과 관련된 업무에는" : "설문에서 답하신 업무 전체에는";
  // "10시간 이상" already reads as an estimate; a closed range takes "정도".
  const amount = facts.hours.label.endsWith("이상")
    ? `${facts.hours.label}을`
    : `${facts.hours.label} 정도를`;
  return `${scope} 일주일에 ${amount} 쓰신다고 답하셨어요.`;
}

export function fallbackMirror(facts: LearnerFacts): string {
  const parts: string[] = [];
  if (facts.industry && facts.industry !== "기타") {
    parts.push(`${facts.industry} 업종에서 일하고 계시다고 답해 주셨어요.`);
  }
  if (facts.topTimeSink) {
    parts.push(
      `한 주 중 시간이 가장 많이 드는 업무로는 ‘${facts.topTimeSink}’${eul(facts.topTimeSink)} 꼽으셨어요.`,
    );
  }
  if (facts.mostRepetitive) {
    parts.push(
      facts.mostRepetitive === facts.topTimeSink
        ? "가장 반복적으로 느껴지는 업무도 같다고 하셨고요."
        : `가장 반복적으로 느껴지는 업무로는 ‘${facts.mostRepetitive}’${eul(facts.mostRepetitive)} 고르셨어요.`,
    );
  }
  const hours = hoursSentence(facts);
  if (hours) parts.push(hours);
  parts.push(
    `아래에는 이 답변을 바탕으로 ${facts.trackName}의 ${TOTAL_WEEKS}주가 내 업무와 어떻게 이어지는지 정리했어요.`,
  );
  return parts.join(" ");
}

export function fallbackOutcome(facts: LearnerFacts): string {
  const parts: string[] = [];
  const hours = hoursSentence(facts);
  parts.push(hours || "이 과정은 변화를 느낌이 아니라 기록으로 확인해요.");
  parts.push(
    "3주 차에 내 업무 하나를 골라 지금 방식의 결과물과 걸린 시간을 기준선으로 남기고, 11~12주 차 캡스톤에서 같은 업무를 같은 품질 체크리스트로 다시 재서 전과 후를 비교해요.",
  );
  parts.push(
    "얼마나 달라지는지는 업무와 사람에 따라 다르기 때문에, 숫자를 미리 말씀드리기보다 직접 잰 기록으로 확인하실 수 있게 해요.",
  );
  return parts.join(" ");
}

export function fallbackClosing(facts: LearnerFacts): string {
  const parts: string[] = [];
  if (facts.goal) {
    parts.push(`이 과정에서 가장 얻고 싶은 것으로 ‘${facts.goal}’${eul(facts.goal)} 꼽아 주셨어요.`);
  }
  parts.push(
    `${TOTAL_WEEKS}주 동안 내 실제 업무를 가지고 하나씩 만들어 가면서, 그 방향으로 얼마나 왔는지 직접 확인해 보시면 좋겠어요.`,
  );
  if (facts.tenHoursText) {
    parts.push("여유가 생기면 하고 싶다고 적어 주신 일에도 조금씩 가까워지기를 바라요.");
  }
  return parts.join(" ");
}
