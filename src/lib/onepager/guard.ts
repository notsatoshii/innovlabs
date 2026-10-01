// Validation of model-written one-pager text (CLAUDE.md rule 4, review P0-3 and
// P1-9). Pure functions, no I/O.
//
// Every slot (mirror, each week sentence, outcome, closing) goes through the
// same promise / figure / curriculum checks. Slot 3 (outcome) additionally has
// to contain a range and say how the change is measured. A slot that fails is
// retried once by the caller and then replaced with a template (./fallback.ts).
//
// The checks are deliberately strict: a false positive costs one templated
// slot, a false negative ships a promise or an invented curriculum fact.

import { TOTAL_WEEKS, VALID_WEEKS } from "./curriculum";
import type { HoursFigure } from "./learner";

export type SlotKind = "mirror" | "week" | "outcome" | "closing";

export type Violation =
  | "empty" // missing, not a string, or no Korean text
  | "length" // outside the slot's length bounds
  | "markup" // line breaks survive as markup, links, emoji, list or code symbols
  | "sentences" // a week slot with more than one sentence
  | "promise" // 보장 / 반드시 / 확실히 / 무조건 and the rest of the list
  | "percent" // any percentage
  | "figure" // an hour, minute, or month figure the code did not supply
  | "saving" // a time figure stated as a saving
  | "week" // a week number that is not in structure.json
  | "duration" // a course length other than the real one
  | "term" // a Latin-script name found in neither the facts nor the answers
  | "no_range" // outcome only: no range, or not the supplied one
  | "no_measurement"; // outcome only: does not say how it is measured

export interface GuardContext {
  /** The learner's own reported weekly hours, the only hour figure the code supplies. */
  hours: HoursFigure | null;
  /** Numbers that appear in the learner's own free text (mirror may repeat them). */
  learnerNumbers: ReadonlySet<string>;
  /** Lowercased Latin-script tokens that appear in the facts or the answers. */
  allowedTerms: ReadonlySet<string>;
}

const LENGTH: Record<SlotKind, [number, number]> = {
  mirror: [60, 700],
  week: [10, 160],
  outcome: [60, 600],
  closing: [30, 450],
};

/**
 * Absolute-promise vocabulary (spec: no 보장/반드시; the review adds the rest).
 * 절반 and "N배" are here because Q18's own option text says "절반으로".
 */
const PROMISE =
  /보장|반드시|무조건|확실|틀림없|장담|약속\s*(?:드|합|해|할)|완전히|완벽|절대|100\s*[%％]|백\s*퍼센트|절반|(?<![가-힣])반으로|(?:\d+|두|세|네|몇)\s*배(?=[로가의나를은는도,.\s]|$)/;

const PERCENT = /[%％]|퍼센트/;
const MARKUP = /[<>{}\[\]`*#|\\]|https?:|www\.|\p{Extended_Pictographic}/u;
const HANGUL = /[가-힣]/;
const DASH = "[~∼～\\-–—]";
const NUM = "\\d+(?:\\.\\d+)?";

const HOURS = new RegExp(`(${NUM})(?:\\s*${DASH}\\s*(${NUM}))?\\s*시간`, "g");
// "분" after a digit is minutes or a fraction ("3분의 1"); "1분기" is a quarter.
const MINUTES = new RegExp(`(${NUM})\\s*분(?!기)`, "g");
const MONTHS = /(\d+)\s*개월/g;
const WEEK = new RegExp(`(?:(\\d+)\\s*${DASH}\\s*)?(\\d+)\\s*주`, "g");
const DURATION = /(\d+)\s*주\s*(?:짜리|과정|코스|프로그램|커리큘럼|완성|만에)/g;
const RANGE = new RegExp(`\\d+\\s*${DASH}\\s*\\d+`);
const MEASUREMENT = /기록|측정|비교|다시\s*재/;
const LATIN = /[A-Za-z][A-Za-z0-9+.#-]*/g;

const SAVING_VERB = "(?:줄(?:이|일|여|어|였|\\s*수)|절약|단축|절감|아끼|아낄|아껴|확보)";
const TIME_FIGURE = `\\d+(?:\\s*${DASH}\\s*\\d+)?\\s*(?:시간|분)`;
const SAVING = new RegExp(
  `${TIME_FIGURE}[^.!?\\n]{0,12}${SAVING_VERB}|${SAVING_VERB}[^.!?\\n]{0,10}${TIME_FIGURE}`,
);

/** The one planning horizon the product talks about (Q18: "3개월 뒤"). */
const MONTH_HORIZON = "3";

/** Collapse all whitespace to single spaces. Model text is stored in this form. */
export function tidy(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

/** Lowercased Latin-script tokens in a text (tool and product names, acronyms). */
export function latinTerms(text: string): string[] {
  return (text.match(LATIN) ?? []).map((t) => t.replace(/[.-]+$/, "").toLowerCase());
}

/** Every number in a text, as written. */
export function numbersIn(text: string): string[] {
  return text.match(/\d+(?:\.\d+)?/g) ?? [];
}

function hoursAllowed(kind: SlotKind, a: string, b: string | undefined, ctx: GuardContext) {
  const key = b === undefined ? a : `${a}~${b}`;
  if (kind === "mirror" || kind === "outcome") {
    if (ctx.hours && ctx.hours.key === key) return true;
  }
  if (kind === "mirror") {
    return ctx.learnerNumbers.has(a) && (b === undefined || ctx.learnerNumbers.has(b));
  }
  return false;
}

/**
 * Returns the violations in one slot's text. `text` must already be tidy().
 * An empty array means the text may be shown.
 */
export function checkSlot(kind: SlotKind, text: string, ctx: GuardContext): Violation[] {
  if (!text || !HANGUL.test(text)) return ["empty"];

  const found = new Set<Violation>();
  const [min, max] = LENGTH[kind];
  if (text.length < min || text.length > max) found.add("length");
  if (MARKUP.test(text)) found.add("markup");
  if (kind === "week" && /[.!?。]\s+\S/.test(text)) found.add("sentences");

  if (PROMISE.test(text)) found.add("promise");
  if (PERCENT.test(text)) found.add("percent");
  if (SAVING.test(text)) found.add("saving");

  for (const m of text.matchAll(HOURS)) {
    if (!hoursAllowed(kind, m[1], m[2], ctx)) found.add("figure");
  }
  for (const m of text.matchAll(MINUTES)) {
    if (!(kind === "mirror" && ctx.learnerNumbers.has(m[1]))) found.add("figure");
  }
  for (const m of text.matchAll(MONTHS)) {
    const own = kind === "mirror" && ctx.learnerNumbers.has(m[1]);
    if (m[1] !== MONTH_HORIZON && !own) found.add("figure");
  }

  for (const m of text.matchAll(WEEK)) {
    if (m[1] !== undefined && !VALID_WEEKS.has(Number(m[1]))) found.add("week");
    if (!VALID_WEEKS.has(Number(m[2]))) found.add("week");
  }
  for (const m of text.matchAll(DURATION)) {
    if (Number(m[1]) !== TOTAL_WEEKS) found.add("duration");
  }

  for (const term of latinTerms(text)) {
    if (term && !ctx.allowedTerms.has(term)) found.add("term");
  }

  if (kind === "outcome") {
    const hourKeys = [...text.matchAll(HOURS)].map((m) =>
      m[2] === undefined ? m[1] : `${m[1]}~${m[2]}`,
    );
    const hasRange = ctx.hours?.isRange ? hourKeys.includes(ctx.hours.key) : RANGE.test(text);
    if (!hasRange) found.add("no_range");
    if (!MEASUREMENT.test(text)) found.add("no_measurement");
  }

  return [...found];
}

/** Korean description of a violation, used only in the retry note to the model. */
export const VIOLATION_NOTE: Record<Violation, string> = {
  empty: "내용이 비어 있음",
  length: "분량이 정해진 범위를 벗어남",
  markup: "줄바꿈, 기호, 링크, 이모지 같은 문장이 아닌 요소가 있음",
  sentences: "한 문장이어야 하는데 여러 문장임",
  promise: "결과를 약속하거나 단정하는 표현이 있음",
  percent: "퍼센트 수치가 있음",
  figure: "'쓸 수 있는 수치'에 없는 시간·분·개월 수치가 있음",
  saving: "시간 수치를 줄어드는 양처럼 말함",
  week: "과정에 없는 주차를 말함",
  duration: "과정 길이를 다르게 말함",
  term: "자료와 답변에 없는 영문 이름이 있음",
  no_range: "'쓸 수 있는 수치'의 범위(없으면 11~12주 차)가 그대로 들어 있지 않음",
  no_measurement: "어떻게 재서 비교하는지가 없음",
};
