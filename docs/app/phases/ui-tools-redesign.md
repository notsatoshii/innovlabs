# UI redesign: 리소스 → 도구

Design step of the UI improvement loop (`process.md`, "UI improvement loop").
Screen: `/app/resources` (도구 view). Owner's words: "the Tools layout currently
isn't the friendliest for UI. We need like a better filter for tools that are
recommended at different levels. People have short attention spans."

Status: design done, pick made (Concept A), `content/resources/picks.json`
drafted. Not built. Critique section is empty until the critic runs.

---

## 1. Evidence: the screen today

Sources: `src/app/app/resources/page.tsx`, `ToolLibrary.tsx`, `ToolCard.tsx`,
`src/lib/resources/queries.ts`, `src/app/app/layout.tsx`, `TabBar.tsx`,
`content/resources/tools.json`.

How the pixel numbers were taken: the app needs a signed-in session, so I
rebuilt the current markup as a static page with the same Tailwind values
(sizes, paddings, gaps, borders), the same Pretendard webfont and
`word-break: keep-all`, a 375px shell, and all 250 visible tools, then read
element positions in the browser. Expect ±1 line against the live page.

**Data.** `tools.json` has 254 entries; 4 are `draft` (3 at L3, 1 at L4) and RLS
hides them, so the page lists **250**: L1 72, L2 32, L3 77, L4 69. 23 are
`taught` (L1 8, L2 4, L3 11, **L4 0**), 10 `mentioned`, 217 `reference`. Of the
72 L1 entries, 29 are 학습 자료 and 19 are 벤치마크; 24 are tools in the
everyday sense.

**Counts will move.** Two unmerged batches sit in `content/resources/batches/`
(`v04-office.json`, `v04-trending.json`: 50 entries, all `reference`; 23 of
them L1, six of those mention 회의록, e.g. clova-note). Every count in this
document (67개, 검색 결과 11개, and so on) is for `tools.json` as committed. If
the batches are merged before the critique, the counts change but the pass
criteria do not: taught tools still sort first, and no new entry is `taught`.

**Viewport.** Content column is 327px (375 minus `px-6` twice). The fixed tab
bar takes 66px (`h-16` plus `border-t-2`), so the visible height is 746px on a
375×812 phone and 601px on 375×667.

| Question | Today |
|---|---|
| What the first screen shows | Eyebrow, h1, a 2-line purpose paragraph (103px), 3 sub-view tabs (40px), search field (47px), then a 338px filter panel. The first tool card starts at **y = 615** (571 when the learner has no depth flag). On 375×667 that is below the fold: **zero tools on the first screen**. On 375×812 you see 131px of one card: its name, its badge row, the label "이게 뭐냐면" and one line of text. |
| Filter controls above the first tool | **10 controls in 5 groups**: search (1), 난이도 chips (4, they wrap to two rows), 분류 select (1, with 24 options), 상태 chips (3), 내 경로만 보기 checkbox (1). 9 when the learner has no depth flag. The 3 sub-view tabs sit above those, so 13 tap targets before any tool. |
| Height of one card | Median **556px = 20 rendered lines** (name 1, badge row 1, 4 labels, 11 lines of body text, cost line 1, button 1, plus 1 to 3 for the yellow note on 44 cards). Range 465 to 737px, 16 to 27 lines. One card is 0.93 of a 667-tall screen, 0.75 of an 812-tall one. Cards are always fully expanded; there is no collapsed state. |
| Scrolling to see ten tools | The tenth card ends at y ≈ 6,590 (6,588 browser path, 6,595 agent path, 6,729 no flag). That is **11 screens** at 601px, **8.8 screens** at 746px. The whole list is 143,462px, about 239 screens. |
| Default order | `orderToolsForLearner`: tools on the learner's path first (−2), then tools tagged with the learner's track or with no track tag (−1), then `sort_order`, then `id`. **Level is not part of the order and no level is preselected**; all 250 are listed. |

What that order produces (track 문서·행정, first ten by level):

- browser_only: L1 L1 L2 L2 L2 L1 L1 L1 L2 L1. Mixed L1 and L2 with no grouping.
- full_agent: L1 L1 L2 L2 L1 L2 L1 **L4 L4 L4**. No L3 tool in the first ten.
  Positions 8 to 10 are AutoAgent, BettaFish, MiroFish, three tools whose own
  entries say "실습에서 쓰지는 않아요". The first L3 tool is #11 (a reference
  entry). **Claude Code, the taught L3 tool the agent path depends on, is #140**
  because it is tagged SMB, DAT.
- no depth flag: plain `sort_order`, which is alphabetical among the taught
  tools: L1 L1 L1 L1 L3 L3 L2 L2 L3 L2.

**회의록 today.** Tap the search field, type 회의록: 11 results across all four
levels. The results render under the filter panel, so the first one (Claude)
starts at y = 615 and is 627px tall. The word 회의록 is in its second labelled
paragraph. On a 667-tall phone the answer is not on screen until you scroll.

---

## 2. Task script (the critic runs this on the built screen)

Common setup: 375×812 viewport, signed in, `/app/resources` freshly loaded,
scrolled to top. A tap is one touch on a control. Scroll gestures are counted
separately. Typing is not required by any task. Seconds are measured from page
ready to the moment the stated content is on screen.

**T1. 회의록.** Learner: `depth_flag = browser_only`, track `docs_admin`.
"As a browser-path beginner, find what to use for 회의록."
Pass when all hold:
- at most **3 taps**, **0 scrolls**, under **15 seconds**, no typing;
- the first result is an L1 tool (expected: Claude) and the sentence that
  mentions 회의록 is visible in its row without opening it;
- no L2+ tool is listed above an L1 tool.
Expected route: search field (1) → "회의록" chip (2) → answer visible; an
optional third tap opens the row for the full entry.

**T2. Only what the course teaches, at my level.** Learner:
`depth_flag = full_agent`, track `research_planning`.
"Show me only the tools the course teaches at my level."
Pass when all hold:
- with **0 taps**, the first screen shows at most 5 picks for L3 and every one
  has status `taught`;
- within **3 taps**, **0 scrolls**, under **10 seconds**, the screen shows a list
  headed "수업에서 다루는 L3 도구 11개" with exactly the 11 taught L3 tools,
  no other level and no 참고/소개 entries;
- Open Deep Research and Scrapling (the learner's track) are the first two rows.
Expected route: 필터 (1) → 수업에서 다루는 도구만 (2) → "11개 보기" (3).

**T3. One level up.** Learner: same as T1.
"I'm comfortable at my level. What would the next level look like?"
Pass when all hold:
- **1 tap** shows the L2 picks (4 of them), with the L2 reason line saying what
  L2 requires, all on screen without scrolling, under **5 seconds**;
- the "내 레벨" marker is still on L1 while L2 is shown;
- **1 more tap** returns to the L1 picks; nothing else on the screen changed.
Either the L2 segment or the "한 단계 위" button may be used for the first tap.

---

## 3. Three concepts

### Concept A: 레벨 바 + 추천 다섯 개

One always-visible level bar; under it, at most five picks for that level as
compact rows; everything else is one scroll or one tap further.

```
┌─────────────────────────────────────┐ 375
│ 리소스                              │
│ 도구 라이브러리                     │
│ [ 도구 ]  [ 용어집 ]  [ 도구 스택 ] │
│  ⌜내 레벨⌝                          │
│ ┏━━━━━━━━┯━━━━━━━┯━━━━━━━┯━━━━━━━┓ │
│ ┃ L1     │ L2    │ L3    │ L4    ┃ │
│ ┃ 누구나 │ 설치형│ 터미널│ 개발자┃ │
│ ┗━━━━━━━━┷━━━━━━━┷━━━━━━━┷━━━━━━━┛ │
│ [ 이름이나 할 일로 찾기   ] [ 필터 ]│
│ 내 레벨에 맞는 추천                 │
│ 로그인만 하면 바로 써요. 어시스턴트 │
│ 는 셋 중 하나만 골라도 …            │
│ ┌─────────────────────────────────┐ │
│ │ ChatGPT (L1)                  ⌄ │ │
│ │ 가장 널리 쓰이는 AI 어시스턴트… │ │
│ ├─────────────────────────────────┤ │
│ │ Claude (L1)                   ⌄ │ │
│ │ 글을 읽고 쓰고 정리해 주는 AI…  │ │
│ ├─────────────────────────────────┤ │
│ │ Gemini (L1)                   ⌄ │ │
│ ├─────────────────────────────────┤ │
│ │ NotebookLM (L1)               ⌄ │ │
│ ├─────────────────────────────────┤ │
│ │ ChatGPT Deep Research (L1)    ⌄ │ │
│ └─────────────────────────────────┘ │  y = 703
│ ─ ─ ─ ─ ─ ─ ─ fold (746) ─ ─ ─ ─ ─ │
│ [ 한 단계 위, L2 설치형 추천 보기 ] │
│ L1의 다른 도구 67개   [ 수업 도구만 ]│
│ …compact rows, 10 at a time…        │
└─────────────────────────────────────┘
```

- **First screen without scrolling:** the level bar with the learner's own level
  marked, search + 필터, the heading "내 레벨에 맞는 추천", a one-line reason,
  and all five picks. Measured on a static prototype: picks end at y = 703
  (L1, L3), 677 (L2), 741 (L4); the fold is 746.
- **How level recommendation works:** the level is preselected from the profile.
  Picks come from `content/resources/picks.json` (≤5 per level, taught first).
  Tapping another segment swaps the picks in place. A "한 단계 위" button under
  the picks does the same for the next level. A row is name + level badge + one
  sentence; tapping it opens today's full entry inline.
- **Cost:** medium. One component rewritten, three small new ones, one pure
  helper module, one static file. Picks need an owner each quarter (same cadence
  as `stack.json`). On a 667-tall phone only three picks fit fully.

### Concept B: 할 일 먼저

Start from the job, not the tool. Level is a small secondary control.

```
┌─────────────────────────────────────┐
│ 리소스 / 도구 라이브러리            │
│ [ 도구 ]  [ 용어집 ]  [ 도구 스택 ] │
│ 오늘 뭘 하려고 하세요?   내 레벨 L1⌄│
│ ┌───────────────┐ ┌───────────────┐ │
│ │ 회의록·정리   │ │ 보고서·문서   │ │
│ └───────────────┘ └───────────────┘ │
│ ┌───────────────┐ ┌───────────────┐ │
│ │ 리서치·조사   │ │ 엑셀·숫자     │ │
│ └───────────────┘ └───────────────┘ │
│ ┌───────────────┐ ┌───────────────┐ │
│ │ 반복 일 자동화│ │ 공부·소식     │ │
│ └───────────────┘ └───────────────┘ │
│ [ 도구 이름으로 찾기              ] │
└─────────────────────────────────────┘
 after a tile:
│ 회의록·정리에는 이걸 써요 (L1)      │
│ │ Claude (L1)                   ⌄ │ │
│ │ ChatGPT (L1)                  ⌄ │ │
│ 한 단계 위에서는                    │
│ │ Custom GPTs (L2)              ⌄ │ │
```

- **First screen:** six job tiles and a name search. No tool is visible until a
  tile is tapped.
- **How level recommendation works:** each tile opens up to three tools for that
  job at the learner's level, then up to two from the level above.
- **Cost:** high, and mostly content. The data has no job field: the 23
  categories are technical (에이전트, MCP, 지식·RAG), and `picks.json`
  (`level, ids, reason`) cannot express job × level. It needs a second curated
  map of 6 jobs × 4 levels, half of which would be empty at L1 (no L1 tool for
  자동화 is taught), or keyword matching, which is noisy ("발표" matches eight
  tools, four of them leaderboards and none for making slides). It also hides the thing the owner asked
  for, the level filter, behind a small dropdown.

### Concept C: 레벨 사다리

No level control. The four levels are four stacked sections; the learner's own
is open, the others are one-line rungs.

```
┌─────────────────────────────────────┐
│ 리소스 / 도구 라이브러리            │
│ [ 도구 ]  [ 용어집 ]  [ 도구 스택 ] │
│ [ 이름이나 할 일로 찾기   ] [ 필터 ]│
│ ┏ L1 누구나 · 내 레벨 ━━━━━━━━━ ⌃ ┓ │
│ ┃ 로그인만 하면 바로 써요.        ┃ │
│ ┃ ChatGPT                       ⌄ ┃ │
│ ┃ Claude                        ⌄ ┃ │
│ ┃ NotebookLM                    ⌄ ┃ │
│ ┃ [ L1 도구 72개 모두 보기 ]      ┃ │
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ │
│ ┌ L2 설치형 · 32개 ───────────── ⌄ ┐│
│ ┌ L3 터미널 · 77개 ───────────── ⌄ ┐│
│ ┌ L4 개발자 · 69개 ───────────── ⌄ ┐│
└─────────────────────────────────────┘
```

- **First screen:** own level open with three picks, the other three levels as
  rungs with counts. The whole ladder is visible at once.
- **How level recommendation works:** each rung opens to its top three picks and
  a "모두 보기" button. Stepping up is tapping the next rung.
- **Cost:** medium to build, higher to use. Disclosure is nested three deep
  (rung → row → full entry). Opening L2 pushes or closes L1, so "go back to my
  level" becomes a scroll. For an agent-path learner the open rung is third
  from the top, under two closed ones. Only three picks fit, and filter results
  are split across four sections.

---

## 4. Scoring and pick

5 = best. Tap and second counts are estimates from the wireframes (about one
second per tap plus reading), to be replaced by the critic's measurements.

| Criterion | A: 레벨 바 + 추천 | B: 할 일 먼저 | C: 레벨 사다리 |
|---|---|---|---|
| T1 회의록 (≤3 taps, ≤15 s) | 2 taps, ~6 s (search → 회의록 chip). **5** | 1 tap, ~3 s. **5** | 1 tap + typing, ~12 s; fails "no typing". **2** |
| T2 수업 도구만, 내 레벨 | 0 taps for five picks, 3 taps for all 11. **5** | Level and status both hidden; 4+ taps. **2** | 3 taps, results spread over rungs. **3** |
| T3 한 단계 위 | 1 tap, in place, 1 tap back. **5** | 2 taps, then choose a job again. **2** | 1 tap, but own level moves; back is a scroll. **3** |
| First screen at 375×812 | Level + 5 tools. **5** | 6 tiles, 0 tools. **2** | 3 tools + 3 rungs. **4** |
| Answers the owner's ask (level filter, short attention) | Level is the first control; five rows. **5** | Level demoted. **2** | Level is the structure, but nested. **4** |
| Brand rules (Korean 해요체, nb-* only, lime/cyan as fills) | Reuses nb-flat, nb-card, nb-badge, nb-sticker; level colours only as fills. **5** | Same. **5** | Same. **5** |
| Build cost | 1 rewrite + 3 small components + helpers. **4** | Plus a job taxonomy that does not exist. **1** | Nested accordions, split results. **3** |
| Content risk (rule: no invented curriculum facts) | One static file, 19 ids, all checked against `tools.json`. **4** | Job → tool map for 250 tools is new editorial content. **1** | Same file as A. **4** |
| **Total (of 40)** | **38** | **20** | **28** |

**Pick: Concept A.** It is the only one that passes all three tasks, it puts the
owner's request (level) at the top, and it needs no data the repo does not
already have. It borrows one idea from B at keyword cost: five preset "할 일"
chips that fill the search field.

---

## 5. Build spec (Concept A)

### 5.1 Files

| File | Change |
|---|---|
| `content/resources/picks.json` | **New, drafted with this spec.** Shape below. |
| `src/lib/resources/types.ts` | Add `LevelPicks`. |
| `src/lib/resources/levels.ts` | New. Pure helpers, no server imports (used by the client component). |
| `src/app/app/resources/page.tsx` | Import `picks.json` (same pattern as `stack.json`), pass new props, stop calling `orderToolsForLearner`, and do not render the purpose paragraph on the 도구 tab (the picks heading does that job; 용어집 and 도구 스택 keep theirs). |
| `src/components/resources/ToolLibrary.tsx` | Rewritten. |
| `src/components/resources/ToolCard.tsx` | Becomes `ToolRow` (collapsed header + toggle) and `ToolDetail` (today's card body, unchanged content). `formatStars` and `formatMonth` stay. |
| `src/components/resources/LevelSwitch.tsx` | New. |
| `src/components/resources/FilterSheet.tsx` | New. |
| `src/lib/resources/queries.ts` | `orderToolsForLearner` is no longer used by the page; remove it or leave it, builder's call. `learnerPath`, `learnerTrackCode`, `fetchTools` unchanged. |
| `SubViewTabs.tsx`, DB schema, migrations | **No change.** |

Optional but recommended: extend `scripts/seed-resources.ts` to fail when a pick
id is missing from `tools.json`, is `draft`, has a `difficulty` different from
its entry's `level`, or when an entry has more than five ids. There is no test
runner in the repo, so this is the cheapest guard.

### 5.2 Data: picks.json

```ts
// src/lib/resources/types.ts
export interface LevelPicks {
  level: Difficulty;   // 1 | 2 | 3 | 4, one entry per level
  ids: string[];       // tool ids in display order, at most 5; the LAST one is the swap slot
  reason: string;      // Korean, 해요체, at most ~50 characters (two lines at 13px)
}
```

Drafted content (all ids verified against `tools.json`, level and status
checked):

| Level | Picks, in order | Status | Reason line |
|---|---|---|---|
| L1 | ChatGPT, Claude, Gemini, NotebookLM, ChatGPT Deep Research | 5 taught | 로그인만 하면 바로 써요. 어시스턴트는 셋 중 하나만 골라도 실습을 다 따라올 수 있어요. |
| L2 | Claude Skills, Custom GPTs, Claude Connectors & MCP, GitHub | 4 taught (all there are) | 앱을 깔거나 계정만 연결하면 돼요. 한 번 세팅해 두면 같은 설명을 반복하지 않아도 돼요. |
| L3 | Claude Code, DigitalOcean, OpenClaw, Claude API & Agent SDK, Hermes Agent | 5 taught | 에이전트 경로의 뼈대예요. 설치와 설정은 Claude Code에게 말로 시키면 돼요. |
| L4 | FastMCP, pgvector, promptfoo, Prompt caching, LangGraph | 1 mentioned, 4 reference | 수업 실습에는 없는 단계예요. 개발자와 같이 만들 때 먼저 볼 만한 것들이에요. |

Why these:
- L1 and L3 follow `stack.json` (2026-09): assistant, knowledge tool, research
  tool for the browser path; installer, server, always-on agent, model API for
  the agent path. The L1 reason is grounded in the Gemini and ChatGPT entries
  ("서로 바꿔 쓸 수 있어요", "이 하나로 따라갈 수 있어요").
- L2 has exactly four taught tools; a fifth would have to be a non-taught one,
  so the list stops at four. GitHub is last because it is agent-path only.
- L4 has **no taught tool**. FastMCP is the only `mentioned` L4 entry meant to be
  used (the other three, AutoAgent, BettaFish, MiroFish, say "개념만
  가져가세요"). The four reference picks are the ones whose own entries tie them
  to the course or to our platform ("저희 앱이 쓰는 방식", "저희 플랫폼의 …
  회귀 테스트", "저희 앱의 원페이저 생성 슬롯도 이 원리", "저희가 말하는 판단
  관문이 있는 파이프라인"). This level is editorial and needs Eric's sign-off.

### 5.3 Deriving the learner's level

```ts
// src/lib/resources/levels.ts
export function levelFromDepthFlag(flag: DepthFlag | null | undefined): Difficulty | null {
  if (flag === "browser_only") return 1;
  if (flag === "full_agent") return 3;
  return null;
}
```

- `myLevel = levelFromDepthFlag(profile.depth_flag)`.
- Selected level on load = `myLevel ?? 1`.
- `browser_only` → L1 selected, "내 레벨" marker on L1, L2 one tap away twice
  over (the L2 segment, and the "한 단계 위" button under the picks).
- `full_agent` → L3 selected, marker on L3.
- No flag → L1 selected, **no marker** (we do not know their level, so we do not
  claim one), heading reads "L1 누구나 추천".
- The selected level is client state only. It is not written to the profile
  or the URL in v1; leaving the tab and coming back resets it to the default.
- `track` (already computed by the page) and `learnerPath` are passed through
  for ordering.

### 5.4 Components and props

```ts
// page.tsx → client
<ToolLibrary
  tools={ToolEntry[]}            // fetchTools() result as is (sort_order asc, no drafts)
  picks={LevelPicks[]}           // content/resources/picks.json
  myLevel={Difficulty | null}    // levelFromDepthFlag
  learnerPath={ToolPath | null}  // unchanged
  track={TrackCode | null}       // learnerTrackCode
/>

LevelSwitch   { value: Difficulty; myLevel: Difficulty | null; onChange(level: Difficulty): void }
ToolRow       { tool: ToolEntry; line: React.ReactNode }   // owns its own open/closed state
ToolDetail    { tool: ToolEntry }                            // today's card body
FilterSheet   { open: boolean; onClose(): void; level: Difficulty;
                taughtOnly: boolean; onTaughtOnly(v: boolean): void;
                category: ToolCategory | ""; onCategory(c: ToolCategory | ""): void;
                categories: { id: ToolCategory; count: number }[];   // present at this level only
                learnerPath: ToolPath | null; myPathOnly: boolean; onMyPathOnly(v: boolean): void;
                resultCount: number; onReset(): void }
```

`ToolLibrary` state: `level`, `query`, `taughtOnly`, `category`, `myPathOnly`,
`suggestOpen`, `sheetOpen`, `shown` (pagination).

Helpers in `levels.ts`: `levelFromDepthFlag`, `resolvePicks`, `compareForLearner`,
`oneLiner`, `snippetFor`, `matchesQuery` (moved from `ToolLibrary.tsx`, plus the
Korean category label in the haystack).

Layout, top to bottom inside `ToolLibrary` (`flex flex-col gap-3`):

1. **LevelSwitch.** One joined bar: `nb-flat grid grid-cols-4`, cells
   `min-h-12`, separated by `border-l-2` ink. Each cell is a `<button>` with two
   lines: "L1" (`text-sm font-extrabold`) over "누구나" (`text-[11px] font-bold`).
   Selected cell: the level's fill (`--nb-lime`, `--nb-cyan`, `--nb-yellow`,
   `--nb-pink`, same map as today's `DIFFICULTY_FILL`) plus a 4px ink bar inside
   the bottom edge (`shadow-[inset_0_-4px_0_0_var(--nb-ink)]`) so the state does
   not rely on colour. Unselected: paper. Text is always ink. The learner's own
   level carries an `nb-sticker` reading "내 레벨" on its top edge (the same
   pattern as the tab bar's 준비 중 sticker). It deliberately looks different
   from the sub-view tabs above it (joined bar, no drop shadow) so the two rows
   are not read as one.
2. **Search row.** `flex gap-2`: search input (`nb-input min-h-11 flex-1 px-3.5
   text-base`) and the 필터 button (`nb-btn min-h-11 px-3.5 text-sm`, white;
   yellow with a count when any sheet filter is on).
3. **Suggestions** (only while `suggestOpen`): label + five chips.
4. **Browse mode:** picks section, step-up button, "다른 도구" section.
   **Result mode:** result header + result list (picks and step-up hidden).

Row (`ToolRow`), collapsed: `flex items-start gap-3 px-3 py-2.5 text-left w-full`.
Left column: line 1 is the name (`text-[15px] font-extrabold truncate`) and a
short badge "L1" (`nb-badge px-1.5 text-[11px] leading-4`, level fill); line 2 is
one sentence (`mt-0.5 text-[13px] leading-[1.45] text-gray-700 line-clamp-2`).
Right: a 20px chevron. Nothing else: no category, status, cost or button until
opened. Rows sit in one `nb-card overflow-hidden` container, divided by
`border-t-2` ink. Measured row height: 61 to 63px with a one-line sentence, 80 to
82px with two.

The "one line" is **one sentence**, the first sentence of `what_it_is`
(`oneLiner`: text up to the first `.`, `!` or `?` followed by a space or the
end). It may wrap to a second rendered line. Reason: Korean puts the defining
noun at the end ("…웹 수집 도구예요"), so a hard one-line cut removes exactly the
informative part; measured at this width, a one-line cut would truncate 175 of
250 entries, a two-line clamp truncates 14.

### 5.5 States

**Default (browse).** As in the Concept A wireframe. Picks from `resolvePicks`.
Under them the step-up button (hidden at L4) and, when the learner is looking at
a level that is not their own, a text button back to it. Then "L1의 다른 도구
67개": every other tool at this level, 10 rows, then "더 보기" adding 20.

**Expanded card.** Tapping a row header toggles it. Open: the chevron turns, the
one-sentence line is replaced by `ToolDetail`: the three full badges (level with
its name, 분류, 상태), the four labelled lines, the cost/licence/stars line, the
yellow Korean note, and "바로 가기 ↗". Same content and order as today's card.
Several rows can be open at once (no auto-close, so nothing jumps under the
finger). Rows close when the level, the query, or a filter changes.

```
│ ┌─────────────────────────────────┐ │
│ │ Claude (L1)                   ⌃ │ │
│ │ [L1 누구나] [Claude] [수업에서 다룸]│
│ │ 이게 뭐냐면                     │ │
│ │ 글을 읽고 쓰고 정리해 주는 AI … │ │
│ │ 이럴 때 써요                    │ │
│ │ 회의 녹취록을 붙여 넣고 …       │ │
│ │ 왜 중요하냐면 / 주의할 점 …     │ │
│ │ 월 $20 (Pro)                    │ │
│ │ ▓ 한국어 UI와 한국어 답변 …  ▓ │ │
│ │ [ 바로 가기 ↗ ]                 │ │
│ ├─────────────────────────────────┤ │
│ │ Gemini (L1)                   ⌄ │ │
```

**Level switch.** Tapping a segment (or the step-up / back button) sets `level`:
picks, reason, heading and the "다른 도구" list swap in place; `shown` resets;
open rows close. The "내 레벨" sticker never moves. In result mode a level
switch keeps the query and the two toggles, and resets 분류 to 전체 if that
category does not exist at the new level. When the change came from the step-up
or back button, scroll the level bar to the top of the viewport.

**Search suggestions.** Focusing the empty search field shows "자주 찾는 일" and
five chips under it. Tapping a chip puts that word in the field, closes the
suggestions and blurs the field (so the keyboard closes and results are
visible). The suggestions also close when the query becomes non-empty or focus
leaves the search block.

**Result mode.** On when `query` is non-empty or any of `taughtOnly`, `category`,
`myPathOnly` is set. Picks and step-up are hidden; the result header and list
sit directly under the search row. When result mode is entered from a control
below the fold (the inline "수업 도구만" chip), scroll the search row into view.
- Filters only (no query): results are **this level only**.
- Query: results come from **all levels**, in two groups: tools at or below the
  selected level first, then a divider and the harder ones. Each row's sentence
  is the matching snippet (`snippetFor`) with the match in `<mark>` (yellow
  fill, ink text).
- 20 rows, then "더 보기".

```
│ [ 회의록                  ] [ 필터 ]│
│ ‘회의록’ 검색 결과 11개 [조건 지우기]│
│ 지금 레벨에서 쓸 수 있는 도구부터   │
│ 보여 드려요.                        │
│ ┌─────────────────────────────────┐ │
│ │ Claude (L1)                   ⌄ │ │
│ │ …주세요'라고 하면 ▓회의록▓ 초안 │ │
│ │ 이 1분 안에 나와요.             │ │
│ ├─────────────────────────────────┤ │
│ │ OpenRouter (L1)               ⌄ │ │
│ └─────────────────────────────────┘ │
│ 더 높은 레벨의 도구 9개             │
│ ┌─────────────────────────────────┐ │
│ │ Claude Connectors & MCP (L2)  ⌄ │ │
```

**Empty result.** An `nb-flat` box with the message and a "조건 지우기" button
(clears query and all three filters, keeps the level).

**Filter sheet.** A native `<dialog>` opened with `showModal()`, anchored to the
bottom, full width up to `max-w-lg`, `nb-flat` with square bottom corners,
bottom padding `calc(1rem + env(safe-area-inset-bottom))`, dimmed backdrop. It
sits above the tab bar. Changes apply immediately; the primary button only
closes it and shows the live count.

```
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│┌───────────────────────────────────┐│
││ 필터                           ✕  ││
││ [✓] 수업에서 다루는 도구만        ││
││ 분류                              ││
││ [ 전체                         ⌄ ]││
││ [ ] 내 경로만 보기 (브라우저 경로)││
││ [ 초기화 ]        [ 11개 보기 ]   ││
│└───────────────────────────────────┘│
```

**No depth flag.** L1 selected, no sticker, no back button, heading "L1 누구나
추천", no "내 경로만 보기" row in the sheet.

**No picks for a level** (entry missing, or every id filtered out): the picks
section and step-up are not rendered; the level list starts under the search
row with the heading "L1 도구 72개".

### 5.6 Korean copy (exact strings, 해요체)

`{L}` is the level badge text from `DIFFICULTY_LABEL` ("L1 누구나"), `{Ln}` the
short form ("L1"), `{n}` a count, `{q}` the query.

| Where | String |
|---|---|
| Eyebrow, h1 | 리소스 / 도구 라이브러리 (unchanged) |
| Purpose paragraph on 도구 tab | removed |
| Level bar, group label (aria) | 레벨 고르기 |
| Level segments | L1 누구나 · L2 설치형 · L3 터미널 · L4 개발자 (existing labels, split over two lines) |
| Own-level sticker | 내 레벨 |
| Search placeholder | 이름이나 할 일로 찾기 |
| Search aria-label | 도구 검색 |
| Suggestions label | 자주 찾는 일 |
| Suggestion chips | 회의록 · 주간보고 · 보고서 · 리서치 · 엑셀 |
| Filter button | 필터 / 필터 {n} |
| Filter button aria-label | 필터 열기 / 필터 열기, {n}개 적용 중 |
| Picks heading, own level | 내 레벨에 맞는 추천 |
| Picks heading, other level or no flag | {L} 추천 (e.g. "L2 설치형 추천") |
| Picks reason | from `picks.json` |
| Step-up button | 한 단계 위, {L+1} 추천 보기 (e.g. "한 단계 위, L2 설치형 추천 보기") |
| Back button (level ≠ own) | 내 레벨 {Ln}로 돌아가기 |
| Level list heading (browse) | {Ln}의 다른 도구 {n}개 |
| Level list heading (no picks) | {Ln} 도구 {n}개 |
| Inline toggle chip | 수업 도구만 |
| Load more | 더 보기 ({n}개 남음) |
| Result heading, query | ‘{q}’ 검색 결과 {n}개 |
| Result helper, query | 지금 레벨에서 쓸 수 있는 도구부터 보여 드려요. |
| Result divider, query | 더 높은 레벨의 도구 {n}개 |
| Result heading, 수업 도구만 alone | 수업에서 다루는 {Ln} 도구 {n}개 |
| Result heading, other filters | 조건에 맞는 {Ln} 도구 {n}개 |
| Reset | 조건 지우기 |
| Empty, query | ‘{q}’에 맞는 도구를 아직 못 찾았어요. 다른 말로 다시 찾아보세요. |
| Empty, filters | 이 조건에 맞는 {Ln} 도구가 아직 없어요. 조건을 조금 풀어 보세요. |
| Row badges (open) | existing: {L}, 분류 label, 수업에서 다룸 / 수업에서 소개 / 참고 |
| Row labels (open) | existing: 이게 뭐냐면 · 이럴 때 써요 · 왜 중요하냐면 · 주의할 점 |
| External link | 바로 가기 ↗ (plus screen-reader text "새 창에서 열려요") |
| Sheet title | 필터 |
| Sheet close (aria) | 필터 닫기 |
| Sheet toggle | 수업에서 다루는 도구만 |
| Sheet select label / first option | 분류 / 전체 |
| Sheet select options | {분류 label} ({n}) |
| Sheet path row | 내 경로만 보기 (브라우저 경로) / 내 경로만 보기 (에이전트·서버 경로) |
| Sheet buttons | 초기화 / {n}개 보기 |
| Live announcement on level change | {L} 추천 {n}개 |

Copy notes: no particles are attached to `{q}` (로/으로 would break on 받침).
The heading "‘{q}’ 검색 결과" avoids it. No 보장/반드시-style wording anywhere.

### 5.7 Ordering rules

**Picks** (`resolvePicks(picks, tools, level, track)`):
1. Take the entry for `level`; map `ids` to tools in file order; drop ids that
   are not in `tools` or whose `difficulty` is not `level`; cap at 5.
2. Track slot: if `track` is set and no remaining pick has it in `tracks`, find
   the lowest-`sort_order` tool with `difficulty = level`, `status = taught` and
   `tracks` containing `track`. If found, it **replaces the last pick** (or is
   appended when there are fewer than five).
3. No other reordering.

With today's data rule 2 fires in exactly four cases: 데이터 at L1 → ChatGPT
Data Analysis replaces ChatGPT Deep Research; 리서치 at L3 → Open Deep Research
replaces Hermes Agent; 영업 at L3 → Scrapling; 관리 at L3 → Paperclip.

**Lists** (`compareForLearner(path, track)`), used for "다른 도구" and for
results within a group:
1. status: `taught`, then `mentioned`, then `reference`;
2. tools on the learner's path first (skipped when `path` is null);
3. tools explicitly tagged with the learner's track first (skipped when null);
4. `sort_order`, then `id`.

**Query results**: group 1 is `difficulty <= level`, sorted by status, then
level closest to the selected one first, then rules 2 to 4. Group 2 is
`difficulty > level`, sorted by level ascending, then rules 1 to 4.

**Snippet** (`snippetFor(tool, query)`): take the first word of the query; look
in `use_it_to`, `what_it_is`, `why_it_matters`, `watch_out`, `korean_notes`, in
that order; in the first field that contains it, take the sentence around the
match; if the match starts more than 14 characters in, start at the nearest
word boundary at most 14 characters before it and prefix "…". No field match
(the hit was in the name, a tag or the category) → fall back to `oneLiner`.

**Search matching**: unchanged from today (every whitespace-separated word must
appear, case-insensitive, in name, id, category slug, tags and the five text
fields), with the Korean category label added to the haystack.

### 5.8 What happens to the existing filters

| Today | Fate |
|---|---|
| Search field | **Stays**, on the first screen, one row with the 필터 button. Font goes from 15px to 16px (iOS zooms the page when a focused input is under 16px). Gains five preset chips on focus. Searches all levels. |
| 난이도 chips (4, multi-select, none selected by default) | **Go.** Replaced by the level bar: single-select, always exactly one level, preselected from the profile. |
| 분류 select (24 options) | **Moves into the 필터 sheet.** Options limited to categories present at the selected level, each with its count. |
| 상태 chips (3, multi-select) | **Go.** Replaced by one toggle, "수업에서 다루는 도구만", in the sheet and as the inline chip "수업 도구만" on the level list heading (both bound to the same state). 수업에서 소개 / 참고 remain visible as a badge on the open row but are no longer filterable. |
| 내 경로만 보기 checkbox | **Moves into the sheet.** Hidden when the learner has no depth flag, as today. |
| Count line and 필터 지우기 | Count moves into the list and result headings. Reset becomes "조건 지우기" (result header, empty state) and "초기화" (sheet). |

Controls above the first tool: 6 (four level segments, search, 필터) in 104px
of height, down from 10 in 401px.

### 5.9 Accessibility

- **Tap targets**: every control is at least 44px tall: level cells 48px, search
  and 필터 44px (`min-h-11`), row headers 61px or more and full width,
  suggestion chips and the inline toggle `min-h-11 px-4`, step-up / back / 더
  보기 / 바로 가기 `min-h-11`, sheet rows `min-h-11` with the whole label
  tappable. At least 8px between neighbouring targets except the joined level
  cells, which are 80px wide.
- **Level bar**: `role="group"` with `aria-label`; four `<button>`s with
  `aria-pressed`. The own-level button's accessible name ends with ", 내 레벨"
  (the sticker itself is `aria-hidden`). Selected state is fill plus the ink
  bar, not colour alone.
- **Rows**: the tool name is an `<h3>` wrapping a `<button aria-expanded
  aria-controls>`; the detail is a `role="region"` labelled by that button. The
  short badge "L1" carries screen-reader text for the level name.
- **Focus**: all new buttons get a visible `focus-visible` outline (2px ink,
  2px offset); `nb-btn` has none today. Opening a row keeps focus on its header.
  Changing level keeps focus on the pressed segment. The step-up and back
  buttons move focus to the picks heading (`tabIndex={-1}`).
- **Live regions**: the result heading is `aria-live="polite"`; level changes
  announce "{L} 추천 {n}개" through one visually hidden polite region.
- **Sheet**: native modal `<dialog>` with `aria-labelledby`; focus lands on the
  first control; Esc, the ✕ button, the primary button and a backdrop tap all
  close it; focus returns to the 필터 button; the page behind does not scroll.
- **Search**: `type="search"`, `enterKeyHint="search"`; Enter blurs the field.
  Suggestion chips are ordinary buttons reachable by Tab after the field.
- **Colour**: lime and cyan appear only as badge and segment fills behind ink
  text. Secondary text is `text-gray-700` on paper. `<mark>` is yellow fill,
  ink text.
- **Motion**: only the chevron rotates; no height animation; honour
  `prefers-reduced-motion`.
- **Layout**: no horizontal page scroll at 375px; long tool names truncate on
  one line in the collapsed row and wrap in the open one.

### 5.10 Out of scope for this loop

Sticky level bar while scrolling, remembering the selected level, level in the
URL, per-level preset chips, analytics, any change to 용어집 or 도구 스택, any
schema or seed change.

---

## 6. What the critic checks

1. T1, T2, T3 pass as written in section 2, at 375×812, with the tap, scroll
   and second counts recorded.
2. First screen, no scrolling: level bar with the right segment selected and
   marked, search + 필터, heading, reason, and **all** picks (5, 4, 5, 5). Repeat
   at 375×667 and record how many picks are fully visible (expected: three;
   at L1 and L3 the fourth shows its name).
3. Default level: browser_only → L1, full_agent → L3, no flag → L1 with no
   "내 레벨" marker anywhere.
4. A collapsed row shows exactly name, level badge, one sentence (at most two
   rendered lines), chevron. Nothing else.
5. An open row shows everything today's card shows, in the same order, and
   "바로 가기" opens a new tab.
6. Picks match `picks.json` in order; the four track swaps in 5.7 happen and no
   others; no pick's level differs from the selected level.
7. Level switch: picks, reason, heading and list all change together; the
   sticker stays on the learner's level; the back button appears only off the
   own level; step-up is absent at L4.
8. Filters: no 난이도 chips or 상태 chips remain on the page; 분류 and 내 경로만
   are only in the sheet; "수업 도구만" in the sheet and the inline chip stay in
   sync; 조건 지우기 restores the picks view at the same level.
9. Search: 회의록 from L1 lists Claude first with the highlighted snippet; from
   L3 the first three are taught tools; the divider count is right; a
   nonsense query shows the empty state with a working reset.
10. Every user-facing string is Korean, 해요체, and matches 5.6 exactly. No
    English labels, no 당신, no 보장/반드시, no broken particles after `{q}`.
11. Brand: only nb-* surfaces and the five palette colours; lime and cyan never
    used as text; the level bar is visibly distinct from the sub-view tabs.
12. Accessibility: every tap target ≥ 44px; visible focus on every control;
    `aria-pressed`, `aria-expanded` and the live regions behave; the sheet traps
    focus and returns it; no horizontal scroll; no zoom on focusing search.
13. Regression: 용어집 and 도구 스택 tabs are unchanged, including their purpose
    paragraphs; draft tools still never appear; lint and build pass.

## Open questions for Eric

1. **L4 picks.** No L4 tool is taught, so that list is my reading of the entries,
   not the curriculum. Confirm, change, or say "show no picks at L4".
2. **Three assistants in the L1 five.** ChatGPT, Claude and Gemini take three
   slots because the course treats them as interchangeable. If you would rather
   show one assistant row and free two slots (Google Workspace, Google Alerts),
   it is a one-line change in `picks.json`.
3. **Preset chips** are plain searches over the entry text, not a curated map.
   They are accurate for the five chosen words today; a new batch of entries
   can add noise.

## Critique

(empty until the critic runs)
