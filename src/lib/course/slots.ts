// Personalization slots (phase-online.md O1-D6, game design §5.2). Every
// {{slot}} in a mission is replaced on the server before the mission reaches
// the browser. Values come from user_profile.core (the survey answers seeded
// at registration), the confirmed or assigned track, and the learner's Work
// Map (the draft while it is being built, the submitted snapshot after).
// Static variants only: nothing is generated. Nothing is escaped either;
// React renders the text as text.
//
// Survey keys in core (src/components/staff/survey.ts FIELDS): Q1 industry,
// Q3 department, Q4 rank, Q8 mirror_text.

import { supabaseServer } from "@/lib/supabase/server";
import { getMyConfirmedTrack } from "@/lib/courses/queries";
import { totals } from "@/lib/courses/work-map";
import { parseWorkMapDraft } from "@/components/lab/rules";
import { cohortTrackLabel } from "@/components/staff/format";
import { TRACKS } from "@/lib/survey/tracks";
import type { TrackCode } from "@/lib/resources/types";
import type { TrackId } from "@/lib/survey/types";
import type { WorkMapDraft } from "@/lib/courses/types";
import type { UserProfile, WorkMapSnapshot } from "@/lib/profile/types";
import type { MissionContent, SlotKey } from "./types";

export type SlotValues = Record<SlotKey, string>;

/** The pack task used when Q8 is too short to quote (L1 S1 fallback). */
export const Q8_FALLBACK = "매주 월요일 팀 주간보고 취합";
const Q8_MIN_CHARS = 6;
const Q8_MAX_CHARS = 120;

const REPORT_NAME_BY_INDUSTRY: Record<string, string> = {
  manufacturing: "생산·판매 주간보고",
  retail_ecommerce: "생산·판매 주간보고",
  it_software: "스프린트 리뷰 보고",
  finance_insurance: "실적 주간보고",
  public_admin: "주간 업무 보고",
  education: "주간 업무 보고",
};
const REPORT_NAME_DEFAULT = "팀 주간보고";

/** Q4 rank -> who reads the learner's report. */
const READER_BY_RANK: Record<string, string> = {
  staff: "팀장님", // 사원 · 주임
  assistant: "팀장님", // 대리
  manager_mid: "부장님", // 과장 · 차장
  team_lead: "임원", // 팀장 · 부장
};
const READER_DEFAULT = "팀장님";
const TRACK_DEFAULT = "내 트랙";

function clean(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\p{Cc}/gu, " ").replace(/\s+/g, " ").trim();
}

function clip(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

function hours(n: number): string {
  return String(Math.round(n * 10) / 10);
}

export interface SlotInput {
  core: Record<string, unknown>;
  /** user_profile.track (the survey's track). */
  track: TrackId | null;
  /** The instructor-confirmed track, when there is one (it wins). */
  confirmedTrack: TrackCode | null;
  draft: WorkMapDraft | null;
  snapshot: WorkMapSnapshot | null;
}

export interface SlotResult {
  values: SlotValues;
  /** Q8 was shorter than 6 characters: {{q8}} is the pack task. */
  q8Fallback: boolean;
}

/** Pure: the eight slot values from what the server read. */
export function slotValues(input: SlotInput): SlotResult {
  const { core, draft, snapshot } = input;

  const q8Raw = clean(core.mirror_text);
  const q8Fallback = q8Raw.length < Q8_MIN_CHARS;
  const q8 = q8Fallback ? Q8_FALLBACK : clip(q8Raw, Q8_MAX_CHARS);

  const industry = typeof core.industry === "string" ? core.industry : "";
  const rank = typeof core.rank === "string" ? core.rank : "";

  const trackName = input.confirmedTrack
    ? cohortTrackLabel(input.confirmedTrack)
    : input.track && TRACKS[input.track]
      ? TRACKS[input.track].name
      : TRACK_DEFAULT;

  // The draft while the map is being built (M1.3–M1.5); the snapshot after.
  const draftRows = draft?.rows ?? [];
  const useDraft = draftRows.length > 0;
  const t = useDraft ? totals(draftRows) : null;
  const pHours = t ? t.p_hours : (snapshot?.totals.p_hours ?? 0);
  const jHours = t ? t.t_hours : (snapshot?.totals.t_hours ?? 0);
  const rowCount = useDraft ? draftRows.length : (snapshot?.rows.length ?? 0);

  // Candidate #1: the submitted rank 1, else the draft's first candidate, else Q8.
  let candidate1 = "";
  const snapFirst = snapshot?.candidates.find((c) => c.rank === 1);
  if (snapFirst && snapshot && snapFirst.task_row >= 0) candidate1 = clean(snapshot.rows[snapFirst.task_row]?.task);
  if (!candidate1 && draft && draft.candidates.length > 0) {
    candidate1 = clean(draft.rows.find((r) => r.id === draft.candidates[0].rowId)?.task);
  }
  if (!candidate1) candidate1 = q8;

  return {
    values: {
      q8,
      report_name: REPORT_NAME_BY_INDUSTRY[industry] ?? REPORT_NAME_DEFAULT,
      track_name: trackName,
      reader_title: READER_BY_RANK[rank] ?? READER_DEFAULT,
      candidate1,
      p_hours: hours(pHours),
      j_hours: hours(jHours),
      row_count: String(rowCount),
    },
    q8Fallback,
  };
}

const SLOT_RE = /\{\{\s*([a-z0-9_]+)\s*\}\}/g;

function fill(text: string, values: SlotValues): string {
  if (!text.includes("{{")) return text;
  return text.replace(SLOT_RE, (whole, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? values[key as SlotKey] : whole,
  );
}

/** Pure: a deep copy of `value` with every {{slot}} in every string replaced. */
export function resolveSlots<T>(value: T, values: SlotValues): T {
  if (typeof value === "string") return fill(value, values) as T;
  if (Array.isArray(value)) return value.map((v) => resolveSlots(v, values)) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = resolveSlots(v, values);
    return out as T;
  }
  return value;
}

/**
 * Server: the slot values for the signed-in learner. Reads the work_map
 * draft through the learner's own client (own rows only) and the confirmed
 * track through getMyConfirmedTrack (cached per request).
 */
export async function loadSlotValues(profile: UserProfile): Promise<SlotResult> {
  const supabase = await supabaseServer();
  const [{ data: draftRow, error }, confirmed] = await Promise.all([
    supabase
      .from("artifact_draft")
      .select("data")
      .eq("user_id", profile.user_id)
      .eq("kind", "work_map")
      .maybeSingle(),
    getMyConfirmedTrack(),
  ]);
  if (error) console.error("work_map draft read failed:", error.message);
  return slotValues({
    core: profile.core ?? {},
    track: profile.track,
    confirmedTrack: confirmed?.track ?? null,
    draft: draftRow ? parseWorkMapDraft((draftRow as { data: unknown }).data) : null,
    snapshot: profile.work_map,
  });
}

/** Server: the mission with every slot resolved for this learner. */
export async function resolveMissionFor(
  mission: MissionContent,
  profile: UserProfile,
): Promise<{ mission: MissionContent; q8Fallback: boolean }> {
  const { values, q8Fallback } = await loadSlotValues(profile);
  return { mission: resolveSlots(mission, values), q8Fallback };
}
