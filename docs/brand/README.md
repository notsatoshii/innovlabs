# InnovLabs brand: clay + frosted glass

Chosen by Eric on 2026-10-03 after three option rounds (boards: six directions, Bento/Clay
variations, real 3D clay test). Replaces the neo-brutalist lime/pink/black look on the site
(`site/`) and, in R2, the app (repo root). Product truth: `PRODUCT.md`.

## Idea

Real 3D clay objects (the asterisk mark, a graduation cap, books, a chat bubble, a pencil, a ring)
float behind opaque frosted glass. The glass carries every word and control; the clay carries the
warmth. Hand-made, touchable, a little playful, still tidy enough for a company buyer.

## Rules

- **Copy is frozen.** A design phase never rewrites existing copy. New strings only where Eric
  asked, listed for his review (R1: the 학원 hero slide and the persona tab labels).
- Clay objects are real 3D (`site/src/scripts/clay-scene.ts`, three.js): rounded geometry with
  seam-safe lumps, matte physical material with sheen and grain, studio IBL, VSM soft shadows on a
  catcher plane. Never fake clay with CSS or SVG filters. Pages other than the hero get exported
  stills (R3).
- Glass: `.glass` in `global.css` (62% white, 22px blur, white edge, plum-tinted soft shadow).
- Buttons are clay pills: `--action` #D93D22 with white text (4.5:1), inner light top-left,
  shade bottom-right.

## Tokens (site `global.css`)

| Role | Token | Value |
|---|---|---|
| Ground | `--paper` + body wash | #F6F3FB, peach/sky/mint radial wash |
| Ink | `--ink` | #221F38 plum |
| Secondary text | `--grey-text` | #4B4864 (7.9:1 on paper) |
| Action | `--action` | #D93D22 (white text) |
| Clay tomato | `--action-hi` | #FF5436 (objects, highlights) |
| Sun | `--lime` | #FFC23D (fills, highlighter) |
| Pink / wash | `--pink` / pink sections | #FF86A2 / #FFE4EB |
| Soft sun | `--yellow` | #FFF0C2 |
| Sky | `--cyan` | #9FD3FF |
| Radius | `--radius` / `-sm` / `-lg` | 22 / 12 / 32px |

Type: Jua (display, one weight) + Pretendard (text). Korean always `word-break: keep-all`.

## Phases

- **R1 (live 2026-10-03):** site tokens, clay buttons, frosted nav, home hero with live clay and
  the persona carousel (slide 1 = original copy, mini tabs below).
- **R2 (built, waits for the main merge):** app tokens, glass cards, clay buttons, soft borders,
  Jua headings, frosted header, sun clay logo, clay stills on /start, new favicons.
- **R3 (site, live with this deploy):** translucent cards site-wide, 학원 door first in the router
  (reusing the approved hero copy) with clay objects on every card, clay asterisk on the closing
  banners, clay objects on the business/about/contact headers, Jua Korean subset (151 KB, re-run
  `python scripts/subset-jua.py` after copy changes), new share images.
- **Later:** per-section clay compositions on courses/platform, photo frames once real photos
  arrive, app learner-area polish (A16/A17 come with the other session's app branch).

Clay stills: rendered from `site/src/scripts/clay-scene.ts` with headless Chrome (a temporary
dev page; see the R2 commit) into `site/public/clay/` and `public/clay/` as WebP.

Each phase ends with screenshots and a phone-viewable preview for Eric; nothing ships without him.
Parity checklist: `parity.md`.
