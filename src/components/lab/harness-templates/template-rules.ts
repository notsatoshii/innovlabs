// "템플릿으로 시작" (phase-2c.md, D1): pure helpers shared by the harness page
// (server), the template sheet and the editor (client), and the seed script.
//
// A template is a harness_template row: SP-HL-01 to 03, the three harnesses
// Week 2 Part 1 reads. Their text lives only in the database; nothing here
// holds any of it.
//
// Starting from a template copies name, doc_type, format, rules and
// fallbacks as values. Role, context and example stay empty and are shown as
// placeholders, so the existing hard errors on role and context make the
// learner write their own, and the fictional company never becomes theirs.

import { HARNESS_LIMITS, type HarnessDraftItem, type HarnessTemplate } from "@/lib/courses/types";
import { isTemplateId } from "../rules";

/** The parts a learner writes themselves after starting from a template. */
export const WRITE_YOURSELF = ["role", "context", "example"] as const;
export type WriteYourselfPart = (typeof WRITE_YOURSELF)[number];

/** The parts copied from the template as values. */
export const COPIED = ["format", "rules", "fallbacks"] as const;

const PART_NAMES: Record<WriteYourselfPart, string> = { role: "역할", context: "맥락", example: "예시" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown, max: number): string | null {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max ? value : null;
}

/**
 * One harness_template row as the page reads it, or null when the row is not
 * a usable template (wrong id, a part missing, over the editor's limits).
 * A bad row is dropped rather than offered half-filled.
 */
export function parseTemplateRow(row: unknown): HarnessTemplate | null {
  if (!isRecord(row) || !isTemplateId(row.id) || !isRecord(row.parts)) return null;
  const name = text(row.name, HARNESS_LIMITS.name);
  const docType = text(row.doc_type, HARNESS_LIMITS.name);
  const p = row.parts;
  const role = text(p.role, HARNESS_LIMITS.field);
  const context = text(p.context, HARNESS_LIMITS.field);
  const format = text(p.format, HARNESS_LIMITS.field);
  const example = text(p.example, HARNESS_LIMITS.example);
  const fallbacks = text(p.fallbacks, HARNESS_LIMITS.field);
  const rules = Array.isArray(p.rules)
    ? p.rules.filter((rule): rule is string => text(rule, HARNESS_LIMITS.rule) !== null)
    : [];
  if (!name || !docType || !role || !context || !format || !example || !fallbacks) return null;
  if (rules.length === 0 || rules.length > HARNESS_LIMITS.maxRules) return null;
  if (!Array.isArray(p.rules) || rules.length !== p.rules.length) return null;
  return {
    id: row.id,
    name,
    doc_type: docType,
    parts: { role, context, format, rules, example, fallbacks },
    sort_order: typeof row.sort_order === "number" ? row.sort_order : 0,
    updated_at: typeof row.updated_at === "string" ? row.updated_at : "",
  };
}

/** Usable templates in their sheet order. */
export function parseTemplateRows(rows: unknown): HarnessTemplate[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map(parseTemplateRow)
    .filter((template): template is HarnessTemplate => template !== null)
    .sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id));
}

/** True while the harness has nothing written in it. */
export function isBlankHarness(item: HarnessDraftItem): boolean {
  return (
    [item.name, item.doc_type, item.role, item.context, item.format, item.example, item.fallbacks].every(
      (value) => value.trim().length === 0,
    ) && item.rules.every((rule) => rule.trim().length === 0)
  );
}

/**
 * The open harness started from a template. Keeps the harness's own id (made
 * by newId("h") when it was added; never the template id) and records where
 * it started. Role, context and example are emptied: they are placeholders.
 */
export function startFromTemplate(item: HarnessDraftItem, template: HarnessTemplate): HarnessDraftItem {
  return {
    id: item.id,
    name: template.name,
    doc_type: template.doc_type,
    role: "",
    context: "",
    format: template.parts.format,
    rules: [...template.parts.rules],
    example: "",
    fallbacks: template.parts.fallbacks,
    template_id: template.id,
  };
}

/** The template this harness started from, when the learner can still read it. */
export function templateFor(item: HarnessDraftItem, templates: HarnessTemplate[]): HarnessTemplate | null {
  if (!item.template_id) return null;
  return templates.find((template) => template.id === item.template_id) ?? null;
}

/**
 * Soft warning (never blocks a save): a part the learner should write
 * themselves still holds the template's text, pasted back in from the sheet.
 */
export function templateLeftoverWarning(item: HarnessDraftItem, template: HarnessTemplate | null): string | null {
  if (!template) return null;
  const same = (a: string, b: string) => a.trim().length > 0 && a.trim() === b.trim();
  const left = WRITE_YOURSELF.filter((part) => same(item[part], template.parts[part])).map(
    (part) => PART_NAMES[part],
  );
  if (left.length === 0) return null;
  const last = left[left.length - 1];
  const particle = last === "예시" ? "를" : "을";
  return `템플릿에 있던 ${left.join("·")}${particle} 그대로 쓰고 있어요. 연습용 회사 이야기라서 내 일에 맞게 바꿔 주세요.`;
}
