// Seed public.tools and public.glossary from content/resources/*.json
// (docs/app/phases/phase-1.md §6, decision D2 option B). Runs locally only,
// with the service role key from .env.local; never in the browser or the
// container.
//
//   npm run seed:resources
//   npx tsx scripts/seed-resources.ts
//
// Every entry is validated against src/lib/resources/types.ts before any
// write. The first invalid entry aborts the run with its id and the reason.
// Rows whose ids are no longer in the files are deleted so the tables mirror
// the JSON exactly. Prints counts only, never keys.

import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  TOOL_CATEGORIES,
  type GlossaryEntry,
  type ToolEntry,
  type ToolPath,
  type ToolStatus,
  type TrackCode,
} from "../src/lib/resources/types";

const TOOLS_FILE = "content/resources/tools.json";
const GLOSSARY_FILE = "content/resources/glossary.json";

// Runtime lists for the string-union types in the contract. Typed against
// the contract so a drift fails at tsc instead of at seed time.
const TOOL_STATUSES: readonly ToolStatus[] = ["taught", "mentioned", "reference", "draft"];
const TOOL_PATHS: readonly ToolPath[] = ["browser", "agent"];
const TRACK_CODES: readonly TrackCode[] = ["DOC", "RES", "DAT", "SAL", "CON", "MGT", "SMB"];

const TOOL_KEYS: readonly (keyof ToolEntry)[] = [
  "id",
  "name",
  "url",
  "category",
  "tags",
  "difficulty",
  "status",
  "paths",
  "tracks",
  "license",
  "cost",
  "what_it_is",
  "use_it_to",
  "why_it_matters",
  "watch_out",
  "korean_notes",
  "stars",
  "stars_dated",
  "last_verified",
  "sort_order",
];
const GLOSSARY_KEYS: readonly (keyof GlossaryEntry)[] = [
  "id",
  "term",
  "loanword",
  "analogy",
  "meaning",
  "sort_order",
];

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

class InvalidEntry extends Error {
  constructor(file: string, id: string, reason: string) {
    super(`${file}: entry "${id}": ${reason}`);
  }
}

// --- field checks ----------------------------------------------------------

const SLUG = /^[a-z0-9][a-z0-9-]*$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function checkKeys(
  file: string,
  id: string,
  entry: Record<string, unknown>,
  keys: readonly string[],
): void {
  for (const key of keys) {
    if (!(key in entry)) throw new InvalidEntry(file, id, `missing key "${key}"`);
  }
  for (const key of Object.keys(entry)) {
    if (!keys.includes(key)) throw new InvalidEntry(file, id, `unknown key "${key}"`);
  }
}

function nonEmptyString(file: string, id: string, key: string, v: unknown): string {
  if (typeof v !== "string" || v.trim() === "") {
    throw new InvalidEntry(file, id, `"${key}" must be a non-empty string`);
  }
  return v;
}

function stringOrNull(file: string, id: string, key: string, v: unknown): string | null {
  if (v === null) return null;
  if (typeof v !== "string" || v.trim() === "") {
    throw new InvalidEntry(file, id, `"${key}" must be a non-empty string or null`);
  }
  return v;
}

function dateOrNull(file: string, id: string, key: string, v: unknown): string | null {
  const s = stringOrNull(file, id, key, v);
  if (s !== null && (!ISO_DATE.test(s) || Number.isNaN(Date.parse(s)))) {
    throw new InvalidEntry(file, id, `"${key}" must be a YYYY-MM-DD date or null`);
  }
  return s;
}

function integer(file: string, id: string, key: string, v: unknown): number {
  if (typeof v !== "number" || !Number.isInteger(v)) {
    throw new InvalidEntry(file, id, `"${key}" must be an integer`);
  }
  return v;
}

function stringArray<T extends string>(
  file: string,
  id: string,
  key: string,
  v: unknown,
  allowed?: readonly T[],
): T[] {
  if (!Array.isArray(v) || v.some((x) => typeof x !== "string")) {
    throw new InvalidEntry(file, id, `"${key}" must be an array of strings`);
  }
  const values = v as string[];
  if (allowed) {
    for (const x of values) {
      if (!(allowed as readonly string[]).includes(x)) {
        throw new InvalidEntry(file, id, `"${key}" has unknown value "${x}"`);
      }
    }
  }
  if (new Set(values).size !== values.length) {
    throw new InvalidEntry(file, id, `"${key}" has duplicates`);
  }
  return values as T[];
}

function entryId(file: string, index: number, raw: unknown): string {
  if (!isRecord(raw)) throw new InvalidEntry(file, `#${index}`, "entry is not an object");
  const id = raw.id;
  if (typeof id !== "string" || !SLUG.test(id)) {
    throw new InvalidEntry(
      file,
      `#${index}`,
      `"id" must be a lowercase slug (got ${JSON.stringify(id)})`,
    );
  }
  return id;
}

// --- validators ------------------------------------------------------------

function validateTool(raw: unknown, index: number): ToolEntry {
  const file = TOOLS_FILE;
  const id = entryId(file, index, raw);
  const e = raw as Record<string, unknown>;
  checkKeys(file, id, e, TOOL_KEYS);

  const status = nonEmptyString(file, id, "status", e.status);
  if (!(TOOL_STATUSES as readonly string[]).includes(status)) {
    throw new InvalidEntry(file, id, `"status" must be one of ${TOOL_STATUSES.join(", ")}`);
  }
  const url = stringOrNull(file, id, "url", e.url);
  if (url === null && status !== "draft") {
    throw new InvalidEntry(file, id, `"url" is required unless status is "draft"`);
  }
  if (url !== null && !/^https?:\/\//.test(url)) {
    throw new InvalidEntry(file, id, `"url" must start with http:// or https://`);
  }
  const category = nonEmptyString(file, id, "category", e.category);
  if (!(TOOL_CATEGORIES as readonly string[]).includes(category)) {
    throw new InvalidEntry(file, id, `"category" "${category}" is not in TOOL_CATEGORIES`);
  }
  const difficulty = integer(file, id, "difficulty", e.difficulty);
  if (difficulty < 1 || difficulty > 4) {
    throw new InvalidEntry(file, id, `"difficulty" must be 1 to 4`);
  }
  const stars = e.stars === null ? null : integer(file, id, "stars", e.stars);
  if (stars !== null && stars < 0) throw new InvalidEntry(file, id, `"stars" must be >= 0`);
  const starsDated = dateOrNull(file, id, "stars_dated", e.stars_dated);
  if (stars !== null && starsDated === null) {
    throw new InvalidEntry(file, id, `"stars_dated" is required when "stars" is set`);
  }

  return {
    id,
    name: nonEmptyString(file, id, "name", e.name),
    url,
    category: category as ToolEntry["category"],
    tags: stringArray(file, id, "tags", e.tags),
    difficulty: difficulty as ToolEntry["difficulty"],
    status: status as ToolStatus,
    paths: stringArray(file, id, "paths", e.paths, TOOL_PATHS),
    tracks: stringArray(file, id, "tracks", e.tracks, TRACK_CODES),
    license: stringOrNull(file, id, "license", e.license),
    cost: stringOrNull(file, id, "cost", e.cost),
    what_it_is: nonEmptyString(file, id, "what_it_is", e.what_it_is),
    use_it_to: stringOrNull(file, id, "use_it_to", e.use_it_to),
    why_it_matters: stringOrNull(file, id, "why_it_matters", e.why_it_matters),
    watch_out: stringOrNull(file, id, "watch_out", e.watch_out),
    korean_notes: stringOrNull(file, id, "korean_notes", e.korean_notes),
    stars,
    stars_dated: starsDated,
    last_verified: dateOrNull(file, id, "last_verified", e.last_verified),
    sort_order: integer(file, id, "sort_order", e.sort_order),
  };
}

function validateGlossary(raw: unknown, index: number): GlossaryEntry {
  const file = GLOSSARY_FILE;
  const id = entryId(file, index, raw);
  const e = raw as Record<string, unknown>;
  checkKeys(file, id, e, GLOSSARY_KEYS);
  return {
    id,
    term: nonEmptyString(file, id, "term", e.term),
    loanword: stringOrNull(file, id, "loanword", e.loanword),
    analogy: nonEmptyString(file, id, "analogy", e.analogy),
    meaning: nonEmptyString(file, id, "meaning", e.meaning),
    sort_order: integer(file, id, "sort_order", e.sort_order),
  };
}

function readList(file: string): unknown[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    throw new Error(`${file}: cannot read or parse (${(e as Error).message})`);
  }
  if (!Array.isArray(parsed)) throw new Error(`${file}: top level must be an array`);
  return parsed;
}

function validateAll<T extends { id: string }>(
  file: string,
  validate: (raw: unknown, index: number) => T,
): T[] {
  const seen = new Set<string>();
  return readList(file).map((raw, index) => {
    const entry = validate(raw, index);
    if (seen.has(entry.id)) throw new InvalidEntry(file, entry.id, "duplicate id");
    seen.add(entry.id);
    return entry;
  });
}

// --- database --------------------------------------------------------------

const CHUNK = 100;

async function syncTable<T extends { id: string }>(
  client: SupabaseClient,
  table: "tools" | "glossary",
  entries: T[],
): Promise<{ upserted: number; deleted: number }> {
  const { data: existing, error: readError } = await client.from(table).select("id");
  if (readError) throw new Error(`${table}: read failed: ${readError.message}`);

  for (let i = 0; i < entries.length; i += CHUNK) {
    const { error } = await client
      .from(table)
      .upsert(entries.slice(i, i + CHUNK) as Record<string, unknown>[], { onConflict: "id" });
    if (error) throw new Error(`${table}: upsert failed: ${error.message}`);
  }

  const keep = new Set(entries.map((e) => e.id));
  const stale = ((existing ?? []) as { id: string }[])
    .map((r) => r.id)
    .filter((id) => !keep.has(id));
  if (stale.length > 0) {
    const { error } = await client.from(table).delete().in("id", stale);
    if (error) throw new Error(`${table}: delete failed: ${error.message}`);
  }
  return { upserted: entries.length, deleted: stale.length };
}

async function main(): Promise<void> {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env.local.");
    process.exit(2);
  }

  // Validate both files completely before touching the database.
  const tools = validateAll(TOOLS_FILE, validateTool);
  const glossary = validateAll(GLOSSARY_FILE, validateGlossary);
  const drafts = tools.filter((t) => t.status === "draft").length;
  console.log(
    `validated ${tools.length} tools (${drafts} draft) and ${glossary.length} glossary terms`,
  );

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const updatedAt = new Date().toISOString();
  const toolRows = tools.map((t) => ({ ...t, updated_at: updatedAt }));

  const t = await syncTable(client, "tools", toolRows);
  console.log(`tools: upserted ${t.upserted}, deleted ${t.deleted}`);
  const g = await syncTable(client, "glossary", glossary);
  console.log(`glossary: upserted ${g.upserted}, deleted ${g.deleted}`);
}

main().catch((e: unknown) => {
  console.error("seed failed:", (e as Error).message);
  process.exit(1);
});
