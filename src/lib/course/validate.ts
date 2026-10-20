// validateMission(): the gate every mission JSON passes before it reaches
// public.course_content (scripts/course/seed-content.ts). Pure, no I/O.
//
// It checks every field of MissionContent (./types.ts) and the cross-field
// rules the engine relies on: unique screen and interaction ids, item keys
// short enough for course_xp.item (80 chars, with the "skip:" prefix and the
// "#2" retry suffix), caps covering every XP part used, answer keys that
// exist (I1 bins, I2/I6/I7 options, I4 five criteria), the I3 target inside
// its document, the I2 chips inside the wrong document, skippable screens
// that are only 알기/해보기 without own-work steps, and the copy rules
// (no 보장/반드시, no product names, only known {{slots}}; the reward-only
// slots in `saved` only). Conditional content (`if` on a block or an I7
// option) must name an I7 of the mission and its option values, and nothing
// inside a conditional block may be required for `done`.
//
// Unknown keys are errors (they are usually typos, e.g. "skipable"); keys
// starting with "_" are allowed as comments. A declared total (`xp` or
// `total`, a number) must equal the sum of the caps.
//
// validateLevel() adds the rules that need every mission of a level.

import type { Beat, MissionContent, RewardSlotKey, SlotKey } from "./types";

export type ValidateResult = { ok: true; mission: MissionContent } | { ok: false; errors: string[] };

export const BEATS: readonly Beat[] = ["상황", "알기", "해보기", "내 업무에", "확인", "보상"];
export const COURSES: readonly MissionContent["course"][] = [
  "spine0",
  "spine2",
  "DOC",
  "RES",
  "DAT",
  "SAL",
  "CON",
  "MGT",
  "SMB",
];
export const SLOT_KEYS: readonly SlotKey[] = [
  "q8",
  "report_name",
  "track_name",
  "reader_title",
  "candidate1",
  "candidate2",
  "p_hours",
  "j_hours",
  "row_count",
];
/** Filled by the player on the reward screen; allowed in `saved` only. */
export const REWARD_SLOT_KEYS: readonly RewardSlotKey[] = [
  "seed_count",
  "total_hours",
  "candidate_scores",
  "diff_count",
  "drill_task",
];

/** Same pattern as the course_content.mission_id check in migration 0012. */
export const MISSION_ID_RE = /^(M|B|S)[0-9]{1,2}\.?[0-9A-Z]*$/;
/** Screen and interaction ids: no "#", ":" or spaces (they build item keys). */
export const LOCAL_ID_RE = /^[A-Za-z0-9_-][A-Za-z0-9_.-]{0,39}$/;
/** Card, row and checklist keys: no "." either (I4 item keys are row.criterion). */
export const ITEM_KEY_RE = /^[A-Za-z0-9_-]{1,20}$/;
export const BADGE_ID_RE = /^[a-z0-9_]{2,40}$/;

const BANNED_WORDS = ["보장", "반드시"];
const PRODUCT_NAMES = ["ChatGPT", "Claude", "Gemini", "NotebookLM", "Copilot"];
const SLOT_RE = /\{\{\s*([^}]*?)\s*\}\}/g;
const MAX_TEXT = 4000;

type Obj = Record<string, unknown>;

function isObj(v: unknown): v is Obj {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

class Checker {
  errors: string[] = [];

  err(path: string, msg: string): void {
    this.errors.push(`${path}: ${msg}`);
  }

  keys(o: Obj, allowed: readonly string[], path: string): void {
    for (const k of Object.keys(o)) {
      if (k.startsWith("_")) continue;
      if (!allowed.includes(k)) this.err(path, `unknown key "${k}"`);
    }
  }

  str(o: Obj, k: string, path: string, opt: { optional?: boolean; empty?: boolean; max?: number; re?: RegExp } = {}): string | undefined {
    const v = o[k];
    if (v === undefined) {
      if (!opt.optional) this.err(`${path}.${k}`, "required string");
      return undefined;
    }
    if (typeof v !== "string") {
      this.err(`${path}.${k}`, "must be a string");
      return undefined;
    }
    if (!opt.empty && v.trim().length === 0) this.err(`${path}.${k}`, "must not be empty");
    if (v.length > (opt.max ?? MAX_TEXT)) this.err(`${path}.${k}`, `longer than ${opt.max ?? MAX_TEXT} chars`);
    if (opt.re && !opt.re.test(v)) this.err(`${path}.${k}`, `"${v}" does not match ${opt.re}`);
    return v;
  }

  num(o: Obj, k: string, path: string, opt: { optional?: boolean; int?: boolean; min?: number; max?: number } = {}): number | undefined {
    const v = o[k];
    if (v === undefined) {
      if (!opt.optional) this.err(`${path}.${k}`, "required number");
      return undefined;
    }
    if (typeof v !== "number" || !Number.isFinite(v)) {
      this.err(`${path}.${k}`, "must be a number");
      return undefined;
    }
    if (opt.int && !Number.isInteger(v)) this.err(`${path}.${k}`, "must be an integer");
    if (opt.min !== undefined && v < opt.min) this.err(`${path}.${k}`, `must be >= ${opt.min}`);
    if (opt.max !== undefined && v > opt.max) this.err(`${path}.${k}`, `must be <= ${opt.max}`);
    return v;
  }

  bool(o: Obj, k: string, path: string): boolean | undefined {
    const v = o[k];
    if (v === undefined) return undefined;
    if (typeof v !== "boolean") {
      this.err(`${path}.${k}`, "must be true or false");
      return undefined;
    }
    return v;
  }

  oneOf<T extends string>(o: Obj, k: string, values: readonly T[], path: string, optional = false): T | undefined {
    const v = o[k];
    if (v === undefined) {
      if (!optional) this.err(`${path}.${k}`, `required, one of ${values.join(" | ")}`);
      return undefined;
    }
    if (typeof v !== "string" || !values.includes(v as T)) {
      this.err(`${path}.${k}`, `must be one of ${values.join(" | ")}`);
      return undefined;
    }
    return v as T;
  }

  arr(o: Obj, k: string, path: string, opt: { optional?: boolean; min?: number; max?: number } = {}): unknown[] | undefined {
    const v = o[k];
    if (v === undefined) {
      if (!opt.optional) this.err(`${path}.${k}`, "required array");
      return undefined;
    }
    if (!Array.isArray(v)) {
      this.err(`${path}.${k}`, "must be an array");
      return undefined;
    }
    if (opt.min !== undefined && v.length < opt.min) this.err(`${path}.${k}`, `needs at least ${opt.min} item(s)`);
    if (opt.max !== undefined && v.length > opt.max) this.err(`${path}.${k}`, `allows at most ${opt.max} item(s)`);
    return v;
  }

  strArr(o: Obj, k: string, path: string, opt: { optional?: boolean; min?: number; max?: number } = {}): string[] | undefined {
    const a = this.arr(o, k, path, opt);
    if (!a) return undefined;
    const out: string[] = [];
    a.forEach((v, i) => {
      if (typeof v !== "string" || v.trim().length === 0) this.err(`${path}.${k}[${i}]`, "must be a non-empty string");
      else out.push(v);
    });
    return out;
  }

  obj(o: Obj, k: string, path: string, optional = false): Obj | undefined {
    const v = o[k];
    if (v === undefined) {
      if (!optional) this.err(`${path}.${k}`, "required object");
      return undefined;
    }
    if (!isObj(v)) {
      this.err(`${path}.${k}`, "must be an object");
      return undefined;
    }
    return v;
  }
}

/** Parts used by scored items, collected while checking interactions. */
interface Walk {
  c: Checker;
  screenIds: Set<string>;
  interactionIds: Set<string>;
  partsUsed: Map<string, string>; // part -> first path that used it
  types: { type: string; path: string; i: Obj }[];
  skippable: boolean;
  /** Inside a block with `if`: nothing here may be required for done. */
  conditional: boolean;
  /** Every `if` seen, checked against the mission's I7s at the end. */
  ifs: { path: string; choice: string; values: string[] }[];
}

function checkIf(w: Walk, o: Obj, path: string): void {
  const v = w.c.obj(o, "if", path, true);
  if (!v) return;
  const p = `${path}.if`;
  w.c.keys(v, ["choice", "in"], p);
  const choice = w.c.str(v, "choice", p, { re: LOCAL_ID_RE });
  const values = w.c.strArr(v, "in", p, { min: 1, max: 8 });
  if (choice !== undefined && values) w.ifs.push({ path: p, choice, values });
}

/** An interaction inside a conditional block must not be one `done` waits for (requiredForDone). */
function checkConditional(w: Walk, type: string, i: Obj, path: string): void {
  if (!w.conditional) return;
  const pays = i.xp !== undefined;
  const required =
    type === "I9" ||
    type === "I8" ||
    ["I1", "I2", "I3", "I4", "I6", "seam"].includes(type) ||
    ((type === "I10" || type === "I11" || type === "terms") && pays) ||
    (type === "I7" && (pays || i.answer !== undefined));
  if (required) w.c.err(path, `${type} inside a conditional block may not be scored or required (it may stay hidden)`);
}

function checkItemXp(w: Walk, o: Obj, k: string, path: string, optional: boolean): void {
  const xp = w.c.obj(o, k, path, optional);
  if (!xp) return;
  const p = `${path}.${k}`;
  w.c.keys(xp, ["part", "right", "wrong"], p);
  const part = w.c.str(xp, "part", p, { max: 20 });
  w.c.num(xp, "right", p, { int: true, min: 0, max: 500 });
  w.c.num(xp, "wrong", p, { optional: true, int: true, min: 0, max: 500 });
  if (part) notePart(w, part, p);
}

function notePart(w: Walk, part: string, path: string): void {
  if (!w.partsUsed.has(part)) w.partsUsed.set(part, path);
}

function checkOptions(w: Walk, i: Obj, path: string, extra: string[] = [], min = 2): Set<string> {
  const values = new Set<string>();
  const options = w.c.arr(i, "options", path, { min, max: 8 });
  options?.forEach((opt, n) => {
    const p = `${path}.options[${n}]`;
    if (!isObj(opt)) return w.c.err(p, "must be an object");
    w.c.keys(opt, ["v", "label", ...extra], p);
    const v = w.c.str(opt, "v", p, { max: 40 });
    w.c.str(opt, "label", p);
    // String extras only (feedback); hold and if are checked by the I7 case.
    for (const k of extra) if (k !== "hold" && k !== "if") w.c.str(opt, k, p, { optional: true });
    if (v !== undefined) {
      if (values.has(v)) w.c.err(p, `duplicate option value "${v}"`);
      values.add(v);
    }
  });
  return values;
}

function checkInteraction(w: Walk, i: Obj, path: string): void {
  const c = w.c;
  const type = i.type;
  const id = c.str(i, "id", path, { re: LOCAL_ID_RE });
  if (id !== undefined) {
    if (w.interactionIds.has(id)) c.err(path, `duplicate interaction id "${id}"`);
    w.interactionIds.add(id);
  }
  if (typeof type !== "string") return c.err(path, "interaction needs a type");
  w.types.push({ type, path, i });
  if (w.skippable && (type === "I8" || type === "I9")) {
    c.err(path, `${type} is own work and may not sit on a skippable screen`);
  }
  checkConditional(w, type, i, path);

  switch (type) {
    case "I6": {
      c.keys(i, ["id", "type", "options", "answer", "xp", "reveal", "revealRight", "revealWrong", "source"], path);
      const values = checkOptions(w, i, path);
      const answer = c.str(i, "answer", path, { max: 40 });
      if (answer !== undefined && !values.has(answer)) c.err(`${path}.answer`, `"${answer}" is not an option`);
      checkItemXp(w, i, "xp", path, false);
      c.str(i, "reveal", path);
      c.str(i, "revealRight", path, { optional: true });
      c.str(i, "revealWrong", path, { optional: true });
      c.str(i, "source", path, { optional: true });
      return;
    }
    case "I7": {
      c.keys(
        i,
        ["id", "type", "from", "fromLine", "options", "answer", "pick", "xp", "feedbackRight", "feedbackWrong", "layout", "evidence"],
        path,
      );
      c.oneOf(i, "evidence", ["work_map_submitted"] as const, path, true);
      const from = c.oneOf(i, "from", ["seed_rows", "work_map_rows"] as const, path, true);
      const fromLine = c.str(i, "fromLine", path, { optional: true, max: 200 });
      if (fromLine !== undefined && from !== "work_map_rows") c.err(`${path}.fromLine`, 'only from "work_map_rows" has a fromLine');
      if (from === "work_map_rows") {
        // The learner's rows are the options: nothing to score. With xp it pays
        // on the 맞아요 / 바꾸기 tap after the pick (score.ts ROW_CHECK_VALUES).
        if (Array.isArray(i.options) && i.options.length > 0) c.err(`${path}.options`, 'must be empty with from "work_map_rows"');
        if (i.answer !== undefined) c.err(path, 'from "work_map_rows" takes no answer');
        if (i.xp !== undefined && fromLine === undefined) c.err(path, 'from "work_map_rows" pays only with a fromLine (the 맞아요 / 바꾸기 tap)');
      }
      const values = checkOptions(w, i, path, ["feedback", "hold", "if"], from === "work_map_rows" ? 0 : 2);
      if (Array.isArray(i.options)) {
        i.options.forEach((opt, n) => {
          if (!isObj(opt)) return;
          const p = `${path}.options[${n}]`;
          if (opt.hold !== undefined && opt.hold !== true) c.err(`${p}.hold`, "must be true when given");
          if (opt.hold === true && (i.answer !== undefined || i.xp !== undefined)) c.err(`${p}.hold`, "only an I7 without answer and xp may hold");
          checkIf(w, opt, p);
        });
      }
      const pick = c.num(i, "pick", path, { optional: true, int: true, min: 1, max: 8 }) ?? 1;
      const answer = i.answer;
      if (answer === undefined) {
        if (pick !== 1) c.err(`${path}.pick`, "pick > 1 needs an answer array");
      } else if (typeof answer === "string") {
        if (!values.has(answer)) c.err(`${path}.answer`, `"${answer}" is not an option`);
        if (pick !== 1) c.err(`${path}.pick`, "a single answer needs pick 1");
      } else if (Array.isArray(answer)) {
        if (answer.length !== pick) c.err(`${path}.answer`, `has ${answer.length} values but pick is ${pick}`);
        const seen = new Set<string>();
        answer.forEach((a, n) => {
          if (typeof a !== "string" || !values.has(a)) c.err(`${path}.answer[${n}]`, "is not an option");
          else if (seen.has(a)) c.err(`${path}.answer[${n}]`, "duplicate");
          else seen.add(a);
        });
      } else {
        c.err(`${path}.answer`, "must be a string or an array of strings");
      }
      checkItemXp(w, i, "xp", path, true);
      c.str(i, "feedbackRight", path, { optional: true });
      c.str(i, "feedbackWrong", path, { optional: true });
      c.oneOf(i, "layout", ["grid", "list"] as const, path, true);
      return;
    }
    case "I1": {
      c.keys(i, ["id", "type", "bins", "cards", "xp", "intro", "endAllRight", "endSome", "endLow", "lowBelow"], path);
      const binsRaw = c.arr(i, "bins", path, { min: 2, max: 3 });
      const bins = new Set<string>();
      binsRaw?.forEach((b, n) => {
        if (b !== "p" && b !== "j" && b !== "mix") c.err(`${path}.bins[${n}]`, 'must be "p", "j" or "mix"');
        else if (bins.has(b)) c.err(`${path}.bins[${n}]`, "duplicate bin");
        else bins.add(b);
      });
      const cards = c.arr(i, "cards", path, { min: 1, max: 30 });
      const keys = new Set<string>();
      cards?.forEach((card, n) => {
        const p = `${path}.cards[${n}]`;
        if (!isObj(card)) return c.err(p, "must be an object");
        c.keys(card, ["key", "text", "answer", "why", "split"], p);
        const key = c.str(card, "key", p, { re: ITEM_KEY_RE });
        if (key !== undefined) {
          if (keys.has(key)) c.err(p, `duplicate card key "${key}"`);
          keys.add(key);
        }
        c.str(card, "text", p);
        c.str(card, "why", p);
        const answer = card.answer;
        if (answer !== "p" && answer !== "j" && answer !== "mix") c.err(`${p}.answer`, 'must be "p", "j" or "mix"');
        else if (!bins.has(answer)) c.err(`${p}.answer`, `"${answer}" is not one of the bins`);
        const split = c.arr(card, "split", p, { optional: true, min: 2, max: 4 });
        if (split && answer !== "mix") c.err(`${p}.split`, 'only a "mix" card has a split');
        if (!split && answer === "mix") c.err(`${p}.split`, 'a "mix" card needs a split');
        const splitKeys = new Set<string>();
        split?.forEach((s, m) => {
          const sp = `${p}.split[${m}]`;
          if (!isObj(s)) return c.err(sp, "must be an object");
          c.keys(s, ["key", "text", "answer"], sp);
          const sk = c.str(s, "key", sp, { re: ITEM_KEY_RE });
          if (sk !== undefined) {
            if (splitKeys.has(sk)) c.err(sp, `duplicate split key "${sk}"`);
            splitKeys.add(sk);
          }
          c.str(s, "text", sp);
          c.oneOf(s, "answer", ["p", "j"] as const, sp);
        });
      });
      checkComboXp(w, i, path);
      c.str(i, "intro", path, { optional: true });
      c.str(i, "endAllRight", path, { optional: true });
      c.str(i, "endSome", path, { optional: true });
      c.str(i, "endLow", path, { optional: true });
      const low = c.num(i, "lowBelow", path, { optional: true, int: true, min: 0 });
      if (low !== undefined && cards && low > cards.length) c.err(`${path}.lowBelow`, "is more than the number of cards");
      return;
    }
    case "I2": {
      c.keys(i, ["id", "type", "docs", "answer", "xp", "wrongLine", "chips"], path);
      const docs = c.arr(i, "docs", path, { min: 2, max: 3 });
      const byV = new Map<string, string>();
      docs?.forEach((d, n) => {
        const p = `${path}.docs[${n}]`;
        if (!isObj(d)) return c.err(p, "must be an object");
        c.keys(d, ["v", "label", "text"], p);
        const v = c.str(d, "v", p, { max: 40 });
        c.str(d, "label", p);
        const text = c.str(d, "text", p, { max: 8000 });
        if (v !== undefined) {
          if (byV.has(v)) c.err(p, `duplicate doc value "${v}"`);
          byV.set(v, text ?? "");
        }
      });
      const answer = c.str(i, "answer", path, { max: 40 });
      if (answer !== undefined && !byV.has(answer)) c.err(`${path}.answer`, `"${answer}" is not a doc`);
      checkItemXp(w, i, "xp", path, false);
      c.str(i, "wrongLine", path);
      const wrongText = [...byV.entries()].filter(([v]) => v !== answer).map(([, t]) => t);
      const chips = c.arr(i, "chips", path, { min: 1, max: 8 });
      chips?.forEach((chip, n) => {
        const p = `${path}.chips[${n}]`;
        if (!isObj(chip)) return c.err(p, "must be an object");
        c.keys(chip, ["name", "find"], p);
        c.str(chip, "name", p);
        const find = c.str(chip, "find", p);
        if (find !== undefined && answer !== undefined && !wrongText.some((t) => t.includes(find))) {
          c.err(`${p}.find`, `"${find}" is not in the wrong document`);
        }
      });
      return;
    }
    case "I3": {
      c.keys(i, ["id", "type", "doc", "target", "xp", "hintAfter", "rightLine", "wrongLine", "neutral"], path);
      c.str(i, "wrongLine", path, { optional: true, max: 300 });
      const neutral = c.arr(i, "neutral", path, { optional: true, max: 6 });
      neutral?.forEach((n, k) => {
        const p = `${path}.neutral[${k}]`;
        if (!isObj(n)) return c.err(p, "must be an object");
        c.keys(n, ["find", "line"], p);
        const find = c.str(n, "find", p, { max: 120 });
        c.str(n, "line", p, { max: 300 });
        if (find !== undefined && typeof i.doc === "string" && !i.doc.includes(find)) c.err(`${p}.find`, `"${find}" is not in the doc`);
        if (find !== undefined && typeof i.target === "string" && (i.target.includes(find) || find.includes(i.target))) {
          c.err(`${p}.find`, "overlaps the target");
        }
      });
      const doc = c.str(i, "doc", path, { max: 8000 });
      const target = c.str(i, "target", path, { max: 300 });
      if (doc !== undefined && target !== undefined && !doc.includes(target)) {
        c.err(`${path}.target`, `"${target}" is not in the doc`);
      }
      if (target !== undefined && /\{\{/.test(target)) c.err(`${path}.target`, "may not contain a {{slot}}");
      const xp = c.obj(i, "xp", path);
      if (xp) {
        const p = `${path}.xp`;
        c.keys(xp, ["part", "right", "afterHint"], p);
        const part = c.str(xp, "part", p, { max: 20 });
        const right = c.num(xp, "right", p, { int: true, min: 0, max: 500 });
        const after = c.num(xp, "afterHint", p, { int: true, min: 0, max: 500 });
        if (right !== undefined && after !== undefined && after > right) c.err(p, "afterHint is more than right");
        if (part) notePart(w, part, p);
      }
      c.num(i, "hintAfter", path, { int: true, min: 1, max: 10 });
      c.str(i, "rightLine", path);
      return;
    }
    case "I4": {
      c.keys(i, ["id", "type", "rows", "xp", "end"], path);
      const rows = c.arr(i, "rows", path, { min: 1, max: 6 });
      const keys = new Set<string>();
      rows?.forEach((row, n) => {
        const p = `${path}.rows[${n}]`;
        if (!isObj(row)) return c.err(p, "must be an object");
        c.keys(row, ["key", "title", "fact", "answers", "lines"], p);
        const key = c.str(row, "key", p, { re: ITEM_KEY_RE });
        if (key !== undefined) {
          if (keys.has(key)) c.err(p, `duplicate row key "${key}"`);
          keys.add(key);
        }
        c.str(row, "title", p);
        c.str(row, "fact", p);
        const answers = c.arr(row, "answers", p, { min: 5, max: 5 });
        answers?.forEach((a, m) => {
          if (a !== 1 && a !== 2 && a !== 3) c.err(`${p}.answers[${m}]`, "must be 1, 2 or 3");
        });
        c.strArr(row, "lines", p, { max: 10 });
      });
      checkComboXp(w, i, path);
      c.str(i, "end", path);
      return;
    }
    case "I8": {
      c.keys(i, ["id", "type", "label", "method", "xp"], path);
      c.str(i, "label", path);
      c.oneOf(i, "method", ["before", "harness", "pipeline"] as const, path);
      checkItemXp(w, i, "xp", path, true);
      return;
    }
    case "I9": {
      c.keys(i, ["id", "type", "target", "xp", "placeholders", "prefill"], path);
      c.str(i, "prefill", path, { optional: true, max: 400 });
      c.oneOf(
        i,
        "target",
        [
          "seed_rows",
          "work_map_rows",
          "work_map_extra_row",
          "work_map_classify",
          "work_map_candidates",
          "drill_left_for_human",
          "drill_invention",
          "round2_card_start",
          "round2_card",
        ] as const,
        path,
      );
      checkItemXp(w, i, "xp", path, false);
      c.strArr(i, "placeholders", path, { optional: true, max: 10 });
      return;
    }
    case "I10": {
      c.keys(i, ["id", "type", "items", "ordered", "orderLine", "xp"], path);
      const items = c.arr(i, "items", path, { min: 1, max: 20 });
      const keys = new Set<string>();
      items?.forEach((item, n) => {
        const p = `${path}.items[${n}]`;
        if (!isObj(item)) return c.err(p, "must be an object");
        c.keys(item, ["key", "label", "say", "packId"], p);
        const key = c.str(item, "key", p, { re: ITEM_KEY_RE });
        if (key !== undefined) {
          if (keys.has(key)) c.err(p, `duplicate item key "${key}"`);
          keys.add(key);
        }
        c.str(item, "label", p);
        c.str(item, "say", p, { optional: true });
        c.str(item, "packId", p, { optional: true, max: 60 });
      });
      const ordered = c.bool(i, "ordered", path);
      const orderLine = c.str(i, "orderLine", path, { optional: true });
      if (orderLine !== undefined && !ordered) c.err(`${path}.orderLine`, "only an ordered checklist has an orderLine");
      checkItemXp(w, i, "xp", path, true);
      return;
    }
    case "I11": {
      c.keys(i, ["id", "type", "round", "steps", "minChars", "packText", "exampleText", "xp"], path);
      const round = i.round;
      if (round !== 1 && round !== 2) c.err(`${path}.round`, "must be 1 or 2");
      c.strArr(i, "steps", path, { min: 1, max: 10 });
      c.num(i, "minChars", path, { int: true, min: 0, max: 5000 });
      c.str(i, "packText", path, { optional: true, max: 8000 });
      c.str(i, "exampleText", path, { optional: true, max: 8000 });
      checkItemXp(w, i, "xp", path, false);
      return;
    }
    case "terms": {
      c.keys(i, ["id", "type", "cards", "xp"], path);
      const cards = c.arr(i, "cards", path, { min: 1, max: 8 });
      cards?.forEach((card, n) => {
        const p = `${path}.cards[${n}]`;
        if (!isObj(card)) return c.err(p, "must be an object");
        c.keys(card, ["word", "kind", "def", "example"], p);
        c.str(card, "word", p);
        c.oneOf(card, "kind", ["p", "j"] as const, p);
        c.str(card, "def", p);
        c.str(card, "example", p);
      });
      checkItemXp(w, i, "xp", path, true);
      return;
    }
    case "seam": {
      c.keys(i, ["id", "type", "chunks", "answer", "lines", "xp"], path);
      const chunks = c.strArr(i, "chunks", path, { min: 2, max: 12 });
      const answer = c.num(i, "answer", path, { int: true, min: 0 });
      if (chunks && answer !== undefined && answer > chunks.length) c.err(`${path}.answer`, "is past the last gap");
      const lines = c.obj(i, "lines", path);
      if (lines) {
        for (const [k, v] of Object.entries(lines)) {
          if (!/^[0-9]{1,2}$/.test(k)) c.err(`${path}.lines`, `key "${k}" is not a gap index`);
          else if (chunks && Number(k) > chunks.length) c.err(`${path}.lines`, `key "${k}" is past the last gap`);
          if (typeof v !== "string" || v.trim().length === 0) c.err(`${path}.lines.${k}`, "must be a non-empty string");
        }
      }
      checkItemXp(w, i, "xp", path, false);
      return;
    }
    default:
      c.err(path, `unknown interaction type "${type}"`);
  }
}

function checkComboXp(w: Walk, i: Obj, path: string): void {
  const xp = w.c.obj(i, "xp", path);
  if (!xp) return;
  const p = `${path}.xp`;
  w.c.keys(xp, ["part", "per", "retry"], p);
  const part = w.c.str(xp, "part", p, { max: 20 });
  const per = w.c.num(xp, "per", p, { int: true, min: 0, max: 100 });
  const retry = w.c.num(xp, "retry", p, { int: true, min: 0, max: 100 });
  if (per !== undefined && retry !== undefined && retry > per) w.c.err(p, "retry is more than per");
  if (part) notePart(w, part, p);
}

function checkBlocks(w: Walk, blocks: unknown[], path: string, inFallback: boolean): void {
  const c = w.c;
  blocks.forEach((b, n) => {
    const p = `${path}[${n}]`;
    if (!isObj(b)) return c.err(p, "must be an object");
    c.oneOf(b, "when", ["q8_ok", "q8_short"] as const, p, true);
    checkIf(w, b, p);
    const outer = w.conditional;
    if (b.if !== undefined) w.conditional = true;
    checkBlock(w, b, p, inFallback);
    w.conditional = outer;
  });
}

function checkBlock(w: Walk, b: Obj, p: string, inFallback: boolean): void {
  const c = w.c;
  {
    switch (b.t) {
      case "h":
      case "p":
      case "quote":
      case "warn":
      case "small":
        c.keys(b, ["t", "text", "when", "if"], p);
        c.str(b, "text", p, { max: 8000 });
        return;
      case "doc":
        c.keys(b, ["t", "label", "text", "packId", "when", "if"], p);
        c.str(b, "label", p, { optional: true });
        c.str(b, "text", p, { max: 8000 });
        c.str(b, "packId", p, { optional: true, max: 60 });
        return;
      case "fallback": {
        c.keys(b, ["t", "label", "blocks", "when", "if"], p);
        c.str(b, "label", p);
        if (inFallback) c.err(p, "a fallback may not contain another fallback");
        const inner = c.arr(b, "blocks", p, { min: 1 });
        if (inner) checkBlocks(w, inner, `${p}.blocks`, true);
        return;
      }
      case "i": {
        c.keys(b, ["t", "i", "when", "if"], p);
        if (inFallback) c.err(p, "a fallback holds text only, no interaction");
        const i = c.obj(b, "i", p);
        if (i) checkInteraction(w, i, `${p}.i`);
        return;
      }
      default:
        c.err(p, `unknown block type "${String(b.t)}"`);
    }
  }
}

/** Every string anywhere in the value, with its path. */
function* strings(v: unknown, path: string): Generator<[string, string]> {
  if (typeof v === "string") yield [path, v];
  else if (Array.isArray(v)) for (let n = 0; n < v.length; n++) yield* strings(v[n], `${path}[${n}]`);
  else if (isObj(v)) for (const [k, x] of Object.entries(v)) if (!k.startsWith("_")) yield* strings(x, `${path}.${k}`);
}

function checkCopy(c: Checker, json: Obj): void {
  for (const [path, text] of strings(json, "mission")) {
    for (const word of BANNED_WORDS) if (text.includes(word)) c.err(path, `uses "${word}" (outcome language rule)`);
    const lower = text.toLowerCase();
    for (const name of PRODUCT_NAMES) if (lower.includes(name.toLowerCase())) c.err(path, `names the product "${name}"`);
    const inSaved = path.startsWith("mission.saved[");
    for (const m of text.matchAll(SLOT_RE)) {
      const known = SLOT_KEYS.includes(m[1] as SlotKey) || (inSaved && REWARD_SLOT_KEYS.includes(m[1] as RewardSlotKey));
      if (!known) {
        c.err(path, REWARD_SLOT_KEYS.includes(m[1] as RewardSlotKey) ? `{{${m[1]}}} is for mission.saved only` : `unknown slot {{${m[1]}}}`);
      }
    }
  }
}

export function validateMission(json: unknown): ValidateResult {
  const c = new Checker();
  if (!isObj(json)) return { ok: false, errors: ["mission: must be a JSON object"] };
  const path = "mission";
  c.keys(
    json,
    [
      "version",
      "id",
      "course",
      "level",
      "ord",
      "title",
      "minutes",
      "boss",
      "kind",
      "caps",
      "requires",
      "badges",
      "coach",
      "nextTitle",
      "screens",
      "xp",
      "total",
      // Pending in types.ts (see the O1 server report): the level's title and
      // goal for LevelState, on any one mission of the level.
      "levelTitle",
      "levelGoal",
      "saved",
      "export",
    ],
    path,
  );
  const saved = c.strArr(json, "saved", path, { optional: true, max: 4 });
  saved?.forEach((line, n) => {
    if (line.length > 200) c.err(`${path}.saved[${n}]`, "longer than 200 chars");
  });
  c.oneOf(json, "export", ["work_map", "round2_card", "drill_sheet"] as const, path, true);
  if (json.version !== 1) c.err(`${path}.version`, "must be 1");
  c.str(json, "id", path, { re: MISSION_ID_RE, max: 12 });
  c.oneOf(json, "course", COURSES, path);
  c.num(json, "level", path, { int: true, min: 1, max: 12 });
  c.num(json, "ord", path, { int: true, min: 1, max: 99 });
  c.str(json, "title", path, { max: 80 });
  c.num(json, "minutes", path, { min: 1, max: 120 });
  const boss = c.bool(json, "boss", path);
  const kind = c.oneOf(json, "kind", ["mission", "skip_test"] as const, path, true) ?? "mission";
  if (boss && kind === "skip_test") c.err(path, "a skip test is not a boss");
  c.str(json, "coach", path);
  c.str(json, "nextTitle", path, { optional: true, max: 80 });
  c.str(json, "levelTitle", path, { optional: true, max: 40 });
  c.str(json, "levelGoal", path, { optional: true, max: 300 });

  const requires = c.strArr(json, "requires", path, { optional: true, max: 10 });
  requires?.forEach((r, n) => {
    if (!MISSION_ID_RE.test(r)) c.err(`${path}.requires[${n}]`, `"${r}" is not a mission id`);
    if (r === json.id) c.err(`${path}.requires[${n}]`, "a mission cannot require itself");
  });

  const badges = c.arr(json, "badges", path, { optional: true, max: 6 });
  const badgeIds = new Set<string>();
  badges?.forEach((b, n) => {
    const p = `${path}.badges[${n}]`;
    if (!isObj(b)) return c.err(p, "must be an object");
    c.keys(b, ["id", "label", "sub", "tool"], p);
    const id = c.str(b, "id", p, { re: BADGE_ID_RE });
    if (id !== undefined) {
      if (badgeIds.has(id)) c.err(p, `duplicate badge "${id}"`);
      badgeIds.add(id);
    }
    c.str(b, "label", p, { max: 40 });
    c.str(b, "sub", p, { optional: true, max: 80 });
    c.bool(b, "tool", p);
  });
  if (kind === "skip_test" && badges && badges.length > 0) c.err(`${path}.badges`, "a skip test awards no badge");

  // Caps.
  const caps = c.obj(json, "caps", path);
  let capSum = 0;
  if (caps) {
    for (const [part, v] of Object.entries(caps)) {
      if (part.length < 1 || part.length > 20) c.err(`${path}.caps`, `part "${part}" must be 1–20 chars`);
      if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 2000) {
        c.err(`${path}.caps.${part}`, "must be an integer 0–2000");
      } else capSum += v;
    }
  }
  for (const key of ["xp", "total"] as const) {
    const declared = c.num(json, key, path, { optional: true, int: true, min: 0 });
    if (declared !== undefined && caps && declared !== capSum) {
      c.err(`${path}.${key}`, `declares ${declared} but the caps sum to ${capSum}`);
    }
  }

  // Screens.
  const w: Walk = {
    c,
    screenIds: new Set(),
    interactionIds: new Set(),
    partsUsed: new Map(),
    types: [],
    skippable: false,
    conditional: false,
    ifs: [],
  };
  const screens = c.arr(json, "screens", path, { min: 1, max: 40 });
  screens?.forEach((s, n) => {
    const p = `${path}.screens[${n}]`;
    if (!isObj(s)) return c.err(p, "must be an object");
    c.keys(s, ["id", "beat", "skippable", "media", "blocks", "next"], p);
    const id = c.str(s, "id", p, { re: LOCAL_ID_RE });
    if (id !== undefined) {
      if (w.screenIds.has(id)) c.err(p, `duplicate screen id "${id}"`);
      w.screenIds.add(id);
    }
    const beat = c.oneOf(s, "beat", BEATS, p);
    const skippable = c.bool(s, "skippable", p) === true;
    if (skippable && beat !== undefined && beat !== "알기" && beat !== "해보기") {
      c.err(`${p}.skippable`, "only 알기 and 해보기 screens can be skipped");
    }
    if (skippable && kind === "skip_test") c.err(`${p}.skippable`, "a skip test has no skippable screens");
    const media = c.obj(s, "media", p, true);
    if (media) {
      const mp = `${p}.media`;
      c.keys(media, ["kind", "seconds", "brief", "alt", "src"], mp);
      c.oneOf(media, "kind", ["motion", "video", "screenshot"] as const, mp);
      c.num(media, "seconds", mp, { optional: true, min: 0, max: 600 });
      c.str(media, "brief", mp, { optional: true });
      c.str(media, "alt", mp, { optional: true, max: 300 });
      const src = c.str(media, "src", mp, { optional: true, max: 500 });
      // A produced asset is shown to learners, so it needs Korean alt text.
      if (src !== undefined && media.alt === undefined) c.err(mp, "an asset with src needs a Korean alt");
    }
    c.str(s, "next", p, { optional: true, max: 30 });
    w.skippable = skippable;
    const blocks = c.arr(s, "blocks", p, { min: 1, max: 30 });
    if (blocks) checkBlocks(w, blocks, `${p}.blocks`, false);
  });

  // Every `if` names an I7 of this mission and values it can take.
  for (const f of w.ifs) {
    const target = w.types.find((x) => x.type === "I7" && x.i.id === f.choice);
    if (!target) {
      c.err(f.path, `"${f.choice}" is not an I7 of this mission`);
      continue;
    }
    const opts = Array.isArray(target.i.options) ? target.i.options : [];
    const values = new Set(opts.filter(isObj).map((o) => o.v));
    for (const v of f.values) if (!values.has(v)) c.err(f.path, `"${v}" is not an option of ${f.choice}`);
  }

  if (caps) {
    for (const [part, where] of w.partsUsed) {
      if (!(part in caps)) c.err(where, `part "${part}" has no cap in mission.caps`);
    }
  }

  // A skip test holds one I1, one pick (I2, or a single-answer I6/I7) and one I3.
  if (kind === "skip_test") {
    const count = (t: string) => w.types.filter((x) => x.type === t).length;
    if (count("I1") !== 1) c.err(path, "a skip test needs exactly one I1");
    if (count("I3") !== 1) c.err(path, "a skip test needs exactly one I3");
    const picks = w.types.filter(
      (x) => x.type === "I2" || ((x.type === "I6" || x.type === "I7") && typeof x.i.answer === "string"),
    );
    if (picks.length !== 1) c.err(path, "a skip test needs exactly one pick (I2, or an I6/I7 with one answer)");
    const sorts = w.types.find((x) => x.type === "I1");
    if (sorts && Array.isArray(sorts.i.cards) && sorts.i.cards.some((card) => isObj(card) && card.answer === "mix")) {
      c.err(sorts.path, 'a skip test sorts into "p" and "j" only');
    }
  }

  checkCopy(c, json);

  if (c.errors.length > 0) return { ok: false, errors: c.errors };
  return { ok: true, mission: json as unknown as MissionContent };
}

/**
 * Rules across the missions of one course level (all already valid on their
 * own): unique ids and ord, the boss last, at most one boss and one skip
 * test, and `requires` naming missions on the path of this level or earlier.
 * `known` lists mission ids of other levels that `requires` may name.
 */
export function validateLevel(missions: MissionContent[], known: ReadonlySet<string> = new Set()): string[] {
  const errors: string[] = [];
  if (missions.length === 0) return errors;
  const where = `${missions[0].course} L${missions[0].level}`;
  const ids = new Set<string>();
  const ords = new Set<number>();
  for (const m of missions) {
    if (ids.has(m.id)) errors.push(`${where}: duplicate mission id ${m.id}`);
    ids.add(m.id);
    if (m.course !== missions[0].course || m.level !== missions[0].level) {
      errors.push(`${where}: ${m.id} is ${m.course} L${m.level}`);
    }
    if (m.kind !== "skip_test") {
      if (ords.has(m.ord)) errors.push(`${where}: duplicate ord ${m.ord}`);
      ords.add(m.ord);
    }
  }
  const path = missions.filter((m) => m.kind !== "skip_test");
  const skips = missions.filter((m) => m.kind === "skip_test");
  if (skips.length > 1) errors.push(`${where}: more than one skip test`);
  const bosses = path.filter((m) => m.boss);
  if (bosses.length > 1) errors.push(`${where}: more than one boss`);
  if (bosses.length === 1) {
    const maxOrd = Math.max(...path.map((m) => m.ord));
    if (bosses[0].ord !== maxOrd) errors.push(`${where}: the boss ${bosses[0].id} is not last by ord`);
  }
  const pathIds = new Set(path.map((m) => m.id));
  for (const m of path) {
    for (const r of m.requires ?? []) {
      if (!pathIds.has(r) && !known.has(r)) errors.push(`${where}: ${m.id} requires unknown mission ${r}`);
      if (skips.some((s) => s.id === r)) errors.push(`${where}: ${m.id} requires the skip test ${r}`);
    }
  }
  return errors;
}
