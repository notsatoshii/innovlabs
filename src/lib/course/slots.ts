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
import { parseWorkMapDraft } from "@/components/lab/rules";
import { cohortTrackLabel } from "@/components/staff/format";
import { TRACKS } from "@/lib/survey/tracks";
import type { TrackCode } from "@/lib/resources/types";
import type { TrackId } from "@/lib/survey/types";
import type { WorkMapDraft } from "@/lib/courses/types";
import type { UserProfile, WorkMapSnapshot } from "@/lib/profile/types";
import { LIVE_SLOTS, forBrowser, resolveSlots, workMapSlots, type LiveValues, type SlotValues } from "./fill";
import type { MissionContent } from "./types";

export { resolveSlots, type SlotValues } from "./fill";

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

/** The learner's track name, or null when neither the survey nor staff gave one. */
export function trackNameOf(track: TrackId | null, confirmedTrack: TrackCode | null): string | null {
  if (confirmedTrack) return cohortTrackLabel(confirmedTrack);
  return track && TRACKS[track] ? TRACKS[track].name : null;
}

function clean(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\p{Cc}/gu, " ").replace(/\s+/g, " ").trim();
}

function clip(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
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

  const trackName = trackNameOf(input.track, input.confirmedTrack) ?? TRACK_DEFAULT;

  // The draft while the map is being built (M1.3–M1.5), rows with a task
  // only; the snapshot after. Candidates: the draft's pick, else the
  // submitted map's, else (candidate #1) the Q8 task.
  const w = workMapSlots(draft, snapshot);
  const candidate1 = w.candidate1 || q8;

  return {
    values: {
      q8,
      report_name: REPORT_NAME_BY_INDUSTRY[industry] ?? REPORT_NAME_DEFAULT,
      track_name: trackName,
      reader_title: READER_BY_RANK[rank] ?? READER_DEFAULT,
      candidate1,
      candidate2: w.candidate2 || candidate1,
      p_hours: w.p_hours,
      j_hours: w.j_hours,
      row_count: w.row_count,
    },
    q8Fallback,
  };
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

export interface ResolvedMission {
  /** Ready for the browser: slots filled, `when` blocks applied, media briefs removed. */
  mission: MissionContent;
  q8Fallback: boolean;
  /** The live slots' values now; with keepLive their placeholders are still in `mission`. */
  live: LiveValues;
}

/**
 * Server: the mission for this learner's browser. With `keepLive`, the Work
 * Map slots stay as placeholders for the player to fill from the draft it
 * edits (fill.ts liveSlots); `live` carries their current values.
 */
export async function resolveMissionFor(
  mission: MissionContent,
  profile: UserProfile,
  opts: { keepLive?: boolean } = {},
): Promise<ResolvedMission> {
  const { values, q8Fallback } = await loadSlotValues(profile);
  const live = Object.fromEntries(LIVE_SLOTS.map((k) => [k, values[k]])) as LiveValues;
  const fixed: Partial<SlotValues> = { ...values };
  if (opts.keepLive) for (const k of LIVE_SLOTS) delete fixed[k];
  const shown = forBrowser(mission, { q8Short: q8Fallback });
  return { mission: resolveSlots(shown, fixed), q8Fallback, live };
}
