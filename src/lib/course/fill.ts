// Pure slot filling for the online course, shared by the server (slots.ts)
// and the mission player in the browser. No I/O and no server imports.
//
// Most slots are fixed for a visit and are filled on the server. The "live"
// ones come from the learner's Work Map, which changes while a mission is
// played (M1.4 classifies rows, then shows the 처리 hours on the next screen;
// M1.5 picks candidates, then names candidate #1). The server leaves those
// placeholders in place and sends their values as a fallback; the player
// fills them from the work_map draft it is editing (review P1-1).

import { totals } from "@/lib/courses/work-map";
import type { WorkMapDraft } from "@/lib/courses/types";
import type { WorkMapSnapshot } from "@/lib/profile/types";
import type { Block, BlockWhen, MissionContent, Screen, SlotKey } from "./types";

export type SlotValues = Record<SlotKey, string>;

export const LIVE_SLOTS = ["p_hours", "j_hours", "row_count", "candidate1", "candidate2"] as const;
export type LiveSlot = (typeof LIVE_SLOTS)[number];
export type LiveValues = Record<LiveSlot, string>;

function clean(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\p{Cc}/gu, " ").replace(/\s+/g, " ").trim();
}

function hours(n: number): string {
  return String(Math.round(n * 10) / 10);
}

/**
 * The Work Map slots: the draft while the map is being built (rows with a
 * task only, so StepWrite's empty rows are not counted), else the submitted
 * snapshot. candidate1/2 are "" when neither has one.
 */
export function workMapSlots(draft: WorkMapDraft | null, snapshot: WorkMapSnapshot | null): LiveValues & { fromDraft: boolean } {
  const named = (draft?.rows ?? []).filter((r) => r.task.trim().length > 0);
  const useDraft = named.length > 0;
  const t = useDraft ? totals(named) : null;
  const pHours = t ? t.p_hours : (snapshot?.totals.p_hours ?? 0);
  const jHours = t ? t.t_hours : (snapshot?.totals.t_hours ?? 0);
  const rowCount = useDraft ? named.length : (snapshot?.rows.length ?? 0);

  const candidate = (rank: 1 | 2): string => {
    // The draft's pick while M1.5 is being played, else the submitted map.
    const pick = draft?.candidates[rank - 1];
    const fromDraft = pick ? clean(draft?.rows.find((r) => r.id === pick.rowId)?.task) : "";
    if (fromDraft) return fromDraft;
    const snap = snapshot?.candidates.find((c) => c.rank === rank);
    return snap && snapshot && snap.task_row >= 0 ? clean(snapshot.rows[snap.task_row]?.task) : "";
  };

  return {
    p_hours: hours(pHours),
    j_hours: hours(jHours),
    row_count: String(rowCount),
    candidate1: candidate(1),
    candidate2: candidate(2),
    fromDraft: useDraft,
  };
}

/** Browser: the live slots from the draft being edited, over the server's values. */
export function liveSlots(draft: WorkMapDraft | null, fallback: LiveValues): LiveValues {
  const w = workMapSlots(draft, null);
  if (!w.fromDraft) return fallback;
  return {
    p_hours: w.p_hours,
    j_hours: w.j_hours,
    row_count: w.row_count,
    candidate1: w.candidate1 || fallback.candidate1,
    candidate2: w.candidate2 || fallback.candidate2,
  };
}

const SLOT_RE = /\{\{\s*([a-z0-9_]+)\s*\}\}/g;

function fill(text: string, values: Partial<SlotValues>): string {
  if (!text.includes("{{")) return text;
  return text.replace(SLOT_RE, (whole, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? (values[key as SlotKey] ?? whole) : whole,
  );
}

/** Pure: a deep copy of `value` with every {{slot}} that `values` names replaced (others stay). */
export function resolveSlots<T>(value: T, values: Partial<SlotValues>): T {
  if (typeof value === "string") return fill(value, values) as T;
  if (Array.isArray(value)) return value.map((v) => resolveSlots(v, values)) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = resolveSlots(v, values);
    return out as T;
  }
  return value;
}

/** Pure: the blocks whose `when` holds (blocks without one always stay), fallbacks included. */
export function filterBlocks(blocks: Block[], holds: (w: BlockWhen) => boolean): Block[] {
  const out: Block[] = [];
  for (const b of blocks) {
    if (b.when && !holds(b.when)) continue;
    out.push(b.t === "fallback" ? { ...b, blocks: filterBlocks(b.blocks, holds) } : b);
  }
  return out;
}

/** Pack documents' names from the checklist items that hand them over (B1: 잘된 예시 하나, 양식, 이번 주 재료). */
function packNames(mission: MissionContent): Map<string, string> {
  const names = new Map<string, string>();
  const walk = (blocks: Block[]) => {
    for (const b of blocks) {
      if (b.t === "fallback") walk(b.blocks);
      else if (b.t === "i" && b.i.type === "I10") {
        for (const item of b.i.items) if (item.packId && !names.has(item.packId)) names.set(item.packId, item.label);
      }
    }
  };
  for (const s of mission.screens) walk(s.blocks);
  return names;
}

/** A doc label without the internal pack id ("재료 보기 (SP-SYN-01-R0)" → "재료 보기 · 잘된 예시 하나"). */
export function docLabel(label: string, packId: string, names: ReadonlyMap<string, string>): string {
  const base = label
    .split(packId)
    .join("")
    .replace(/\(\s*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  const name = names.get(packId);
  if (!name) return base;
  return base ? `${base} · ${name}` : name;
}

function withDocLabels(blocks: Block[], names: ReadonlyMap<string, string>): Block[] {
  return blocks.map((b) => {
    if (b.t === "doc" && b.packId && b.label) return { ...b, label: docLabel(b.label, b.packId, names) };
    if (b.t === "fallback") return { ...b, blocks: withDocLabels(b.blocks, names) };
    return b;
  });
}

/**
 * Pure: the mission as the browser may see it. Drops blocks whose `when`
 * fails for this learner, removes every media production brief (they are
 * notes for the media team, often in English; review P0-2), and takes the
 * internal pack ids out of document labels (review P1-7).
 */
export function forBrowser(mission: MissionContent, flags: { q8Short: boolean }): MissionContent {
  const holds = (w: BlockWhen) => (w === "q8_short" ? flags.q8Short : !flags.q8Short);
  const names = packNames(mission);
  const screens: Screen[] = mission.screens.map((s) => {
    const next: Screen = { ...s, blocks: withDocLabels(filterBlocks(s.blocks, holds), names) };
    if (s.media) {
      const { brief: _brief, ...media } = s.media;
      void _brief;
      next.media = media;
    }
    return next;
  });
  return { ...mission, screens };
}
