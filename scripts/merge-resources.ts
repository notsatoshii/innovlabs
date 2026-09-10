// Merge content/resources/batches/*.json into content/resources/tools.json.
// The base file wins on id collisions (its entries were reviewed first);
// batches are appended in file-name order. Run before `npm run seed:resources`.
//
//   npx tsx scripts/merge-resources.ts

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ToolEntry } from "../src/lib/resources/types";

const DIR = "content/resources";
const BASE = join(DIR, "tools.json");
const BATCHES = join(DIR, "batches");

const base = JSON.parse(readFileSync(BASE, "utf8")) as ToolEntry[];
const seen = new Map<string, ToolEntry>(base.map((t) => [t.id, t]));
let added = 0;
let skipped = 0;

for (const file of readdirSync(BATCHES).filter((f) => f.endsWith(".json")).sort()) {
  const entries = JSON.parse(readFileSync(join(BATCHES, file), "utf8")) as ToolEntry[];
  for (const entry of entries) {
    if (seen.has(entry.id)) {
      skipped++;
      console.log(`skip ${entry.id} (already in ${file === BASE ? "base" : "an earlier file"})`);
      continue;
    }
    seen.set(entry.id, entry);
    added++;
  }
  console.log(`${file}: ${entries.length} entries`);
}

const merged = [...seen.values()].sort(
  (a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id),
);
writeFileSync(BASE, JSON.stringify(merged, null, 2) + "\n");
console.log(`merged: ${merged.length} total (${base.length} base + ${added} added, ${skipped} skipped)`);
