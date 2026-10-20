// XP rules for the online course (game design §2 "Scoring in 해보기 beats",
// §3.1; phase-online.md O1-D4). PURE: no I/O. The routes load the mission
// and the learner's prior course_xp rows for it, call these functions, and
// write what they return. The client never sends an amount.
//
// Item keys (course_xp.item, unique per user and mission, max 80 chars):
//   single-answer item (I2, I6, I7, seam)   <interactionId>
//   I1 card, first try / retry               <iid>.<cardKey> / <iid>.<cardKey>#2
//   I4 criterion c (1–5), first try / retry  <iid>.<rowKey>.<c> / ...#2
//   I3 found / a wrong tap                   <iid> / <iid>#tap<N>   (a neutral tap is not stored)
//   step (I8, I9, I10, I11, terms)           <iid>
//   skip-test credit                         skip:<any of the above, first try>
//
// The request's itemKey for I1 is "<cardKey>" or "<cardKey>#2" (the retry),
// for I4 "<rowKey>.<c>" or "<rowKey>.<c>#2". A replayed request computes
// the same item key and pays nothing: the routes rely on the unique index.

import type {
  CourseXpRow,
  I1Sort,
  I3Spot,
  I4Score,
  I7Choose,
  I9MyTask,
  Interaction,
  ItemXp,
  MissionContent,
  Screen,
  SkipRequest,
  XpPart,
} from "./types";
import type { Round2Card } from "@/lib/courses/types";

export const SKIP_PREFIX = "skip:";
/** Wrong taps on one I3 that are still recorded; later ones are answered but not stored. */
export const MAX_WRONG_TAPS = 20;
/** Skip test: the set's expected length, shown as a clock only. It is not a
 *  pass rule (L1 review 2026-10-21: no timer on judgement questions). */
export const SKIP_TEST_SECONDS = 180;
/** Skip test: the I3 must be found within this many taps. */
export const SKIP_TEST_TAPS = 2;

export type PriorRow = Pick<CourseXpRow, "id" | "item" | "part" | "amount" | "correct">;

export const ANSWER_TYPES: ReadonlySet<Interaction["type"]> = new Set(["I1", "I2", "I3", "I4", "I6", "I7", "seam"]);
export const STEP_TYPES: ReadonlySet<Interaction["type"]> = new Set(["I8", "I9", "I10", "I11", "terms"]);

// --- Walking a mission --------------------------------------------------------

export interface Located {
  interaction: Interaction;
  screen: Screen;
  screenIndex: number;
}

/** Every interaction of the mission in screen order (fallback blocks included). */
export function missionInteractions(mission: MissionContent): Located[] {
  const out: Located[] = [];
  mission.screens.forEach((screen, screenIndex) => {
    const walk = (blocks: Screen["blocks"]) => {
      for (const b of blocks) {
        if (b.t === "i") out.push({ interaction: b.i, screen, screenIndex });
        else if (b.t === "fallback") walk(b.blocks);
      }
    };
    walk(screen.blocks);
  });
  return out;
}

export function locateInteraction(mission: MissionContent, id: string): Located | null {
  return missionInteractions(mission).find((x) => x.interaction.id === id) ?? null;
}

// --- Totals -------------------------------------------------------------------

export interface CappedTotals {
  parts: Record<XpPart, { got: number; cap: number }>;
  total: number;
  max: number;
}

/** Per part min(sum, cap) and the mission total. Rows of parts without a cap count 0. */
export function cappedTotals(mission: MissionContent, rows: Pick<CourseXpRow, "part" | "amount">[]): CappedTotals {
  const parts: CappedTotals["parts"] = {};
  let max = 0;
  for (const [part, cap] of Object.entries(mission.caps)) {
    parts[part] = { got: 0, cap };
    max += cap;
  }
  const sums: Record<string, number> = {};
  for (const r of rows) sums[r.part] = (sums[r.part] ?? 0) + Math.max(0, r.amount);
  let total = 0;
  for (const [part, p] of Object.entries(parts)) {
    p.got = Math.min(sums[part] ?? 0, p.cap);
    total += p.got;
  }
  return { parts, total, max };
}

// --- Scoring --------------------------------------------------------------------

export interface Award {
  item: string;
  part: XpPart;
  correct: boolean | null;
  amount: number;
  combo?: 1 | 2 | 3;
  /** A first-try miss on I1/I4: the item comes back once. */
  retry?: boolean;
  /** False when nothing is to be written (a replay, a skip-credited item, a tap past the cap). */
  insert: boolean;
  /** The same item was answered before; amount is 0. */
  replay?: boolean;
}

export type ScoreError =
  | "not_answer_item" // the interaction is a step, not an answer
  | "bad_item" // itemKey missing, unknown, or given where none is expected
  | "bad_answer" // the answer has the wrong shape or is not an option
  | "retry_not_allowed"; // "#2" without a wrong first try

export type ScoreResult = { ok: true; award: Award } | { ok: false; error: ScoreError };

export interface ScoreInput {
  mission: MissionContent;
  interaction: Interaction;
  /** The beat of the screen holding the interaction (part for unpriced choices). */
  beat: XpPart;
  itemKey?: string;
  answer: unknown;
  /** The learner's course_xp rows for this mission. */
  prior: PriorRow[];
}

function comboFor(position: number): 1 | 2 | 3 {
  if (position >= 8) return 3;
  if (position >= 4) return 2;
  return 1;
}

/** First-try rights in a row at the end of this interaction's first tries. */
function streakBefore(prior: PriorRow[], firstItems: ReadonlySet<string>): number {
  const rows = prior.filter((r) => firstItems.has(r.item)).sort((a, b) => a.id - b.id);
  let n = 0;
  for (let k = rows.length - 1; k >= 0; k--) {
    if (rows[k].correct === true) n++;
    else break;
  }
  return n;
}

function byItem(prior: PriorRow[]): Map<string, PriorRow> {
  return new Map(prior.map((r) => [r.item, r]));
}

function replayOf(row: PriorRow): Award {
  return { item: row.item, part: row.part, correct: row.correct, amount: 0, insert: false, replay: true };
}

function choiceValue(answer: unknown): string | null {
  return typeof answer === "string" && answer.length > 0 && answer.length <= 40 ? answer : null;
}

function intValue(answer: unknown): number | null {
  if (typeof answer === "number" && Number.isInteger(answer)) return answer;
  if (typeof answer === "string" && /^[0-9]{1,3}$/.test(answer)) return Number(answer);
  return null;
}

function singleAmount(xp: ItemXp | undefined, correct: boolean | null): number {
  if (!xp) return 0;
  if (correct === false) return xp.wrong ?? 0;
  return xp.right;
}

/**
 * I3: the line for a tap on a neutral unit (a value computed from the
 * material, such as OUT-B's +8% cell), or null. A neutral tap is never a
 * wrong tap: it counts toward no hint and no skip-test tap (L1 review).
 */
export function neutralLine(it: Pick<I3Spot, "neutral" | "target">, tap: string): string | null {
  const t = tap.replace(/\s+/g, "");
  if (!t || !it.neutral || isSpotHit(tap, it.target)) return null;
  const hit = it.neutral.find((n) => {
    const f = n.find.replace(/\s+/g, "");
    return f.length > 0 && t.includes(f);
  });
  return hit ? hit.line : null;
}

/** Values a "work_map_rows" I7 with xp takes: the row's mark kept or flipped (the pick itself posts nothing). */
export const ROW_CHECK_VALUES: readonly string[] = ["ok", "flip"];

/** The record an I7 pays on (`evidence`): the answer route checks for it before paying. */
export function evidenceOf(it: Interaction): I7Choose["evidence"] | null {
  return it.type === "I7" && it.evidence ? it.evidence : null;
}

/** I3: the tap is the planted sentence (or a 2+ char piece of the planted phrase). */
export function isSpotHit(tap: string, target: string): boolean {
  const t = tap.trim();
  if (t.length === 0 || t.length > 300 || /[\r\n]/.test(t)) return false;
  return t.includes(target) || (t.length >= 2 && target.includes(t));
}

export function scoreAnswer(input: ScoreInput): ScoreResult {
  const { interaction: it, prior } = input;
  const items = byItem(prior);

  switch (it.type) {
    case "I1":
    case "I4":
      return scoreCombo(input, it);
    case "I3":
      return scoreSpot(it, input.itemKey, input.answer, prior);
    case "I2":
    case "I6":
    case "I7":
    case "seam": {
      if (input.itemKey) return { ok: false, error: "bad_item" };
      let correct: boolean | null;
      let xp: ItemXp | undefined;
      if (it.type === "I2" || it.type === "I6") {
        const v = choiceValue(input.answer);
        const values = it.type === "I2" ? it.docs.map((d) => d.v) : it.options.map((o) => o.v);
        if (v === null || !values.includes(v)) return { ok: false, error: "bad_answer" };
        correct = v === it.answer;
        xp = it.xp;
      } else if (it.type === "I7") {
        const values = new Set(it.from === "work_map_rows" ? ROW_CHECK_VALUES : it.options.map((o) => o.v));
        const pick = it.pick ?? 1;
        const given = Array.isArray(input.answer) ? input.answer : [input.answer];
        const picked = given.map(choiceValue);
        if (picked.length !== pick || picked.some((v) => v === null || !values.has(v))) {
          return { ok: false, error: "bad_answer" };
        }
        if (new Set(picked).size !== picked.length) return { ok: false, error: "bad_answer" };
        if (it.answer === undefined) correct = null;
        else {
          const want = Array.isArray(it.answer) ? it.answer : [it.answer];
          correct = want.length === picked.length && want.every((v) => picked.includes(v));
        }
        xp = it.xp;
      } else {
        const gap = intValue(input.answer);
        if (gap === null || gap < 0 || gap > it.chunks.length) return { ok: false, error: "bad_answer" };
        correct = gap === it.answer;
        xp = it.xp;
      }
      const item = it.id;
      const part = xp?.part ?? input.beat;
      const done = items.get(item);
      if (done) return { ok: true, award: replayOf(done) };
      if (items.has(SKIP_PREFIX + item)) return { ok: true, award: { item, part, correct, amount: 0, insert: false } };
      return { ok: true, award: { item, part, correct, amount: singleAmount(xp, correct), insert: true } };
    }
    default:
      return { ok: false, error: "not_answer_item" };
  }
}

function scoreCombo(input: ScoreInput, it: I1Sort | I4Score): ScoreResult {
  const m = /^([A-Za-z0-9_-]{1,20}(?:\.[1-5])?)(#2)?$/.exec(input.itemKey ?? "");
  if (!m) return { ok: false, error: "bad_item" };
  const base = m[1];
  const isRetry = m[2] === "#2";

  let correct: boolean;
  const firstItems = new Set<string>();
  if (it.type === "I1") {
    for (const card of it.cards) firstItems.add(`${it.id}.${card.key}`);
    const card = it.cards.find((c) => c.key === base);
    if (!card) return { ok: false, error: "bad_item" };
    const v = choiceValue(input.answer);
    if (v === null || !(it.bins as string[]).includes(v)) return { ok: false, error: "bad_answer" };
    correct = v === card.answer;
  } else {
    for (const row of it.rows) for (let c = 1; c <= 5; c++) firstItems.add(`${it.id}.${row.key}.${c}`);
    const [rowKey, crit] = base.split(".");
    const row = it.rows.find((r) => r.key === rowKey);
    if (!row || crit === undefined) return { ok: false, error: "bad_item" };
    const v = intValue(input.answer);
    if (v === null || v < 1 || v > 3) return { ok: false, error: "bad_answer" };
    correct = v === row.answers[Number(crit) - 1];
  }

  const first = `${it.id}.${base}`;
  const items = byItem(input.prior);
  const part = it.xp.part;
  if (items.has(SKIP_PREFIX + first)) {
    return { ok: true, award: { item: isRetry ? `${first}#2` : first, part, correct, amount: 0, insert: false } };
  }

  if (!isRetry) {
    const done = items.get(first);
    if (done) return { ok: true, award: replayOf(done) };
    if (!correct) return { ok: true, award: { item: first, part, correct, amount: 0, retry: true, insert: true } };
    const combo = comboFor(streakBefore(input.prior, firstItems) + 1);
    return { ok: true, award: { item: first, part, correct, amount: it.xp.per * combo, combo, insert: true } };
  }

  const firstRow = items.get(first);
  if (!firstRow || firstRow.correct !== false) return { ok: false, error: "retry_not_allowed" };
  const retryItem = `${first}#2`;
  const done = items.get(retryItem);
  if (done) return { ok: true, award: replayOf(done) };
  return {
    ok: true,
    award: { item: retryItem, part, correct, amount: correct ? it.xp.retry : 0, combo: 1, insert: true },
  };
}

function scoreSpot(it: I3Spot, itemKey: string | undefined, answer: unknown, prior: PriorRow[]): ScoreResult {
  if (itemKey) return { ok: false, error: "bad_item" };
  if (typeof answer !== "string" || answer.trim().length === 0 || answer.length > 2000) {
    return { ok: false, error: "bad_answer" };
  }
  const items = byItem(prior);
  const part = it.xp.part;
  const hit = isSpotHit(answer, it.target);
  const found = items.get(it.id);
  if (found) return { ok: true, award: replayOf(found) };
  // A neutral unit (a computed cell) is answered but never counted or stored.
  if (!hit && neutralLine(it, answer) !== null) {
    return { ok: true, award: { item: `${it.id}#neutral`, part, correct: null, amount: 0, insert: false } };
  }
  if (items.has(SKIP_PREFIX + it.id)) {
    return { ok: true, award: { item: it.id, part, correct: hit, amount: 0, insert: false } };
  }
  const wrongTaps = prior.filter((r) => r.item.startsWith(`${it.id}#tap`)).length;
  if (hit) {
    const amount = wrongTaps < it.hintAfter ? it.xp.right : it.xp.afterHint;
    return { ok: true, award: { item: it.id, part, correct: true, amount, insert: true } };
  }
  return {
    ok: true,
    award: {
      item: `${it.id}#tap${wrongTaps + 1}`,
      part,
      correct: false,
      amount: 0,
      insert: wrongTaps < MAX_WRONG_TAPS,
    },
  };
}

/**
 * Why a 2라운드 카드 step cannot be recorded yet, or null: M1.2 needs the card
 * in the drill draft (the places may be empty, "–" on the card); B1 needs
 * its instruction line as well.
 */
export function round2CardProblem(
  target: I9MyTask["target"],
  card: Pick<Round2Card, "instruction"> | null,
): string | null {
  if (!card) return "round2_card_missing";
  if (target === "round2_card" && card.instruction.trim().length < 4) return "round2_card_no_instruction";
  return null;
}

/**
 * A step (I8, I9, I10, I11, terms) pays its xp.right once, after the route
 * verified it. `example` (I11 only): the learner pasted the review example
 * instead of their own assistant's answer, so the step is recorded at 0 XP
 * (rulebook: evidence, never self-report).
 */
export function stepAward(
  interaction: Interaction,
  beat: XpPart,
  prior: PriorRow[],
  opts: { example?: boolean } = {},
): Award | null {
  if (!STEP_TYPES.has(interaction.type)) return null;
  const xp = "xp" in interaction ? (interaction.xp as ItemXp | undefined) : undefined;
  const item = interaction.id;
  const part = xp?.part ?? beat;
  const items = byItem(prior);
  const done = items.get(item);
  if (done) return replayOf(done);
  if (items.has(SKIP_PREFIX + item)) return { item, part, correct: null, amount: 0, insert: false };
  const unpaid = opts.example === true && interaction.type === "I11";
  return { item, part, correct: null, amount: unpaid ? 0 : (xp?.right ?? 0), insert: true };
}

// --- What a mission's end waits for ------------------------------------------------

/**
 * The interactions whose record `done` requires: every own-work step (I9),
 * and every other item that pays and that the player posts as it is played.
 * Left out: I8 (it pays later, from a time log entry with evidence) and an
 * I7 that lists the learner's rows with nothing to post.
 */
export function requiredForDone(mission: MissionContent): Located[] {
  return missionInteractions(mission).filter(({ interaction: it }) => {
    switch (it.type) {
      case "I9":
        return true;
      case "I8":
        return false;
      case "I7":
        return (it.options.length > 0 || it.from === "work_map_rows") && (it.answer !== undefined || it.xp !== undefined);
      case "I10":
      case "I11":
      case "terms":
        return it.xp !== undefined;
      default:
        return true; // I1, I2, I3, I4, I6, seam always carry xp
    }
  });
}

/** Whether the learner's rows hold a record of the interaction (a skip credit counts). */
export function isRecorded(it: Interaction, items: ReadonlySet<string>): boolean {
  if (items.has(it.id) || items.has(SKIP_PREFIX + it.id)) return true;
  if (it.type === "I1" || it.type === "I4" || it.type === "I3") {
    const prefixes = it.type === "I3" ? [`${it.id}#tap`] : [`${it.id}.`, `${SKIP_PREFIX}${it.id}.`];
    for (const item of items) if (prefixes.some((p) => item.startsWith(p))) return true;
  }
  return false;
}

/** Ids of the required interactions without a record, in screen order (409 steps_missing). */
export function missingForDone(mission: MissionContent, rows: Pick<CourseXpRow, "item">[]): string[] {
  const items = new Set(rows.map((r) => r.item));
  return requiredForDone(mission)
    .filter((x) => !isRecorded(x.interaction, items))
    .map((x) => x.interaction.id);
}

/**
 * Where an unfinished mission reopens: the first screen up to the furthest
 * one reached that still has a required interaction without a record (so a
 * step lost to a network failure or a reload can be done again), else the
 * furthest screen.
 */
export function resumeScreen(mission: MissionContent, furthest: number, rows: Pick<CourseXpRow, "item">[]): number {
  const last = mission.screens.length - 1;
  const upTo = Math.min(Math.max(0, furthest), last);
  const items = new Set(rows.map((r) => r.item));
  for (const x of requiredForDone(mission)) {
    if (x.screenIndex >= upTo) break;
    if (!isRecorded(x.interaction, items)) return x.screenIndex;
  }
  return upTo;
}

// --- Skip test --------------------------------------------------------------------

export interface SkipGrade {
  passed: boolean;
  cardsRight: number;
  cardsTotal: number;
  pickRight: boolean;
  spotFound: boolean;
  inTime: boolean;
}

/**
 * Grades a skip test against its content. `seconds` is the larger of the
 * client's count and the server's own (the routes pass the max); it is
 * reported as `inTime` and is not a pass rule (L1 review 2026-10-21: no
 * timer on judgement). Pass = every card right, the pick right, the spot
 * found within two taps; a neutral tap (a computed cell) is not a tap.
 */
export function gradeSkipTest(
  test: MissionContent,
  input: Pick<SkipRequest, "cards" | "pick" | "spotTaps" | "seconds">,
): { ok: true; grade: SkipGrade } | { ok: false; error: "bad_answer" | "not_a_skip_test" } {
  if (test.kind !== "skip_test") return { ok: false, error: "not_a_skip_test" };
  const all = missionInteractions(test).map((x) => x.interaction);
  const sort = all.find((x): x is I1Sort => x.type === "I1");
  const spot = all.find((x): x is I3Spot => x.type === "I3");
  const pickItem = all.find(
    (x) => x.type === "I2" || ((x.type === "I6" || x.type === "I7") && typeof x.answer === "string"),
  );
  if (!sort || !spot || !pickItem) return { ok: false, error: "not_a_skip_test" };
  if (input.cards.length !== sort.cards.length) return { ok: false, error: "bad_answer" };

  const cardsRight = sort.cards.filter((card, n) => input.cards[n] === card.answer).length;
  const pickAnswer = pickItem.type === "I2" || pickItem.type === "I6" || pickItem.type === "I7" ? pickItem.answer : undefined;
  const pickRight = typeof pickAnswer === "string" && input.pick === pickAnswer;
  const taps = input.spotTaps.filter((tap) => neutralLine(spot, tap) === null);
  const spotFound = taps.slice(0, SKIP_TEST_TAPS).some((tap) => isSpotHit(tap, spot.target));
  const inTime = input.seconds >= 0 && input.seconds <= SKIP_TEST_SECONDS;
  return {
    ok: true,
    grade: {
      passed: cardsRight === sort.cards.length && pickRight && spotFound,
      cardsRight,
      cardsTotal: sort.cards.length,
      pickRight,
      spotFound,
      inTime,
    },
  };
}

export interface Credit {
  item: string;
  part: XpPart;
  amount: number;
}

/**
 * What a passed skip test credits in one mission: every scored item on its
 * skippable screens, at the plain first-try rate (no combo), so skipping never
 * pays more than playing. Items the learner already answered are left out.
 */
export function skipCredits(mission: MissionContent, prior: PriorRow[]): Credit[] {
  const items = byItem(prior);
  const played = (item: string) =>
    items.has(item) || items.has(`${item}#2`) || items.has(SKIP_PREFIX + item) ||
    prior.some((r) => r.item.startsWith(`${item}#tap`));
  const out: Credit[] = [];
  const add = (item: string, part: XpPart, amount: number) => {
    if (!played(item)) out.push({ item: SKIP_PREFIX + item, part, amount });
  };
  for (const { interaction: it, screen } of missionInteractions(mission)) {
    if (!screen.skippable) continue;
    switch (it.type) {
      case "I1":
        for (const card of it.cards) add(`${it.id}.${card.key}`, it.xp.part, it.xp.per);
        break;
      case "I4":
        for (const row of it.rows) for (let c = 1; c <= 5; c++) add(`${it.id}.${row.key}.${c}`, it.xp.part, it.xp.per);
        break;
      case "I3":
        add(it.id, it.xp.part, it.xp.right);
        break;
      case "I2":
      case "I6":
      case "seam":
        add(it.id, it.xp.part, it.xp.right);
        break;
      case "I7":
      case "I10":
      case "I11":
      case "terms":
        if (it.xp) add(it.id, it.xp.part, it.xp.right);
        break;
      default:
        // I8 and I9 are own work: never on a skippable screen (validateMission).
        break;
    }
  }
  return out;
}
