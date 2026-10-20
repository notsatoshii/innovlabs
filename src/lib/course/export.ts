// Plain-text exports of the Level 1 artifacts ([텍스트로 복사], L1 review
// 2026-10-21): the classified Work Map (M1.4), the 2라운드 카드 (M1.2, B1) and
// the comparison sheet with the card and the candidates (B1). Pure: the
// player passes the drafts it holds and copies the text to the clipboard, so
// the results leave the app for the learner's own notes or sheet. The Work
// Map holds task names only (M1.3's rule), so nothing confidential leaves.
// Also the reward-only slot values (MissionContent.saved).

import { candidateTotal, totals } from "@/lib/courses/work-map";
import type { DrillDraft, Round2Card, WorkMapDraft } from "@/lib/courses/types";
import type { RewardSlotKey } from "./types";

/** The fixed order of the 2라운드 카드 (M1.2's demo; spine W1 0:17). */
export const ROUND2_ORDER = "1 잘된 예시 → 2 양식 → 3 이번 주 재료 → 4 지시 한 줄";
/** A card slot left empty, or the pack path's own slot (B1 on 해담리빙 재료). */
export const CARD_EMPTY = "–";
export const CARD_NEXT_WEEK = "다음 주 내 재료로";

const KIND_WORD: Record<string, string> = { P: "처리", T: "판단", M: "섞임" };

function hours(n: number): string {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

function place(value: string, path: Round2Card["path"]): string {
  const v = value.trim();
  if (v) return v;
  return path === "pack" ? CARD_NEXT_WEEK : CARD_EMPTY;
}

/** The card as lines (the screen shows them; the export joins them). */
export function round2CardLines(card: Round2Card): { label: string; value: string }[] {
  return [
    { label: "넣는 순서", value: ROUND2_ORDER },
    { label: "지시 한 줄", value: card.instruction.trim() || CARD_EMPTY },
    { label: "잘된 예시가 있는 곳", value: place(card.exampleAt, card.path) },
    { label: "양식이 있는 곳", value: place(card.templateAt, card.path) },
  ];
}

export function round2CardText(card: Round2Card): string {
  return ["2라운드 카드", ...round2CardLines(card).map((l) => `${l.label}: ${l.value}`)].join("\n");
}

/** One row per line, tab-separated 영역 · 줄 · 시간 · 처리/판단, then the totals. */
export function workMapText(draft: WorkMapDraft, categoryLabel: (id: string) => string): string {
  const rows = draft.rows.filter((r) => r.task.trim());
  const t = totals(rows);
  return [
    "워크맵",
    ["영역", "줄", "시간", "처리/판단"].join("\t"),
    ...rows.map((r) => [categoryLabel(r.category), r.task.trim(), hours(r.hours), r.kind ? KIND_WORD[r.kind] : ""].join("\t")),
    "",
    `처리 ${hours(t.p_hours)}시간 · 판단 ${hours(t.t_hours)}시간`,
  ].join("\n");
}

/** "1번 '…' 13점 · 2번 '…' 12점 · 3번 '…' 11점" ("–" for an empty slot). */
export function candidateScoresLine(draft: WorkMapDraft): string {
  const byId = new Map(draft.rows.map((r) => [r.id, r]));
  return [0, 1, 2]
    .map((k) => {
      const c = draft.candidates[k];
      const row = c ? byId.get(c.rowId) : undefined;
      if (!c || !row) return `${k + 1}번 ${CARD_EMPTY}`;
      const sum = candidateTotal(c.scores);
      return `${k + 1}번 '${row.task.trim()}'${sum !== null ? ` ${sum}점` : ""}`;
    })
    .join(" · ");
}

/** The comparison sheet, the card and the candidates. `rounds` are the pasted outputs this tab still holds. */
export function drillSheetText(input: {
  drill: DrillDraft;
  rounds: Partial<Record<1 | 2, string>>;
  workMap: WorkMapDraft;
}): string {
  const { drill, rounds, workMap } = input;
  const diffs = drill.differences.map((d) => d.trim()).filter(Boolean);
  const out = [`비교표 · ${drill.task.trim() || CARD_EMPTY}`];
  if (rounds[1]?.trim()) out.push("", "1라운드 결과", rounds[1].trim());
  if (rounds[2]?.trim()) out.push("", "2라운드 결과", rounds[2].trim());
  out.push("", "다른 점", ...(diffs.length ? diffs.map((d) => `- ${d}`) : [CARD_EMPTY]));
  out.push("", `지어낸 것: ${drill.invention.trim() || CARD_EMPTY}`);
  out.push(`사람에게 남는 일: ${drill.leftForHuman.trim() || CARD_EMPTY}`);
  if (drill.card) out.push("", round2CardText(drill.card));
  if (workMap.candidates.length > 0) out.push("", "후보", candidateScoresLine(workMap));
  return out.join("\n");
}

/** The reward-only slot values (MissionContent.saved). */
export function rewardSlots(workMap: WorkMapDraft, drill: DrillDraft): Record<RewardSlotKey, string> {
  const rows = workMap.rows.filter((r) => r.task.trim());
  return {
    seed_count: String(rows.filter((r) => r.id.startsWith("seed-")).length),
    total_hours: hours(totals(rows).all),
    candidate_scores: candidateScoresLine(workMap),
    diff_count: String(drill.differences.filter((d) => d.trim()).length),
    drill_task: drill.task.trim() || CARD_EMPTY,
  };
}
