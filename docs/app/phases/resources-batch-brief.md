# Resource library: batch drafting brief

Used by every agent that turns a slice of `docs/curriculum/innovlabs-resource-library-v0.*.md`
into Korean `ToolEntry` JSON. Read fully before writing.

## Contract

- Shape: `ToolEntry` in `src/lib/resources/types.ts`. Exactly its 20 keys, correct types.
  `category` must be one of `TOOL_CATEGORIES` there. `difficulty` 1–4. `status` in
  taught | mentioned | reference | draft. `paths` ⊂ {browser, agent}. `tracks` ⊂
  {DOC,RES,DAT,SAL,CON,MGT,SMB}, empty = every track.
- `id`: lowercase slug, letters, digits, hyphens. Stable. Check the existing ids list
  you were given and never reuse one.
- `url`: required unless `status` is `draft`. GitHub and docs URLs: fetch them (WebFetch)
  and set `last_verified` = "2026-09-10". If a fetch fails or the page is clearly gone,
  try once more with the obvious alternative (org rename, `www`), then set `status`
  "draft", `url` null, and list it in your report. Vendor marketing pages that block
  fetchers (403) keep the doc's URL with `last_verified` null.
- `stars` only when the doc states a number; `stars_dated` = first day of the month the
  doc gives (YYYY-MM-01). Never invent or "update" star counts.
- `status`: everything in the long tail is `reference` unless the doc says a course
  session uses it in a lab (then `taught`) or shows it without a lab (`mentioned`).
  The docs' "⚠️ verify" / "do NOT teach" items stay `reference` (Vibe-Trading: reference
  with the liability warning in `watch_out`).
- `difficulty`: from v0.3 Part 12's map when the tool is listed there; otherwise apply
  the Part 8 test ("what does it take to start using it").
- `paths`: browser-only tools (websites, apps, extensions) → ["browser"]; terminal,
  server, or code tools → ["agent"]; both when both apply.
- `tracks`: only when the doc names a track or a clear audience (DAT for spreadsheets,
  CON for media, SMB for builders, RES for research). Otherwise [].
- `sort_order`: 1000 + your slice number × 100 + position in the slice, so the long
  tail sorts after the taught set and stays in doc order.
- `korean_notes`: only when the doc says something about Korean UI, docs, or the KR
  market; else null. `license`: MIT / Apache-2.0 / AGPL-3.0 / "fair-code" / "상용" /
  null when unknown. `cost`: Korean, e.g. "무료", "무료 티어 있음", "월 $20".

## Voice (CLAUDE.md rule 1, Eric's Korean standard)

Write each of the four text fields in Korean from the meaning of the English entry,
never sentence-by-sentence. 해요체. No 당신, no 보장/반드시, no passive-heavy or
noun-stacked sentences carried over from English, no literal idioms. One or two
sentences per field:

- `what_it_is`: one everyday analogy a 12-year-old or a CEO gets.
- `use_it_to`: one concrete scenario from Korean office or founder life (주간보고,
  회의록, 결재, 카톡, 팀장님, 견적서, 상세페이지, 투자자 메일).
- `why_it_matters`: what it replaces or unlocks; where the curriculum uses it if the doc
  says so.
- `watch_out`: the honest catch from the doc (license, brittleness, cost, hype).

Tool names stay in Latin letters. Numbers with units in Korean style (월 $20, 스타 5만 개).

## Output

One JSON array in the file you were assigned under `content/resources/batches/`.
Validate before finishing: parses; every entry has all 20 keys; categories valid;
no 보장/반드시/당신 anywhere; no id collides with the existing list. Report: count,
draft list, anything you skipped and why, and two entries pasted in full.
