// Shapes, limits, and checks for the Week 1 labs that are not Work Map rules.
// (The Work Map rules themselves live in src/lib/courses/work-map.ts and are
// imported, never reimplemented.) Pure module: imported by the client forms
// AND by the routes under src/app/api, so both sides run the same checks.
// Source: docs/curriculum/innovlabs-spine-w1-session-plan.md, lab Parts 1–4
// and the assignment brief.

import { TASK_CLUSTERS } from "@/lib/survey/questions";
import { HOUR_BUCKET_LABELS, HOUR_MIDPOINTS } from "@/lib/survey/types";
import type { WorkMapSnapshot } from "@/lib/profile/types";
import type {
  CandidateScores,
  DrillDraft,
  RowKind,
  Score,
  TimeLogInput,
  WorkMapDraft,
  WorkMapRow,
} from "@/lib/courses/types";

// --- Limits (the inputs enforce them; the routes clamp to them) ---

export const WORK_MAP_LIMITS = {
  rows: 60,
  task: 120,
  extraCategories: 8,
  categoryLabel: 40,
  /** Per row, per week. */
  hours: 60,
} as const;

export const DRILL_LIMITS = {
  task: 120,
  difference: 200,
  differences: 12,
  minDifferences: 4,
  invention: 500,
  leftForHuman: 300,
} as const;

export const TIME_LOG_LIMITS = {
  task: 120,
  maxMinutes: 12 * 60,
  interruptions: 99,
} as const;

export const EVIDENCE_BUCKET = "evidence";
export const EVIDENCE_MAX_BYTES = 5 * 1024 * 1024;
/** MIME type → file extension. Mirrors the bucket's allowed_mime_types (0007). */
export const EVIDENCE_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export const METHOD_LABELS: Record<TimeLogInput["method"], string> = {
  before: "기존 방식",
  harness: "하네스",
  pipeline: "파이프라인",
};

// --- Small helpers ---

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

/** Hours live on a 0.5 grid between 0 and the per-row cap. */
export function snapHours(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const snapped = Math.round(value * 2) / 2;
  return Math.min(WORK_MAP_LIMITS.hours, Math.max(0, snapped));
}

/** 3 → "3", 2.5 → "2.5". */
export function formatHours(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/** Client-side row and category ids. Not crypto.randomUUID: the review server runs over plain http. */
export function newId(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** The survey's own answer for a seeded category ("3–5시간"), from its midpoint. */
export function surveyHoursLabel(hoursSurvey: number): string {
  const bucket = HOUR_MIDPOINTS.indexOf(hoursSurvey);
  return HOUR_BUCKET_LABELS[bucket] ?? HOUR_BUCKET_LABELS[0];
}

// --- Work Map draft: shape only (the rules are checkWorkMap) ---

const SEED_CATEGORY_IDS = new Set<string>(TASK_CLUSTERS.map((c) => c.id));
const ROW_KINDS = new Set<string>(["P", "T", "M"]);

export function emptyScores(): CandidateScores {
  return { recurs: null, digital_inputs: null, stable_rules: null, ownership: null, low_cost_wrong: null };
}

function parseScores(input: unknown): CandidateScores {
  const raw = isRecord(input) ? input : {};
  const pick = (key: keyof CandidateScores): Score | null => {
    const v = raw[key];
    return v === 1 || v === 2 || v === 3 ? v : null;
  };
  return {
    recurs: pick("recurs"),
    digital_inputs: pick("digital_inputs"),
    stable_rules: pick("stable_rules"),
    ownership: pick("ownership"),
    low_cost_wrong: pick("low_cost_wrong"),
  };
}

/**
 * Normalises anything (a stored draft, a posted body) into a well-formed
 * WorkMapDraft: unknown fields dropped, strings and hours clamped, rows in an
 * unknown category dropped, candidates pointing at a missing row dropped.
 * Returns null when the input is not a version 1 draft at all. It never
 * judges the Work Map rules; run checkWorkMap on the result for that.
 */
export function parseWorkMapDraft(input: unknown): WorkMapDraft | null {
  if (!isRecord(input) || input.version !== 1) return null;

  const extraCategories: WorkMapDraft["extraCategories"] = [];
  const categoryIds = new Set(SEED_CATEGORY_IDS);
  for (const item of Array.isArray(input.extraCategories) ? input.extraCategories : []) {
    if (extraCategories.length >= WORK_MAP_LIMITS.extraCategories) break;
    if (!isRecord(item) || typeof item.id !== "string" || !/^x\d{1,3}$/.test(item.id)) continue;
    if (categoryIds.has(item.id)) continue;
    categoryIds.add(item.id);
    extraCategories.push({ id: item.id, label: text(item.label, WORK_MAP_LIMITS.categoryLabel) });
  }

  const rows: WorkMapRow[] = [];
  const rowIds = new Set<string>();
  for (const item of Array.isArray(input.rows) ? input.rows : []) {
    if (rows.length >= WORK_MAP_LIMITS.rows) break;
    if (!isRecord(item) || typeof item.id !== "string" || item.id.length === 0 || item.id.length > 40) continue;
    if (rowIds.has(item.id)) continue;
    if (typeof item.category !== "string" || !categoryIds.has(item.category)) continue;
    rowIds.add(item.id);
    rows.push({
      id: item.id,
      category: item.category,
      task: text(item.task, WORK_MAP_LIMITS.task),
      hours: typeof item.hours === "number" ? snapHours(item.hours) : 0,
      kind: typeof item.kind === "string" && ROW_KINDS.has(item.kind) ? (item.kind as RowKind) : null,
    });
  }

  const candidates: WorkMapDraft["candidates"] = [];
  const candidateIds = new Set<string>();
  for (const item of Array.isArray(input.candidates) ? input.candidates : []) {
    if (candidates.length >= 3) break;
    if (!isRecord(item) || typeof item.rowId !== "string") continue;
    if (!rowIds.has(item.rowId) || candidateIds.has(item.rowId)) continue;
    candidateIds.add(item.rowId);
    candidates.push({ rowId: item.rowId, scores: parseScores(item.scores) });
  }

  return { version: 1, extraCategories, rows, candidates };
}

/**
 * The one thing the editor allows that checkWorkMap does not look at: a
 * learner-added category whose name was erased. Blocking, on both sides,
 * because the name goes into the snapshot.
 */
export function checkExtraCategories(draft: WorkMapDraft): string[] {
  return draft.extraCategories.some((c) => c.label.trim().length === 0)
    ? ["직접 추가한 업무 영역의 이름이 비어 있어요."]
    : [];
}

/** Rebuilds an editable draft from a submitted snapshot (used when the draft row is gone). */
export function draftFromSnapshot(snapshot: WorkMapSnapshot): WorkMapDraft {
  const rowId = (index: number) => `s${index}`;
  return {
    version: 1,
    extraCategories: snapshot.categories
      .filter((c) => !SEED_CATEGORY_IDS.has(c.id))
      .map((c) => ({ id: c.id, label: c.label })),
    rows: snapshot.rows.map((r, i) => ({
      id: rowId(i),
      category: r.category,
      task: r.task,
      hours: r.hours,
      kind: r.kind,
    })),
    candidates: [...snapshot.candidates]
      .sort((a, b) => a.rank - b.rank)
      .filter((c) => c.task_row >= 0 && c.task_row < snapshot.rows.length)
      .map((c) => ({ rowId: rowId(c.task_row), scores: { ...c.scores } })),
  };
}

const SPLIT_SUFFIX = { P: " (처리 부분)", T: " (판단 부분)" } as const;

/**
 * Lab Part 2, step 2: an M row is replaced, in place, by a P row and a T row
 * in the same category. The hours are split in half on the 0.5 grid (the P
 * row takes the larger half); a 0.5-hour row becomes 0.5 + 0.5 so neither
 * new row starts at zero. The learner then renames both and adjusts the hours.
 * A candidate that pointed at the old row is dropped (it was not a P row).
 */
export function splitMixedRow(
  draft: WorkMapDraft,
  rowId: string,
  ids: { p: string; t: string },
): WorkMapDraft {
  const index = draft.rows.findIndex((r) => r.id === rowId);
  const row = draft.rows[index];
  if (!row || row.kind !== "M") return draft;

  const pHours = Math.ceil(row.hours) / 2; // half, rounded up to the 0.5 grid
  let tHours = snapHours(row.hours - pHours);
  if (tHours === 0 && row.hours > 0) tHours = 0.5;
  const name = row.task.trim();
  const named = (suffix: string) =>
    name ? `${name.slice(0, WORK_MAP_LIMITS.task - suffix.length)}${suffix}` : "";

  const rows = [...draft.rows];
  rows.splice(
    index,
    1,
    { id: ids.p, category: row.category, task: named(SPLIT_SUFFIX.P), hours: snapHours(pHours), kind: "P" },
    { id: ids.t, category: row.category, task: named(SPLIT_SUFFIX.T), hours: tHours, kind: "T" },
  );
  return { ...draft, rows, candidates: draft.candidates.filter((c) => c.rowId !== rowId) };
}

// --- Basics drill (SP-W1-BAS) ---

export function emptyDrill(task = ""): DrillDraft {
  return { version: 1, task, differences: ["", "", "", ""], invention: "", leftForHuman: "" };
}

export function parseDrillDraft(input: unknown): DrillDraft | null {
  if (!isRecord(input) || input.version !== 1) return null;
  const differences = (Array.isArray(input.differences) ? input.differences : [])
    .slice(0, DRILL_LIMITS.differences)
    .map((d) => text(d, DRILL_LIMITS.difference));
  // The sheet always shows at least four lines to fill.
  while (differences.length < DRILL_LIMITS.minDifferences) differences.push("");
  return {
    version: 1,
    task: text(input.task, DRILL_LIMITS.task),
    differences,
    invention: text(input.invention, DRILL_LIMITS.invention),
    leftForHuman: text(input.leftForHuman, DRILL_LIMITS.leftForHuman),
  };
}

/** The differences the learner actually wrote (blank lines are not differences). */
export function writtenDifferences(draft: DrillDraft): string[] {
  return draft.differences.map((d) => d.trim()).filter((d) => d.length > 0);
}

/** Part 4 "done looks like": a task, four differences, one invention, the one line. */
export function checkDrill(draft: DrillDraft): string[] {
  const errors: string[] = [];
  if (draft.task.trim().length === 0) errors.push("어떤 업무로 해 봤는지 적어 주세요.");
  const count = writtenDifferences(draft).length;
  if (count < DRILL_LIMITS.minDifferences) {
    errors.push(`달라진 점을 네 가지 이상 적어 주세요. 지금은 ${count}가지예요.`);
  }
  if (draft.invention.trim().length === 0) {
    errors.push("2차 결과에서 지어냈거나 틀린 부분을 하나 찾아 적어 주세요.");
  }
  if (draft.leftForHuman.trim().length === 0) {
    errors.push("사람이 아직 해야 할 일을 한 줄로 적어 주세요.");
  }
  return errors;
}

// --- Time log (SP-W1-TL) ---

const METHODS = new Set<string>(["before", "harness", "pipeline"]);

export function parseTimeLogInput(input: unknown): TimeLogInput | null {
  if (!isRecord(input)) return null;
  if (typeof input.method !== "string" || !METHODS.has(input.method)) return null;
  if (typeof input.started_at !== "string" || typeof input.ended_at !== "string") return null;
  if (input.evidence_ref !== null && input.evidence_ref !== undefined && typeof input.evidence_ref !== "string") {
    return null;
  }
  return {
    task: text(input.task, TIME_LOG_LIMITS.task).trim(),
    method: input.method as TimeLogInput["method"],
    started_at: input.started_at,
    ended_at: input.ended_at,
    interruptions: typeof input.interruptions === "number" ? input.interruptions : Number.NaN,
    evidence_ref: typeof input.evidence_ref === "string" ? input.evidence_ref : null,
  };
}

/** Whole minutes between two ISO instants, or null when either is unreadable. */
export function minutesBetween(startedAt: string, endedAt: string): number | null {
  const start = Date.parse(startedAt);
  const end = Date.parse(endedAt);
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return Math.round((end - start) / 60000);
}

/** 85 → "1시간 25분". */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}분`;
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
}

/** Evidence must sit in the caller's own time-log folder (storage policy: `<user_id>/…`). */
export function isOwnEvidencePath(path: string, userId: string): boolean {
  const prefix = `${userId}/time-log/`;
  return path.startsWith(prefix) && /^\d{10,16}\.(png|jpg|webp)$/.test(path.slice(prefix.length));
}

/** Pass userId on the server to also check that the evidence path is the caller's own. */
export function checkTimeLog(input: TimeLogInput, userId?: string): string[] {
  const errors: string[] = [];
  if (input.task.trim().length === 0) errors.push("어떤 업무였는지 적어 주세요.");
  const minutes = minutesBetween(input.started_at, input.ended_at);
  if (minutes === null) {
    errors.push("시작 시각과 끝난 시각을 모두 넣어 주세요.");
  } else if (minutes <= 0) {
    errors.push("끝난 시각이 시작 시각보다 뒤여야 해요.");
  } else if (minutes > TIME_LOG_LIMITS.maxMinutes) {
    errors.push("한 번에 12시간까지만 기록할 수 있어요. 시각을 다시 확인해 주세요.");
  }
  if (
    !Number.isInteger(input.interruptions) ||
    input.interruptions < 0 ||
    input.interruptions > TIME_LOG_LIMITS.interruptions
  ) {
    errors.push("중간에 끊긴 횟수는 0 이상의 숫자로 적어 주세요.");
  }
  if (userId !== undefined && input.evidence_ref !== null && !isOwnEvidencePath(input.evidence_ref, userId)) {
    errors.push("첨부한 화면을 확인하지 못했어요. 다시 올려 주세요.");
  }
  return errors;
}

/** Why a file cannot be uploaded as evidence, or null when it can. */
export function evidenceRejection(file: { type: string; size: number }): string | null {
  if (!EVIDENCE_TYPES[file.type]) return "PNG, JPG, WebP 이미지만 올릴 수 있어요.";
  if (file.size > EVIDENCE_MAX_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return `5MB까지만 올릴 수 있어요. 고른 파일은 ${mb}MB예요.`;
  }
  return null;
}

/** Where a new time log screenshot goes: `<user_id>/time-log/<timestamp>.<ext>`. Call from an event handler. */
export function newEvidencePath(userId: string, mimeType: string): string {
  return `${userId}/time-log/${Date.now()}.${EVIDENCE_TYPES[mimeType]}`;
}
