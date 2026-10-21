// What a mission keeps between its screens in the learner's own row
// (public.course_local, migration 0013): the assistant outputs pasted in an
// I11 round, the branch picks of I7s without a right answer, and the slip
// flag of an ordered checklist. Pure: POST /api/course/local checks a body
// with checkLocalPatch() before it writes, the mission page turns the row
// into the player's start state with localFromRow(), and the self test runs
// both. Nothing outside these three fields is stored.

import { missionInteractions } from "./score";
import { LOCAL_ID_RE } from "./validate";
import type { CourseLocalRow, MissionContent } from "./types";

/** The longest pasted round kept (the I11 field's own maxLength). */
export const ROUND_MAX_CHARS = 20000;

export interface LocalPatch {
  rounds?: Partial<Record<"1" | "2", string>>;
  choices?: Record<string, string>;
  slip?: boolean;
}

export interface LocalValue {
  rounds: Partial<Record<1 | 2, string>>;
  choices: Record<string, string>;
  slip: boolean;
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * The body's rounds / choices / slip, checked against the mission: a round
 * only for a round one of its I11s has (at most ROUND_MAX_CHARS; "" clears
 * it), a choice only for an I7 without an answer and only one of its options
 * (an I7 over the learner's rows takes a row id), slip only with an ordered
 * I10. `problems` names what was refused; nothing is half accepted.
 */
export function checkLocalPatch(
  mission: MissionContent,
  body: Record<string, unknown>,
): { ok: true; patch: LocalPatch } | { ok: false; problems: string[] } {
  const problems: string[] = [];
  const patch: LocalPatch = {};
  const its = missionInteractions(mission).map((x) => x.interaction);
  const roundsHere = new Set(its.flatMap((i) => (i.type === "I11" ? [String(i.round)] : [])));

  if (body.rounds !== undefined) {
    if (!isObj(body.rounds)) problems.push("rounds");
    else {
      const out: Partial<Record<"1" | "2", string>> = {};
      for (const [k, v] of Object.entries(body.rounds)) {
        if (!roundsHere.has(k) || (k !== "1" && k !== "2")) problems.push(`rounds.${k}`);
        else if (typeof v !== "string" || v.length > ROUND_MAX_CHARS) problems.push(`rounds.${k}`);
        else out[k] = v;
      }
      patch.rounds = out;
    }
  }

  if (body.choices !== undefined) {
    if (!isObj(body.choices) || Object.keys(body.choices).length > 20) problems.push("choices");
    else {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(body.choices)) {
        const it = its.find((i) => i.id === k);
        const branch = it && it.type === "I7" && it.answer === undefined ? it : null;
        if (!branch || typeof v !== "string") {
          problems.push(`choices.${k}`);
          continue;
        }
        const allowed = branch.from ? LOCAL_ID_RE.test(v) : branch.options.some((o) => o.v === v && !o.hold);
        if (!allowed) problems.push(`choices.${k}`);
        else out[k] = v;
      }
      patch.choices = out;
    }
  }

  if (body.slip !== undefined) {
    const ordered = its.some((i) => i.type === "I10" && i.ordered);
    if (typeof body.slip !== "boolean" || !ordered) problems.push("slip");
    else patch.slip = body.slip;
  }

  if (patch.rounds === undefined && patch.choices === undefined && patch.slip === undefined && problems.length === 0) {
    problems.push("empty");
  }
  return problems.length > 0 ? { ok: false, problems } : { ok: true, patch };
}

/** The stored row merged with a patch (rounds and choices merge by key; "" removes a round). */
export function mergeLocal(
  row: Pick<CourseLocalRow, "rounds" | "choices" | "slip"> | null,
  patch: LocalPatch,
): Required<LocalPatch> {
  const rounds: Partial<Record<"1" | "2", string>> = { ...(row?.rounds ?? {}) };
  for (const [k, v] of Object.entries(patch.rounds ?? {}) as ["1" | "2", string][]) {
    if (v) rounds[k] = v;
    else delete rounds[k];
  }
  return {
    rounds,
    choices: { ...(row?.choices ?? {}), ...(patch.choices ?? {}) },
    slip: patch.slip ?? row?.slip ?? false,
  };
}

/** The player's start state from the stored row (anything malformed is dropped). */
export function localFromRow(row: Partial<Pick<CourseLocalRow, "rounds" | "choices" | "slip">> | null): LocalValue {
  const rounds: Partial<Record<1 | 2, string>> = {};
  if (row && isObj(row.rounds)) {
    for (const k of [1, 2] as const) {
      const v = (row.rounds as Record<string, unknown>)[String(k)];
      if (typeof v === "string" && v) rounds[k] = v;
    }
  }
  const choices: Record<string, string> = {};
  if (row && isObj(row.choices)) {
    for (const [k, v] of Object.entries(row.choices)) if (typeof v === "string") choices[k] = v;
  }
  return { rounds, choices, slip: row?.slip === true };
}
