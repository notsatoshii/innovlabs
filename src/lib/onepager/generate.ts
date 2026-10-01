// One-pager generation (Phase 3). Server only.
//
// CLAUDE.md rule 4: template with constrained slots, never free-form.
//   Slot 1 Mirror         <- Q8, Q9, Q6, Q7, Q3, Q1 (industry)
//   Slot 2 Week mapping   <- week numbers and titles from structure.json, in
//                            code; the model writes one sentence per
//                            personalized week from the static fact sheet
//   Slot 3 Hedged outcome <- Q5 totals, Q15, Q18; range + measurement only
//   Slot 4 Close          <- Q16, Q15
//
// Flow: one structured-output call -> every slot checked by ./guard.ts ->
// if any slot fails, one retry -> a slot that fails twice gets its template
// from ./fallback.ts. A guard violation never fails the page. Only an API
// error (network, auth, rate limit, 5xx) throws.

import Anthropic from "@anthropic-ai/sdk";
import type { TrackId } from "@/lib/survey/types";
import {
  COURSE_STRUCTURE,
  PERSONALIZED_WEEKS,
  loadFactSheet,
  renderStructure,
  staticWeekSentence,
} from "./curriculum";
import { fallbackClosing, fallbackMirror, fallbackOutcome } from "./fallback";
import {
  checkSlot,
  latinTerms,
  numbersIn,
  tidy,
  type GuardContext,
  type SlotKind,
  type Violation,
} from "./guard";
import { buildLearnerFacts, type LearnerFacts } from "./learner";
import {
  OUTPUT_SCHEMA,
  WEEK_KEYS,
  buildRetryNote,
  buildSystem,
  buildUserTurn,
  type ModelDraft,
  type WeekKey,
} from "./prompt";
import { ONE_PAGER_VERSION, type OnePager } from "./types";

export type { OnePager, OnePagerWeek } from "./types";

/**
 * claude-sonnet-5 accepts thinking: disabled. If this moves to
 * claude-sonnet-5-5 (review P2-17), `disabled` is a 400 there: send
 * thinking: { type: "between_tools" } instead.
 */
const MODEL = "claude-sonnet-5";

/**
 * Thinking is off, so every output token is JSON. A full answer is about
 * 1,000–1,500 tokens; 8,000 leaves room that the slot length caps never use.
 * stop_reason is still checked: anything but end_turn is treated as unusable.
 */
const MAX_TOKENS = 8000;

/** Bounds one request to roughly 90 s (one SDK retry) instead of the 10 min default. */
const REQUEST_TIMEOUT_MS = 45_000;
const SDK_RETRIES = 1;

/** Slot ids as the retry note and the logs name them. */
type SlotId = "mirror" | "outcome" | "closing" | `weeks.${WeekKey}`;

const SLOT_KIND: Record<SlotId, SlotKind> = {
  mirror: "mirror",
  outcome: "outcome",
  closing: "closing",
  ...(Object.fromEntries(WEEK_KEYS.map((k) => [`weeks.${k}`, "week"])) as Record<
    `weeks.${WeekKey}`,
    SlotKind
  >),
};

const SLOT_IDS = Object.keys(SLOT_KIND) as SlotId[];

/** Latin terms the model may always use, beyond those in the facts and answers. */
const BASE_TERMS = ["ai", "pc"];

function buildGuardContext(facts: LearnerFacts, factSheet: string, userTurn: string): GuardContext {
  const learnerText = [
    facts.mirrorText,
    facts.frictionText,
    facts.tenHoursText,
    facts.departmentOther,
  ].join(" ");
  return {
    hours: facts.hours,
    learnerNumbers: new Set(numbersIn(learnerText)),
    allowedTerms: new Set([
      ...BASE_TERMS,
      ...latinTerms(factSheet),
      ...latinTerms(renderStructure()),
      ...latinTerms(userTurn),
    ]),
  };
}

/** Pulls the slot texts out of a parsed model answer; anything malformed becomes "". */
function readDraft(parsed: unknown): Record<SlotId, string> {
  const root = (parsed && typeof parsed === "object" ? parsed : {}) as Partial<
    Record<keyof ModelDraft, unknown>
  >;
  const weeks = (root.weeks && typeof root.weeks === "object" ? root.weeks : {}) as Record<
    string,
    unknown
  >;
  const out = {} as Record<SlotId, string>;
  out.mirror = tidy(root.mirror);
  out.outcome = tidy(root.outcome);
  out.closing = tidy(root.closing);
  for (const key of WEEK_KEYS) out[`weeks.${key}`] = tidy(weeks[key]);
  return out;
}

/**
 * One model call. Returns the slot texts, or null when the model answered but
 * the answer cannot be used (refusal, truncation, not JSON). API errors throw.
 */
async function callModel(
  client: Anthropic,
  system: Anthropic.TextBlockParam[],
  userTurn: string,
): Promise<Record<SlotId, string> | null> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    thinking: { type: "disabled" },
    system,
    messages: [{ role: "user", content: userTurn }],
    output_config: { format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
  });

  // Token counts only: no learner text in the logs. cache_read > 0 on a
  // second request within five minutes is the live check for P1-11.
  const u = response.usage;
  console.info(
    `one-pager model call: stop=${response.stop_reason} in=${u.input_tokens} ` +
      `cache_write=${u.cache_creation_input_tokens ?? 0} cache_read=${u.cache_read_input_tokens ?? 0} ` +
      `out=${u.output_tokens}`,
  );

  if (response.stop_reason !== "end_turn") return null;
  const text = response.content.find((b) => b.type === "text")?.text;
  if (!text) return null;
  try {
    return readDraft(JSON.parse(text));
  } catch {
    return null;
  }
}

function violationsOf(
  draft: Record<SlotId, string> | null,
  slots: SlotId[],
  ctx: GuardContext,
): Map<SlotId, Violation[]> {
  const failed = new Map<SlotId, Violation[]>();
  for (const slot of slots) {
    const found: Violation[] = draft ? checkSlot(SLOT_KIND[slot], draft[slot], ctx) : ["empty"];
    if (found.length > 0) failed.set(slot, found);
  }
  return failed;
}

export async function generateOnePager(opts: {
  core: Record<string, unknown>;
  track: TrackId;
  depthFlag: string | null;
}): Promise<OnePager> {
  const facts = buildLearnerFacts(opts.core, opts.track, opts.depthFlag);
  const factSheet = loadFactSheet(opts.track);
  const system = buildSystem(factSheet);
  const userTurn = buildUserTurn(facts);
  const ctx = buildGuardContext(facts, factSheet, userTurn);

  // ANTHROPIC_API_KEY from the server env.
  const client = new Anthropic({ timeout: REQUEST_TIMEOUT_MS, maxRetries: SDK_RETRIES });

  const accepted = new Map<SlotId, string>();

  const first = await callModel(client, system, userTurn);
  let failed = violationsOf(first, SLOT_IDS, ctx);
  for (const slot of SLOT_IDS) {
    if (first && !failed.has(slot)) accepted.set(slot, first[slot]);
  }

  if (failed.size > 0) {
    // One retry. Slots that already passed keep their first text; the retry
    // can only fill the ones that failed.
    const retryTurn = `${userTurn}\n\n${buildRetryNote(failed)}`;
    const second = await callModel(client, system, retryTurn);
    const stillFailed = violationsOf(second, [...failed.keys()], ctx);
    for (const slot of failed.keys()) {
      if (second && !stillFailed.has(slot)) accepted.set(slot, second[slot]);
    }
    failed = stillFailed;
  }

  if (failed.size > 0) {
    // Slot names and rule names only: never the text, never learner data.
    console.warn(
      "one-pager: templated fallback used for",
      [...failed.entries()].map(([slot, v]) => `${slot}(${v.join("+")})`).join(", "),
    );
  }

  const personalized = new Set<number>(PERSONALIZED_WEEKS);
  return {
    v: ONE_PAGER_VERSION,
    mirror: accepted.get("mirror") ?? fallbackMirror(facts),
    // Slot 2: numbers and titles come from structure.json, never from the model.
    weeks: COURSE_STRUCTURE.weeks.map((w) => ({
      week: w.week,
      title: w.title,
      connection:
        (personalized.has(w.week)
          ? accepted.get(`weeks.w${w.week}` as SlotId)
          : undefined) ?? staticWeekSentence(w),
    })),
    outcome: accepted.get("outcome") ?? fallbackOutcome(facts),
    closing: accepted.get("closing") ?? fallbackClosing(facts),
  };
}
