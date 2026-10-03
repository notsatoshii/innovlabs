# R4b plan: R3 + the clay-3d test board, site and app

Eric, 2026-10-04: "The previous clay was better in general" → "combine r3 and the 3d test board clay"
→ "create a full plan, review, execute then review process", "loop it and keep going".

Reference: the clay-3d test board (https://claude.ai/artifact/3v6eFQsCXz4UJs1EnS7Yeb). What makes it
work, measured against the site on 2026-10-04:

- **Light and sheen (plan review, verified).** The site called `new RoomEnvironment()` without the
  renderer (0.160: main room light 5 instead of 900) and used sheen `#595959` (linear 0.10) where the
  board has white × 0.35. Both darken the site's clay. Fix first.
- **Composition.** Objects are big,
  sit partly behind frosted glass (blur 24, white 60%, saturate 1.6) and glow through it.
- **Colour wash** behind the glass: peach glow top right, sky glow bottom left, lilac→mint.
- **Phones get plenty of clay** around the glass, not two small corner pieces.
- three.js 0.160 (the site had 0.186: slightly harder, more saturated shading).

Rules: copy frozen; R3 layout stays; no small clay stickers on content sections (R4 tried, Eric
preferred R3); nothing ships to innovlab.me or app.innovlab.me without Eric's one-line go.

## Items

| # | Item | Where | Status |
|---|------|-------|--------|
| 0 | Scene light: pass the renderer to RoomEnvironment, board sheen (white × 0.35); re-shoot | `clay-scene.ts` | |
| 1 | Hero: board wash, placements, phone placements straddling card edges, three 0.160. Reopened: re-judge after item 0 at equal box sizes, three columns (board / R3 live / R4b) | site home | redo check |
| 2 | Remove R4 section stickers, courses cap, clay pillar icons (back to R3) | site | done 6cd5e81 |
| 2b | Phone header clay (business/about/contact) back to R3 (hidden on phones): it is a sticker above the h1 | `global.css` | |
| 2c | Hero/nav seam: the hero wash must meet the sticky nav and the next section without a hard edge | site home | |
| 3 | App /start: board wash behind the page, clay at the top and peeking at the bottom; doors stay solid buttons (no translucent glass); keep the 곧 열려요 grouping; check a 375×667 phone; contrast checked by hand where text meets clay | app `src/app/start`, `ClayRow` | |
| 4 | Re-render stills with the fixed scene, same framing; show Eric old vs new before replacing (gated) | `site/public/clay`, `public/clay` | gated |
| 5 | (dropped after review: clay beside an h1 is the sticker pattern) | | dropped |
| 6 | Other R3 clay (home router cards, final CTA): check against the board; change only clear clashes | site home | |
| 7 | Checks: site build, scripted checks, slow-4G CLS, axe; app lint, typecheck, unit tests, build; reduced motion | both | |
| 8 | Fresh-eyes review of the result against the board (separate reviewer, equal-size screenshots) → fix → re-review | both | |
| 9 | Inventory of the other R4 changes (proof tile, programs glyph, graph/flowchart lines, glass table, font fallbacks, a11y) marked keep, for Eric to see in the preview | doc + preview | |
| 10 | Preview for Eric (same artifact), then on his go: publish site, merge `rebrand-r4` → main, app deploy, verify live | both | waits on Eric |

Plan review (separate reviewer, 2026-10-04): found the light/sheen bug, the phone header sticker,
item 5's risk, unequal screenshot sizes, the seam, and the R4 inventory. All folded in above.
Known difference kept on purpose: the board's lighter coral buttons (#ff6a4d) fail AA with white
text; the site keeps its darker action colour.

## Loop

Each item: build → screenshot at 390 and 1280 next to the board → check → fix → log a line below.
After item 7, item 8 runs a separate reviewer; its findings become new items. Stop only for copy,
facts, brand-direction picks or a production go.

## Log
- Items 0-1 (cd6ff45): RoomEnvironment(renderer) + board sheen; hero 2 columns from 760px. Three-column
  check at equal widths (356, 846) and 768/846/1024/1280: clay visible beside the card at every width.
- Item 2b: phone header clay hidden again, as in R3 (global.css now has no clay diff against R3).
- Item 2c: checked at 390 and 1280: hero top meets the nav in the same lilac; bottom keeps R3's
  hairline section edge. No change.
- Item 3: /start follows the board's app screen: big asterisk and bubble above the heading,
  ring and books peeking from behind the 곧 열려요 doors (doors stay solid buttons). Clipped on
  `main` (body clip did not stop the mobile viewport widening to 399px). tsc, eslint, next build OK.
- Item 6: router-card and final-CTA clay checked against the board; R3 as is, no change.
- Item 7: site 19/19 scripted checks, slow-4G CLS ≤ 0.0002, axe 0 on 7 pages; app /start axe 0, CLS 0.003.
- Item 8, review 1 (separate reviewer) → fixes: phone asterisk lower so half sits behind the card;
  cap tucked behind the tab bar's end; ball behind the tab bar on desktop; hero chips thinner frost
  (white 50%) so the cap shows through; clay scales up to 30% on wide heroes (1280 filled like the
  board); app /start clay row tighter (heading at ~28% of a 667 phone, board ~22%), clip only below
  768px (books were cut at the main edge on desktop); app background "seam" was a full-page
  screenshot artefact of `background-attachment: fixed` (none when scrolling); stills re-rendered
  with the fixed light, same framing (pencil given room at the top, large asterisk pose matched),
  7 files in site + app, 40% smaller. Item 4 done; old stills kept in the preview for Eric.

## What ships against main (R3) — item 9 inventory

Clay (R4b): home hero as on the test board (wash, placements, two columns from 760px, clay scales on
wide screens, thinner chip frost); scene lit like the board (three 0.160, RoomEnvironment(renderer),
board sheen); all 7 clay stills re-lit (site + app), same framing; app /start clay as on the board's
app screen.
Kept from R4 (not clay): no layout jump while fonts load (Jua preload + metric-matched fallbacks);
a11y (business table focusable region, /students h1); 주 10시간+ tile opaque; 나만의 커리큘럼 glyph
soft; flowchart and second-brain graph lines soft plum, graph node moved off the centre on phones;
business formats table in glass.
Back to R3: no clay stickers on content sections, pixel pillar icons, header clay hidden on phones.
