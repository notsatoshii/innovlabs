// Seed public.harness_template (migration 0011, phase-2c.md D1) from the
// private harness templates SP-HL-01 to 03. Runs locally only, with the
// service role key from .env.local; never in the browser or the container.
//
//   HARNESS_TEMPLATE_DIR=<private drafts folder> npx tsx scripts/seed-harness-templates.ts [--check]
//   npx tsx scripts/seed-harness-templates.ts <private drafts folder> [--check]
//
// The template text is private: it lives in the private workspace and in the
// database, never in this repo. So the folder comes from the argument or
// HARNESS_TEMPLATE_DIR (no path is written here), and this script never
// writes or logs any parsed text: it prints ids, counts and check results.
//
// Each file SP-HL-NN*.md is parsed as the harness card:
//   <!-- SP-HL-NN · 하네스 템플릿: <doc type> · ... -->   (doc_type; the comment is dropped)
//   # <name>
//   쓰는 법: ...                                         (dropped)
//   ## 1. 역할 / ## 2. 맥락 / ## 3. 형식 / ## 4. 규칙 (a numbered list) /
//   ## 5. 예시 (only the text between the template's own ――― 예시 시작 ――― and
//   ――― 예시 끝 ――― markers; assembleHarness adds its own fence) / ## 6. 예외 처리
// Every template then goes through normalizeHarness and checkHarness, the
// rules a learner's harness is saved under. Any parse problem or check error
// refuses the whole run before a single write; warnings are printed as
// counts. --check stops there. Otherwise the rows are upserted by id; rows
// in the table that no file matches are reported, not deleted.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { HarnessDraftItem, HarnessTemplate } from "../src/lib/courses/types";
import { checkHarness, harnessEojeol, isTemplateId, normalizeHarness } from "../src/components/lab/rules";
import { parseTemplateRow } from "../src/components/lab/harness-templates/template-rules";

const FILE_PATTERN = /^(SP-HL-[0-9]{2})\b.*\.md$/;
const SECTIONS = ["역할", "맥락", "형식", "규칙", "예시", "예외 처리"] as const;
const EXAMPLE_START = /^[―—–-]{2,}\s*예시 시작\s*[―—–-]{2,}$/;
const EXAMPLE_END = /^[―—–-]{2,}\s*예시 끝\s*[―—–-]{2,}$/;

function loadEnvLocal(): void {
  let raw = "";
  try {
    raw = readFileSync(".env.local", "utf8");
  } catch {
    return;
  }
  for (const line of raw.split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}

/** A problem in one file. Messages name the file and the part, never its text. */
class TemplateProblem extends Error {
  constructor(file: string, reason: string) {
    super(`${file}: ${reason}`);
  }
}

/** Blank-line runs collapsed, outer whitespace trimmed. */
function tidy(lines: string[]): string {
  return lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseTemplateFile(file: string, id: string, raw: string): HarnessTemplate {
  const source = raw.replace(/^﻿/, "").replace(/\r\n?/g, "\n");

  // The header comment: id cross-check and the document type.
  const comment = /^\s*<!--([\s\S]*?)-->/.exec(source);
  if (!comment) throw new TemplateProblem(file, "no <!-- ... --> header comment at the top");
  if (!comment[1].includes(id)) throw new TemplateProblem(file, `header comment does not name ${id}`);
  // Fields in the comment are separated by a spaced "·"; a label may hold an unspaced one ("회의·문서 요약").
  const docTypeMatch = /하네스 템플릿\s*[:：]\s*(.+?)(?:\s+·\s|\s*$)/m.exec(comment[1]);
  if (!docTypeMatch) throw new TemplateProblem(file, 'header comment has no "하네스 템플릿: <문서 종류>"');
  const docType = docTypeMatch[1].trim();

  const lines = source.slice(comment.index + comment[0].length).split("\n");

  // Title.
  const titleLine = lines.find((line) => /^#\s+\S/.test(line));
  if (!titleLine) throw new TemplateProblem(file, 'no "# <name>" title');
  const name = titleLine.replace(/^#\s+/, "").trim();

  // The six sections, in order.
  const bodies: string[][] = [];
  let current: string[] | null = null;
  for (const line of lines) {
    const heading = /^##\s+([0-9]+)\.\s*(.+?)\s*$/.exec(line);
    if (heading) {
      const index = Number(heading[1]) - 1;
      if (index !== bodies.length || SECTIONS[index] !== heading[2]) {
        throw new TemplateProblem(
          file,
          `section ${bodies.length + 1} should be "## ${bodies.length + 1}. ${SECTIONS[bodies.length] ?? "?"}"`,
        );
      }
      current = [];
      bodies.push(current);
      continue;
    }
    if (/^##\s/.test(line)) throw new TemplateProblem(file, "an unnumbered ## heading");
    // The "쓰는 법" line is guidance for the learner reading the file, not part of a harness.
    if (current && !/^\s*쓰는 법\s*[:：]/.test(line)) current.push(line);
  }
  if (bodies.length !== SECTIONS.length) {
    throw new TemplateProblem(file, `found ${bodies.length} of the 6 numbered sections`);
  }
  const [roleLines, contextLines, formatLines, ruleLines, exampleLines, fallbackLines] = bodies;

  // Rules: a numbered list and nothing else.
  const rules: string[] = [];
  ruleLines.forEach((line, n) => {
    if (line.trim().length === 0) return;
    const rule = /^\s*([0-9]+)\.\s+(.+)$/.exec(line);
    if (!rule) throw new TemplateProblem(file, `규칙: line ${n + 1} of the section is not a numbered rule`);
    if (Number(rule[1]) !== rules.length + 1) {
      throw new TemplateProblem(file, `규칙: rule ${rules.length + 1} is numbered ${rule[1]}`);
    }
    rules.push(rule[2].trim());
  });

  // Example: only what is between the template's own markers.
  const starts = exampleLines.flatMap((line, n) => (EXAMPLE_START.test(line.trim()) ? [n] : []));
  const ends = exampleLines.flatMap((line, n) => (EXAMPLE_END.test(line.trim()) ? [n] : []));
  if (starts.length !== 1 || ends.length !== 1 || ends[0] <= starts[0]) {
    throw new TemplateProblem(
      file,
      `예시: needs exactly one start and one end marker (found ${starts.length} and ${ends.length})`,
    );
  }
  const example = tidy(exampleLines.slice(starts[0] + 1, ends[0]));

  return {
    id,
    name,
    doc_type: docType,
    parts: {
      role: tidy(roleLines),
      context: tidy(contextLines),
      format: tidy(formatLines),
      rules,
      example,
      fallbacks: tidy(fallbackLines),
    },
    sort_order: Number(id.slice(-2)),
    updated_at: new Date().toISOString(),
  };
}

function templateFolder(args: string[]): string {
  const given = args.find((arg) => !arg.startsWith("--")) ?? process.env.HARNESS_TEMPLATE_DIR;
  if (!given) {
    console.error(
      "Give the private drafts folder as an argument or in HARNESS_TEMPLATE_DIR.\n" +
        "  HARNESS_TEMPLATE_DIR=<folder> npx tsx scripts/seed-harness-templates.ts [--check]",
    );
    process.exit(2);
  }
  const folder = resolve(given.replace(/^~(?=$|[\\/])/, homedir()));
  if (!existsSync(folder) || !statSync(folder).isDirectory()) {
    console.error(`Not a folder: ${folder}`);
    process.exit(2);
  }
  return folder;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const unknown = args.filter((arg) => arg.startsWith("--") && arg !== "--check");
  if (unknown.length > 0) {
    console.error(`Unknown option: ${unknown.join(" ")} (only --check)`);
    process.exit(2);
  }
  const checkOnly = args.includes("--check");
  const folder = templateFolder(args);

  const files = readdirSync(folder)
    .map((file) => ({ file, match: FILE_PATTERN.exec(file) }))
    .filter((entry): entry is { file: string; match: RegExpExecArray } => entry.match !== null)
    .sort((a, b) => a.file.localeCompare(b.file));
  if (files.length === 0) {
    console.error("No SP-HL-NN*.md files in the folder.");
    process.exit(2);
  }
  const ids = files.map((entry) => entry.match[1]);
  const duplicate = ids.find((id, n) => ids.indexOf(id) !== n);
  if (duplicate) {
    console.error(`Two files for ${duplicate}. Keep one.`);
    process.exit(2);
  }

  // Parse and check everything before touching the database.
  const templates: HarnessTemplate[] = [];
  let refused = 0;
  for (const { file, match } of files) {
    const id = match[1];
    if (!isTemplateId(id)) throw new TemplateProblem(file, "not a template id");
    let template: HarnessTemplate;
    try {
      template = parseTemplateFile(file, id, readFileSync(join(folder, file), "utf8"));
    } catch (e) {
      console.error(`REFUSED ${(e as Error).message}`);
      refused += 1;
      continue;
    }

    // The rules a learner's harness is saved under, on the template as a harness.
    const asHarness: HarnessDraftItem = normalizeHarness({
      id,
      name: template.name,
      doc_type: template.doc_type,
      ...template.parts,
    });
    const { errors, warnings } = checkHarness(asHarness);
    // The same shape check the harness page applies when it reads the row.
    const readable = parseTemplateRow(template) !== null;
    const longestRule = Math.max(0, ...template.parts.rules.map((rule) => rule.length));
    console.log(
      `${id}: ${template.parts.rules.length} rules, longest ${longestRule} chars, ` +
        `${harnessEojeol(asHarness)} 어절 without the example, example ${template.parts.example.length} chars, ` +
        `${errors.length} errors, ${warnings.length} warnings`,
    );
    // checkHarness messages hold counts and limits, never the harness's text.
    for (const message of errors) console.error(`  error: ${message}`);
    for (const message of warnings) console.log(`  warning: ${message}`);
    if (errors.length > 0 || !readable) {
      if (!readable) console.error("  error: the harness page would drop this row (a part is empty or too long)");
      refused += 1;
      continue;
    }
    templates.push(template);
  }

  if (refused > 0) {
    console.error(`Refused: ${refused} of ${files.length} templates have problems. Nothing was written.`);
    process.exit(1);
  }
  if (checkOnly) {
    console.log(`check: ${templates.length} templates ready. Nothing was written (--check).`);
    return;
  }

  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env.local.");
    process.exit(2);
  }
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const { error } = await client.from("harness_template").upsert(
    templates.map((t) => ({
      id: t.id,
      name: t.name,
      doc_type: t.doc_type,
      parts: t.parts,
      sort_order: t.sort_order,
      updated_at: t.updated_at,
    })),
    { onConflict: "id" },
  );
  // The message only: PostgREST's details can echo a failing row.
  if (error) throw new Error(`upsert failed: ${error.code ?? ""} ${error.message}`);

  const { data: rows, error: readError } = await client.from("harness_template").select("id");
  if (readError) throw new Error(`read back failed: ${readError.message}`);
  const keep = new Set(templates.map((t) => t.id));
  const other = ((rows ?? []) as { id: string }[]).map((row) => row.id).filter((id) => !keep.has(id));
  console.log(`harness_template: upserted ${templates.length} (${templates.map((t) => t.id).join(", ")})`);
  if (other.length > 0) {
    console.log(`  also in the table with no file here (left as they are): ${other.join(", ")}`);
  }
}

main().catch((e: unknown) => {
  console.error("seed failed:", (e as Error).message);
  process.exit(1);
});
