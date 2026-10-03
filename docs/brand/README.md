# InnovLabs brand: 시간표 (timetable)

Chosen 2026-10-03 (option B of the brand board; Eric: "you do this"). Replaces the neo-brutalist
lime/pink/black look on both the site (`site/`) and the app (root). Product truth: `PRODUCT.md`.

## Idea

The page is the weekly timetable taped to every 학원 office wall. Classes are grey blocks, admin
work is marker-coloured blocks, and the promise happens on the grid: admin blocks become hatched
"되찾은 시간" blocks. The asterisk is the footnote mark on every estimate (*예시, *추정): everything
is an experiment and every number has a note.

## Tokens

| Role | Token (site / app) | Value | Notes |
|---|---|---|---|
| Ground | `--paper` / `--background` | #FBFDFF | grid paper; 24px rules in `--grid` |
| Grid rule | `--grid` | #DCE6F2 | 1px lines, body background |
| Ink | `--ink` / `--nb-ink` | #14213D | board navy: text, borders, rules |
| Ink soft | `--grey-text` | #4A5873 | secondary text, 7.6:1 on paper |
| Action | `--lime` → `--marker` | #FFE14D | primary CTA fill, highlighter, logo dot |
| Coral | `--pink` → `--coral` | #FF8F73 | 상담 blocks, accent fill; never text on paper |
| Coral deep | `--nb-pink-deep` | #B4361A | accent text on paper, 5.6:1 |
| Sky | `--cyan` → `--sky` | #8CC8FF | 성적표 blocks |
| Lilac | `--lilac` | #C6B3FF | 시험지 blocks |
| Mint | `--mint` | #7FDCB4 | 블로그·마케팅 blocks |
| Highlight | `--yellow` → `--highlight` | #FFF0A3 | soft yellow fills (was yellow) |
| Class | `--grey-fill` | #E9EEF5 | class blocks, quiet fills |
| Hatch | `--hatch` | repeating 45° #FFF / #E1EAF5 | 되찾은 시간 blocks, dashed ink border |

Lines: 2px ink (`--border`), 1.5px for glyph-scale marks. Radius: 6px blocks and buttons, 10px
panels, 4px glyph tiles. Depth: soft navy shadows only (`0 18px 40px -24px rgba(20,33,61,.45)`
large, `0 6px 14px -6px` small); no hard offset shadows.

## Type

- Display: **Black Han Sans** (one weight), headlines and big numbers in Korean.
- Text: **Pretendard Variable** (already self-hosted), body and UI.
- Times and figures: **Barlow Condensed** 600/700 with tabular numerals (14:00, 주 6~9시간).
- Korean: `word-break: keep-all` everywhere. Highlighter emphasis = yellow underlay at 58%.

## Mark

The asterisk stays: navy bars on a white 4px-radius tile with a 2px navy border, a marker-yellow
centre square. Wordmark INNOVLABS in Black Han Sans with the yellow superscript square. Favicons
regenerate from this tile.

## Motion

One authored moment per page: admin blocks wipe into hatched 되찾은 시간 blocks, once, on load.
Buttons lift 2px on hover. Everything else is static. `prefers-reduced-motion` shows the end state.

## Voice

Unchanged: Korean written natively, 합니다체 on the site, 해요체 in the app, 저희 for InnovLabs,
no 보장/반드시, every number a range with its note.

## Phases

One file per phase in `phases/`; each ends with a review, screenshots for Eric, and a stop.
R0 foundation · R1 site home for 원장 · R2 app funnel · R3 app learner area · R4 rest of site.
Parity checklist: `parity.md` (every page, section and control before the rebrand).
