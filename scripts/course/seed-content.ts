// Seed public.course_content (migration 0012, phase-online.md O1-D3) from the
// mission JSON files in the private curriculum repo. Runs locally only, with
// the service role key from .env.local; never in the browser or the container.
//
//   npx tsx scripts/course/seed-content.ts [--check]
//   COURSE_CONTENT_DIR=<folder> npx tsx scripts/course/seed-content.ts [--check]
//
// The folder defaults to ~/claude-workspace/curriculum/online/content
// and is searched for **/*.json. Every file goes through validateMission, then
// every course level through validateLevel. Any problem refuses the whole run
// before a single write. --check stops there (and needs no database).
// Otherwise each mission is upserted by mission_id; a row whose data is
// unchanged is left alone, a changed one gets version + 1. Rows in the table
// that no file matches are reported, not deleted. Mission text is private: the
// script prints ids, counts and check results only.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, relative, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { validateLevel, validateMission } from "../../src/lib/course/validate";
import type { MissionContent } from "../../src/lib/course/types";

const DEFAULT_DIR = join(homedir(), "claude-workspace", "curriculum", "online", "content");

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

function findJson(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".") || name === "node_modules") continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...findJson(full));
    else if (name.toLowerCase().endsWith(".json")) out.push(full);
  }
  return out.sort();
}

/** JSON with sorted keys, so a jsonb round trip compares equal. */
function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(v);
}

async function main(): Promise<void> {
  loadEnvLocal();
  const checkOnly = process.argv.includes("--check");
  const dir = resolve(process.env.COURSE_CONTENT_DIR || DEFAULT_DIR);
  if (!existsSync(dir)) {
    console.error(`content folder not found: ${dir} (set COURSE_CONTENT_DIR)`);
    process.exit(2);
  }

  const files = findJson(dir);
  if (files.length === 0) {
    console.error(`no .json files under ${dir}`);
    process.exit(2);
  }

  const problems: string[] = [];
  const missions: { file: string; mission: MissionContent }[] = [];
  for (const file of files) {
    const rel = relative(dir, file);
    let json: unknown;
    try {
      json = JSON.parse(readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
    } catch (e) {
      problems.push(`${rel}: not valid JSON (${(e as Error).message.split("\n")[0]})`);
      continue;
    }
    const r = validateMission(json);
    if (!r.ok) {
      for (const err of r.errors) problems.push(`${rel}: ${err}`);
      continue;
    }
    missions.push({ file: rel, mission: r.mission });
  }

  // Unique ids across all files, then the level rules.
  const byId = new Map<string, string>();
  for (const { file, mission } of missions) {
    const seen = byId.get(mission.id);
    if (seen) problems.push(`${file}: mission id ${mission.id} is also in ${seen}`);
    else byId.set(mission.id, file);
  }
  const levels = new Map<string, MissionContent[]>();
  for (const { mission } of missions) {
    const key = `${mission.course}/${mission.level}`;
    levels.set(key, [...(levels.get(key) ?? []), mission]);
  }
  const known = new Set(byId.keys());
  for (const list of levels.values()) problems.push(...validateLevel(list, known));

  console.log(`${files.length} file(s), ${missions.length} valid mission(s) in ${levels.size} level(s)`);
  for (const [key, list] of [...levels.entries()].sort()) {
    const ids = [...list].sort((a, b) => a.ord - b.ord).map((m) => `${m.id}${m.kind === "skip_test" ? "(skip)" : ""}`);
    console.log(`  ${key}: ${ids.join(", ")}`);
  }
  if (problems.length > 0) {
    console.error(`\n${problems.length} problem(s); nothing written:`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  if (checkOnly) {
    console.log("\n--check: all valid; nothing written.");
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are needed in .env.local");
    process.exit(2);
  }
  const admin = createClient(url, key, { auth: { persistSession: false } });

  const { data: existing, error: readError } = await admin
    .from("course_content")
    .select("mission_id, version, data");
  if (readError) {
    console.error(`course_content read failed: ${readError.message}`);
    process.exit(1);
  }
  const current = new Map(
    ((existing ?? []) as { mission_id: string; version: number; data: unknown }[]).map((r) => [r.mission_id, r]),
  );

  const now = new Date().toISOString();
  const rows = [];
  let unchanged = 0;
  for (const { mission } of missions) {
    const row = current.get(mission.id);
    if (row && canonical(row.data) === canonical(mission)) {
      unchanged++;
      continue;
    }
    rows.push({
      mission_id: mission.id,
      course: mission.course,
      level: mission.level,
      ord: mission.ord,
      version: (row?.version ?? 0) + 1,
      data: mission,
      updated_at: now,
    });
  }
  if (rows.length > 0) {
    const { error } = await admin.from("course_content").upsert(rows, { onConflict: "mission_id" });
    if (error) {
      console.error(`course_content upsert failed: ${error.message}`);
      process.exit(1);
    }
  }
  console.log(`\nupserted ${rows.length} (${rows.map((r) => `${r.mission_id} v${r.version}`).join(", ") || "none"}), unchanged ${unchanged}`);

  const orphans = [...current.keys()].filter((id) => !byId.has(id));
  if (orphans.length > 0) console.log(`in the table but in no file (left alone): ${orphans.join(", ")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
