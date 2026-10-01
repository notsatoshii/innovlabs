// Level picks and the pure list helpers behind the 도구 view
// (docs/app/phases/ui-tools-redesign.md §5.2, §5.3, §5.7). No server imports:
// the client-side ToolLibrary and scripts/seed-resources.ts both use this.

import type { DepthFlag } from "@/lib/survey/types";
import {
  CATEGORY_LABEL,
  DIFFICULTY_LABEL,
  type Difficulty,
  type ToolEntry,
  type ToolPath,
  type TrackCode,
} from "./types";

/** One entry of content/resources/picks.json: the curated picks for a level. */
export interface LevelPicks {
  level: Difficulty; // one entry per level
  ids: string[]; // tool ids in display order, at most 5; the LAST one is the swap slot
  reason: string; // Korean, 해요체, about two lines at 13px
}

export const LEVELS: readonly Difficulty[] = [1, 2, 3, 4];
export const MAX_PICKS = 5;

/** "L1" */
export function levelShort(level: Difficulty): string {
  return `L${level}`;
}

/** "누구나": the badge text without its "L1 " prefix. */
export function levelName(level: Difficulty): string {
  return DIFFICULTY_LABEL[level].badge.replace(/^L\d\s*/, "");
}

/** The learner's own level from the survey depth flag; null when unknown. */
export function levelFromDepthFlag(flag: DepthFlag | null | undefined): Difficulty | null {
  if (flag === "browser_only") return 1;
  if (flag === "full_agent") return 3;
  return null;
}

// --- picks -----------------------------------------------------------------

const bySortOrder = (a: ToolEntry, b: ToolEntry): number =>
  a.sort_order - b.sort_order || a.id.localeCompare(b.id);

/**
 * Picks for one level, in file order. Ids that are missing, drafts, or at
 * another level are dropped. Track slot: when the learner has a track and no
 * pick is tagged with it, the lowest-sort_order taught tool at this level
 * tagged with that track replaces the last pick (or is appended under five).
 * An empty result means "render no picks section".
 */
export function resolvePicks(
  picks: LevelPicks[],
  tools: ToolEntry[],
  level: Difficulty,
  track: TrackCode | null,
): { tools: ToolEntry[]; reason: string } {
  const entry = picks.find((p) => p.level === level);
  if (!entry) return { tools: [], reason: "" };

  const byId = new Map(tools.map((t) => [t.id, t]));
  const list: ToolEntry[] = [];
  for (const id of entry.ids) {
    const tool = byId.get(id);
    if (!tool || tool.difficulty !== level || tool.status === "draft") continue;
    if (!list.includes(tool)) list.push(tool);
    if (list.length === MAX_PICKS) break;
  }
  if (list.length === 0) return { tools: [], reason: "" };

  if (track && !list.some((t) => t.tracks.includes(track))) {
    const swap = tools
      .filter(
        (t) =>
          t.difficulty === level &&
          t.status === "taught" &&
          t.tracks.includes(track) &&
          !list.includes(t),
      )
      .sort(bySortOrder)[0];
    if (swap) {
      if (list.length >= MAX_PICKS) list[list.length - 1] = swap;
      else list.push(swap);
    }
  }
  return { tools: list, reason: entry.reason };
}

/**
 * Problems in picks.json against the tool list, as readable lines. Empty
 * when the file is sound. Used by the seed script, which refuses to run on
 * any problem: a pick that points at nothing would silently disappear from
 * the page otherwise.
 */
export function pickProblems(raw: unknown, tools: ToolEntry[]): string[] {
  if (!Array.isArray(raw)) return ["top level must be an array"];
  const problems: string[] = [];
  const byId = new Map(tools.map((t) => [t.id, t]));
  const seenLevels = new Set<number>();

  raw.forEach((entry: unknown, index) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      problems.push(`entry #${index}: not an object`);
      return;
    }
    const e = entry as Record<string, unknown>;
    const level = e.level;
    const where = `level ${JSON.stringify(level)}`;
    if (typeof level !== "number" || !(LEVELS as readonly number[]).includes(level)) {
      problems.push(`entry #${index}: "level" must be 1, 2, 3 or 4 (got ${JSON.stringify(level)})`);
      return;
    }
    if (seenLevels.has(level)) problems.push(`${where}: more than one entry for this level`);
    seenLevels.add(level);

    for (const key of Object.keys(e)) {
      if (key !== "level" && key !== "ids" && key !== "reason") {
        problems.push(`${where}: unknown key "${key}"`);
      }
    }
    if (typeof e.reason !== "string" || e.reason.trim() === "") {
      problems.push(`${where}: "reason" must be a non-empty string`);
    }
    if (!Array.isArray(e.ids) || e.ids.some((id) => typeof id !== "string")) {
      problems.push(`${where}: "ids" must be an array of strings`);
      return;
    }
    const ids = e.ids as string[];
    if (ids.length === 0) problems.push(`${where}: "ids" is empty`);
    if (ids.length > MAX_PICKS) {
      problems.push(`${where}: ${ids.length} ids, at most ${MAX_PICKS} allowed`);
    }
    if (new Set(ids).size !== ids.length) problems.push(`${where}: "ids" has duplicates`);
    for (const id of ids) {
      const tool = byId.get(id);
      if (!tool) {
        problems.push(`${where}: pick "${id}" is not in tools.json`);
      } else if (tool.status === "draft") {
        problems.push(`${where}: pick "${id}" is a draft and never reaches the page`);
      } else if (tool.difficulty !== level) {
        problems.push(
          `${where}: pick "${id}" has difficulty ${tool.difficulty}, listed under level ${level}`,
        );
      }
    }
  });
  return problems;
}

// --- ordering --------------------------------------------------------------

const STATUS_RANK: Record<ToolEntry["status"], number> = {
  taught: 0,
  mentioned: 1,
  reference: 2,
  draft: 3,
};

/** Own path first, then tools explicitly tagged with the own track, then sort_order, id. */
function compareWithinStatus(path: ToolPath | null, track: TrackCode | null) {
  return (a: ToolEntry, b: ToolEntry): number => {
    if (path) {
      const d = Number(b.paths.includes(path)) - Number(a.paths.includes(path));
      if (d !== 0) return d;
    }
    if (track) {
      const d = Number(b.tracks.includes(track)) - Number(a.tracks.includes(track));
      if (d !== 0) return d;
    }
    return bySortOrder(a, b);
  };
}

/**
 * List order for one level: taught, then mentioned, then reference; inside
 * each, the learner's path, then the learner's track, then sort_order, id.
 */
export function compareForLearner(path: ToolPath | null, track: TrackCode | null) {
  const rest = compareWithinStatus(path, track);
  return (a: ToolEntry, b: ToolEntry): number =>
    STATUS_RANK[a.status] - STATUS_RANK[b.status] || rest(a, b);
}

/**
 * Search results in two groups. `reachable` is everything at or below the
 * selected level: by status, then the level closest to the selected one,
 * then path, track, sort_order. `harder` is everything above it: by level
 * ascending, then the same list order as a single level.
 */
export function groupQueryResults(
  hits: ToolEntry[],
  level: Difficulty,
  path: ToolPath | null,
  track: TrackCode | null,
): { reachable: ToolEntry[]; harder: ToolEntry[] } {
  const rest = compareWithinStatus(path, track);
  const list = compareForLearner(path, track);
  return {
    reachable: hits
      .filter((t) => t.difficulty <= level)
      .sort(
        (a, b) =>
          STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
          b.difficulty - a.difficulty ||
          rest(a, b),
      ),
    harder: hits
      .filter((t) => t.difficulty > level)
      .sort((a, b) => a.difficulty - b.difficulty || list(a, b)),
  };
}

// --- text ------------------------------------------------------------------

const SENTENCE_END = /[.!?](?=\s|$)/;

/** The first sentence: text up to the first ".", "!" or "?" followed by a space or the end. */
export function oneLiner(text: string): string {
  const m = SENTENCE_END.exec(text);
  return m ? text.slice(0, m.index + 1) : text;
}

/**
 * Case-insensitive match: every whitespace-separated word must appear in the
 * name, id, category (slug or Korean label), tags, or one of the five text
 * fields.
 */
export function matchesQuery(t: ToolEntry, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [
    t.name,
    t.id,
    t.category,
    CATEGORY_LABEL[t.category] ?? "",
    ...t.tags,
    t.what_it_is,
    t.use_it_to ?? "",
    t.why_it_matters ?? "",
    t.watch_out ?? "",
    t.korean_notes ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return q.split(/\s+/).every((word) => hay.includes(word));
}

/** A row sentence with the matched word split out so the caller can mark it. */
export interface Snippet {
  lead: string;
  hit: string; // empty when the match was not in a text field
  tail: string;
}

/** How far before the match a snippet may start, in characters. */
const SNIPPET_LEAD = 14;

/**
 * The sentence around the first query word, looked up in use_it_to,
 * what_it_is, why_it_matters, watch_out, korean_notes in that order. When
 * the match sits more than 14 characters into its sentence, the snippet
 * starts at the nearest word boundary within those 14 characters, after "…".
 * No text-field match (the hit was in the name, a tag or the category):
 * the first sentence of what_it_is.
 */
export function snippetFor(tool: ToolEntry, query: string): Snippet {
  const word = query.trim().toLowerCase().split(/\s+/)[0] ?? "";
  if (word) {
    const fields = [
      tool.use_it_to,
      tool.what_it_is,
      tool.why_it_matters,
      tool.watch_out,
      tool.korean_notes,
    ];
    for (const text of fields) {
      if (!text) continue;
      const at = text.toLowerCase().indexOf(word);
      if (at === -1) continue;

      // Sentence bounds around the match.
      let start = 0;
      let end = text.length;
      const stops = /[.!?](?=\s|$)/g;
      let m: RegExpExecArray | null;
      while ((m = stops.exec(text))) {
        const stop = m.index + 1;
        if (stop <= at) start = stop;
        else if (stop >= at + word.length) {
          end = stop;
          break;
        }
      }
      while (start < at && /\s/.test(text[start])) start++;

      let from = start;
      let ellipsis = "";
      if (at - start > SNIPPET_LEAD) {
        // First word start inside the window; failing that, the start of the
        // word that holds the match.
        from = -1;
        for (let i = at - SNIPPET_LEAD; i <= at; i++) {
          if (/\s/.test(text[i - 1] ?? " ")) {
            from = i;
            break;
          }
        }
        if (from === -1) {
          from = at;
          while (from > start && !/\s/.test(text[from - 1])) from--;
        }
        if (from > start) ellipsis = "…";
      }
      return {
        lead: ellipsis + text.slice(from, at),
        hit: text.slice(at, at + word.length),
        tail: text.slice(at + word.length, end),
      };
    }
  }
  return { lead: oneLiner(tool.what_it_is), hit: "", tail: "" };
}
