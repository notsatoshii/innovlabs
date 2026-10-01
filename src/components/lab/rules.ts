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
// Week 2 additions (the section at the end of this file).
import { HARNESS_LIMITS } from "@/lib/courses/types";
import type { CorrectionInput, HarnessDraft, HarnessDraftItem } from "@/lib/courses/types";
import type { CorrectionLoggedPayload, HarnessSavedPayload } from "@/lib/profile/events";

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

// --- Week 2: harness library (SP-W2-HC) and correction log (SP-W2-CL) ---
// Source: docs/curriculum/innovlabs-spine-w2-w3-session-plans.md, Week 2:
// the six-part harness card, the ten-rule cap, the "structure not content"
// rule, and the correction loop (lab Part 4).

/** The rule every harness carries (lab Part 2, first common failure). */
export const STRUCTURE_RULE =
  "예시는 구조와 말투만 보여 줍니다. 예시의 사실이나 수치를 다시 쓰지 않습니다.";

/** "A harness is one page": about this many 어절 without the example. Soft warning only. */
export const ONE_PAGE_EOJEOL = 350;
export const ONE_PAGE_WARNING = "한 장을 넘어가요. 예시가 이미 보여 주는 규칙은 지워도 돼요.";

export const CORRECTION_LIMITS = { text: 1000 } as const;

/** Harness ids are made by newId("h") in the browser and travel in `?h=`. */
export function isHarnessId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(value);
}

export function emptyHarness(id: string): HarnessDraftItem {
  return { id, name: "", doc_type: "", role: "", context: "", format: "", rules: [], example: "", fallbacks: "" };
}

/**
 * Shape only: unknown fields dropped, non-strings turned into "". Text is NOT
 * cut to HARNESS_LIMITS here, so an over-long field stays visible to
 * checkHarness and is refused instead of being silently shortened.
 */
export function parseHarnessItem(input: unknown): HarnessDraftItem | null {
  if (!isRecord(input) || !isHarnessId(input.id)) return null;
  const str = (value: unknown) => (typeof value === "string" ? value : "");
  return {
    id: input.id,
    name: str(input.name),
    doc_type: str(input.doc_type),
    role: str(input.role),
    context: str(input.context),
    format: str(input.format),
    // Far above the cap of ten; checkHarness judges the count.
    rules: (Array.isArray(input.rules) ? input.rules : [])
      .filter((rule): rule is string => typeof rule === "string")
      .slice(0, 50),
    example: str(input.example),
    fallbacks: str(input.fallbacks),
  };
}

/** A stored artifact_draft of kind "harness", or null when it is not a version 1 draft. */
export function parseHarnessDraft(input: unknown): HarnessDraft | null {
  if (!isRecord(input) || input.version !== 1) return null;
  const items: HarnessDraftItem[] = [];
  const seen = new Set<string>();
  for (const raw of Array.isArray(input.items) ? input.items : []) {
    const item = parseHarnessItem(raw);
    if (!item || seen.has(item.id)) continue;
    seen.add(item.id);
    items.push(item);
  }
  return { version: 1, items };
}

/** The rules the learner actually wrote: one line each, blank lines dropped. */
export function writtenRules(item: HarnessDraftItem): string[] {
  return item.rules.map((rule) => rule.replace(/\s+/g, " ").trim()).filter((rule) => rule.length > 0);
}

/** The harness as it is saved and pasted: text trimmed, written rules only. */
export function normalizeHarness(item: HarnessDraftItem): HarnessDraftItem {
  return {
    id: item.id,
    name: item.name.trim(),
    doc_type: item.doc_type.trim(),
    role: item.role.trim(),
    context: item.context.trim(),
    format: item.format.trim(),
    rules: writtenRules(item),
    example: item.example.trim(),
    fallbacks: item.fallbacks.trim(),
  };
}

/** True when two drafts would save as the same harness. */
export function sameHarness(a: HarnessDraftItem, b: HarnessDraftItem): boolean {
  return JSON.stringify(normalizeHarness(a)) === JSON.stringify(normalizeHarness(b));
}

/**
 * Whether some rule already says "copy the example's structure, not its
 * content". Loose on purpose (learners reword it); a miss only shows a soft note.
 */
export function hasStructureRule(rules: string[]): boolean {
  return rules.some(
    (rule) =>
      rule.includes("예시") &&
      (/(구조|구성|형식|틀|말투)[^.]{0,12}만/.test(rule) ||
        /(다시 쓰지|가져오지|베끼지|옮기지|재사용하지)/.test(rule)),
  );
}

/** Words as Korean counts them: runs of text between spaces. */
export function countEojeol(value: string): number {
  const trimmed = value.trim();
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
}

/** Length of the harness without its example (the example is allowed to be long). */
export function harnessEojeol(item: HarnessDraftItem): number {
  return (
    countEojeol(item.role) +
    countEojeol(item.context) +
    countEojeol(item.format) +
    writtenRules(item).reduce((sum, rule) => sum + countEojeol(rule), 0) +
    countEojeol(item.fallbacks)
  );
}

/**
 * The harness card's own rules. Errors block saving (the route runs this
 * again); warnings are shown and never block: an empty example, a missing
 * structure-not-content rule, more than a page.
 */
export function checkHarness(item: HarnessDraftItem): { errors: string[]; warnings: string[] } {
  const h = normalizeHarness(item);
  const errors: string[] = [];
  const warnings: string[] = [];

  const required: [string, string][] = [
    [h.name, "하네스 이름을 적어 주세요."],
    [h.doc_type, "어떤 문서를 만드는 하네스인지 적어 주세요."],
    [h.role, "역할을 적어 주세요."],
    [h.context, "맥락을 적어 주세요."],
    [h.format, "형식을 적어 주세요."],
  ];
  for (const [value, message] of required) if (value.length === 0) errors.push(message);
  if (h.rules.length === 0) errors.push("규칙을 하나 이상 적어 주세요.");
  if (h.fallbacks.length === 0) errors.push("예외 처리를 적어 주세요.");

  if (h.rules.length > HARNESS_LIMITS.maxRules) {
    errors.push(`규칙은 열 개까지예요. 지금은 ${h.rules.length}개예요.`);
  }
  if (h.rules.some((rule) => rule.length > HARNESS_LIMITS.rule)) {
    errors.push(`규칙 하나는 ${HARNESS_LIMITS.rule}자까지예요. 긴 규칙은 둘로 나눠 주세요.`);
  }
  const bounded: [string, number, string][] = [
    [h.name, HARNESS_LIMITS.name, "이름이"],
    [h.doc_type, HARNESS_LIMITS.name, "문서 종류가"],
    [h.role, HARNESS_LIMITS.field, "역할이"],
    [h.context, HARNESS_LIMITS.field, "맥락이"],
    [h.format, HARNESS_LIMITS.field, "형식이"],
    [h.example, HARNESS_LIMITS.example, "예시가"],
    [h.fallbacks, HARNESS_LIMITS.field, "예외 처리가"],
  ];
  for (const [value, max, subject] of bounded) {
    if (value.length > max) {
      errors.push(`${subject} 너무 길어요. ${max.toLocaleString("ko-KR")}자까지 적을 수 있어요.`);
    }
  }

  if (h.example.length === 0) {
    warnings.push("예시가 비어 있어요. 잘 쓴 완성본이 하나 있으면 구성과 말투를 맞추기 쉬워져요.");
  }
  if (!hasStructureRule(h.rules)) {
    warnings.push(
      "예시의 사실이나 수치를 다시 쓰지 말라는 규칙이 없어요. 없으면 지난 숫자가 새 초안에 섞여 나올 수 있어요.",
    );
  }
  if (harnessEojeol(h) > ONE_PAGE_EOJEOL) {
    warnings.push(ONE_PAGE_WARNING);
  }
  return { errors, warnings };
}

/**
 * The harness as plain text, exactly as it is pasted into an assistant: the
 * six parts in the card's order, rules numbered, the example fenced so the
 * assistant can tell it from the instructions. Empty parts are left out.
 */
export function assembleHarness(item: HarnessDraftItem): string {
  const h = normalizeHarness(item);
  const blocks: string[] = [];
  const head = [h.name ? `[하네스] ${h.name}` : "", h.doc_type ? `문서 종류: ${h.doc_type}` : ""]
    .filter((line) => line.length > 0)
    .join("\n");
  if (head) blocks.push(head);
  if (h.role) blocks.push(`[역할]\n${h.role}`);
  if (h.context) blocks.push(`[맥락]\n${h.context}`);
  if (h.format) blocks.push(`[형식]\n${h.format}`);
  if (h.rules.length > 0) blocks.push(`[규칙]\n${h.rules.map((rule, i) => `${i + 1}. ${rule}`).join("\n")}`);
  if (h.example) blocks.push(`[예시]\n--- 예시 시작 ---\n${h.example}\n--- 예시 끝 ---`);
  if (h.fallbacks) blocks.push(`[예외 처리]\n${h.fallbacks}`);
  return blocks.join("\n\n");
}

/** The harness_saved payload for a checked item. The version comes from the server, never the client. */
export function toHarnessPayload(item: HarnessDraftItem, harnessVersion: number): HarnessSavedPayload {
  const h = normalizeHarness(item);
  return {
    version: 1,
    harness_id: h.id,
    harness_version: harnessVersion,
    name: h.name,
    doc_type: h.doc_type,
    parts: {
      role: h.role,
      context: h.context,
      format: h.format,
      rules: h.rules,
      example: h.example,
      example_ref: null,
      fallbacks: h.fallbacks,
    },
  };
}

/** Reads a stored harness_saved payload back into an editable item, or null when it is not one. */
export function harnessFromSaved(data: unknown): { version: number; item: HarnessDraftItem } | null {
  if (!isRecord(data) || data.version !== 1 || !isRecord(data.parts)) return null;
  const version = data.harness_version;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) return null;
  const item = parseHarnessItem({ ...data.parts, id: data.harness_id, name: data.name, doc_type: data.doc_type });
  return item ? { version, item } : null;
}

// Correction log: one line per change the learner made to the assistant's output.

export function parseCorrectionInput(input: unknown): CorrectionInput | null {
  if (!isRecord(input) || !isHarnessId(input.harness_id)) return null;
  if (typeof input.original !== "string" || typeof input.changed_to !== "string") return null;
  if (typeof input.recurring !== "boolean" || typeof input.rule_written !== "boolean") return null;
  return {
    harness_id: input.harness_id,
    original: input.original.trim(),
    changed_to: input.changed_to.trim(),
    recurring: input.recurring,
    rule_written: input.rule_written,
  };
}

/** Both sentences present and within the limit. Whether the harness is the caller's own is the route's check. */
export function checkCorrection(input: CorrectionInput): string[] {
  const errors: string[] = [];
  const max = CORRECTION_LIMITS.text;
  const limit = `${max.toLocaleString("ko-KR")}자까지 적을 수 있어요.`;
  const original = input.original.trim();
  const changed = input.changed_to.trim();
  if (original.length === 0) errors.push("원래 문장을 적어 주세요.");
  else if (original.length > max) errors.push(`원래 문장이 너무 길어요. ${limit}`);
  if (changed.length === 0) errors.push("고친 문장을 적어 주세요.");
  else if (changed.length > max) errors.push(`고친 문장이 너무 길어요. ${limit}`);
  if (original.length > 0 && original === changed) errors.push("원래 문장과 고친 문장이 같아요.");
  return errors;
}

/** A corrected sentence as the starting text of a new rule: one line, within the rule limit. */
export function ruleDraftFromCorrection(changedTo: string): string {
  return changedTo.replace(/\s+/g, " ").trim().slice(0, HARNESS_LIMITS.rule);
}

export interface CorrectionLine extends CorrectionLoggedPayload {
  /** The event that first logged this line. */
  id: number;
  created_at: string;
}

/**
 * The correction log as the learner reads it. Events are append-only, so
 * "I have written this as a rule now" is logged as the same line again with
 * rule_written true. Lines with the same harness, original, and corrected
 * sentence are shown once: written (or recurring) when any of them says so,
 * dated by the first. Returns newest first.
 */
export function collapseCorrections(
  events: { id: number; created_at: string; data: unknown }[],
): CorrectionLine[] {
  const oldestFirst = [...events].sort(
    (a, b) => Date.parse(a.created_at) - Date.parse(b.created_at) || a.id - b.id,
  );
  const lines = new Map<string, CorrectionLine>();
  for (const event of oldestFirst) {
    const parsed = parseCorrectionInput(event.data);
    if (!parsed) continue;
    const key = JSON.stringify([parsed.harness_id, parsed.original, parsed.changed_to]);
    const line = lines.get(key);
    if (line) {
      line.recurring = line.recurring || parsed.recurring;
      line.rule_written = line.rule_written || parsed.rule_written;
    } else {
      lines.set(key, { version: 1, ...parsed, id: event.id, created_at: event.created_at });
    }
  }
  return [...lines.values()].reverse();
}

/** Corrections that will come back and are not in the harness yet. */
export function pendingRuleCount(lines: CorrectionLine[]): number {
  return lines.filter((line) => line.recurring && !line.rule_written).length;
}
