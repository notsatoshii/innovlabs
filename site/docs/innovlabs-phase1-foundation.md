# InnovLabs Website, Phase 1: Foundation

Paste this whole file into Claude Code as the first prompt in a new, empty project folder. Companion files (put them in the folder before running): `innovlabs-visual-motion-spec.md`, `innovlabs-copy-home-en.md`, `innovlabs-sitemap-content-map.md`, and the logo SVGs. This file supersedes `innovlabs-landing-oneshot.md`; ignore that one.

---

You are building the InnovLabs website in phases. This is Phase 1: project setup, the design system, shared components, the i18n scaffold, the nav, the footer, and the home page hero. Nothing more. Stop after the review checklist passes.

Read the three companion markdown files in full before writing any code. The visual spec is authoritative for anything visual; the copy deck is authoritative for every word on the page; the content map is authoritative for structure and JSON key names. If you find a conflict between them, stop and ask.

## 1. Stack

- Astro (latest stable), static output, no UI framework. Components are `.astro` files.
- Vanilla CSS in a single `src/styles/global.css` plus scoped styles in components. No Tailwind, no CSS-in-JS, no preprocessor.
- No animation libraries. No icon libraries. No component libraries.
- Fonts: Pretendard Variable, self-hosted in `public/fonts/`, subset to Korean and Latin, woff2, `font-display: swap`. If the subset tool isn't available in this environment, ship the full variable woff2 and leave a TODO in `README.md` to subset before launch.
- Deploy target: static, Vercel or Netlify. No server functions in this phase.

## 2. i18n

- Korean is the default locale at `/`. English lives at `/en/`.
- Use Astro's built-in i18n routing: `defaultLocale: 'ko'`, `locales: ['ko', 'en']`, `prefixDefaultLocale: false`.
- All copy lives in `src/i18n/en.json` and `src/i18n/ko.json`. Keys follow the copy deck exactly (`home.hero.headline`, `nav.courses`, and so on). Nested objects mirror the dot path.
- `en.json`: populate from the copy deck, every slot, verbatim.
- `ko.json`: identical key structure. Korean copy isn't written yet. Every value is the English value prefixed with `[KO] ` so untranslated strings are visible on the Korean site rather than silently falling back. Do not translate anything yourself.
- A `t()` helper in `src/i18n/utils.ts` that takes the current locale and a dot-path key and returns the string. Missing key: throw at build time, never render an empty string.
- Every page sets `lang="ko"` or `lang="en"` on `<html>`. All Korean typography rules key off `[lang="ko"]`.
- `hreflang` alternates and a canonical on every page.
- The language toggle links to the same path in the other locale, not to the home page.

## 3. Design tokens

In `global.css`, at `:root`:

```
--paper: #FFF9F0;
--ink: #000000;
--lime: #B8FF29;
--pink: #FF4D8D;
--yellow: #FFDE21;
--cyan: #00E0FF;
--white: #FFFFFF;
--grey-fill: #E4E0D8;
--grey-text: #5A5751;

--border: 3px solid var(--ink);
--shadow-lg: 6px 6px 0 var(--ink);
--shadow-sm: 4px 4px 0 var(--ink);
--shadow-pressed: 2px 2px 0 var(--ink);

--text-display: clamp(6rem, 11vw, 10rem);
--text-h2: clamp(3rem, 6vw, 4.5rem);
--text-h3: clamp(1.5rem, 2vw, 1.75rem);
--text-body: clamp(1.0625rem, 1.2vw, 1.1875rem);
--text-label: 0.8125rem;

--space-dense: clamp(4rem, 8vw, 6rem);
--space-sparse: clamp(7rem, 12vw, 10rem);
--gutter: clamp(1rem, 2vw, 1.5rem);
--max-width: 1280px;

--ease: cubic-bezier(0.2, 0, 0, 1);
--dur-press: 120ms;
--dur-peel: 160ms;
```

No color, size, shadow, or duration appears anywhere in the codebase that isn't one of these tokens. `border-radius` is never set. `filter`, `backdrop-filter`, `opacity` below 1 on static elements, and gradients are never used.

Global rules:
- `html, body { overflow-x: clip; }`
- `[lang="ko"]`: display and h2 line-height 1.15, body line-height 1.7, `word-break: keep-all`, `overflow-wrap: break-word`, letter-spacing on display -0.01em.
- `[lang="en"]`: display and h2 line-height 0.98, body 1.55, display letter-spacing -0.02em.
- Focus visible: 3px solid var(--pink) outline, 2px offset, on every focusable element.
- `@media (prefers-reduced-motion: reduce)`: all keyframe animations removed, all transitions set to 0ms.

## 4. Components (`src/components/`)

Build each as a standalone `.astro` component with props. These are the only building blocks; pages compose them.

- `Section.astro`: props `bg` (paper | white | yellow | pink | ink), `density` (dense | sparse | medium), `border` (default true). Renders a full-bleed background with an inner max-width container and the correct vertical padding. Text color flips to paper on ink automatically.
- `Button.astro`: props `href`, `variant` (primary lime | secondary white | ink-on-light), `size` (sm | md). Bordered, hard shadow, press interaction per the motion spec. Renders `<a>` when `href` is present, `<button>` otherwise.
- `Card.astro`: bordered box, white fill by default, props `fill`, `shadow` (true default), `interactive` (adds press). Slot for content.
- `Sticker.astro`: props `rotate` (degrees), `fill`. Bordered rectangle, small shadow, Pretendard 800, one line. Peel on hover. Wrapped in an unrotated container that reserves the bounding box.
- `StickerBoard.astro`: takes an array of stickers, positions them overlapping per the visual spec, places the logo tile front-most.
- `LogoTile.astro`: the asterisk mark from the provided SVG, in a lime bordered tile with shadow. Props `size`.
- `Wordmark.astro`: "INNOVLABS" in Pretendard 800 uppercase with the lime superscript square after the S. Combines with LogoTile in the nav lockup.
- `LangToggle.astro`: two-cell bordered switch, KO / EN, active cell lime, 150ms slide. Links to the equivalent path in the other locale.
- `Nav.astro`: lockup left, four links, small primary Button (the survey CTA), LangToggle. 3px bottom border. Sticky. Mobile: hamburger opens a full-screen ink overlay with links at h2 size; slides down 200ms; close is instant.
- `Footer.astro`: ink background, 3px paper top border, four columns per the blueprint table, footnote line full width at label size, KakaoTalk link (placeholder href `#`), legal line.
- `Footnote.astro`: the asterisk tile at 20px followed by label-size text. Used for source lines.

Stubs only in this phase (create the file, export the props, render a labeled placeholder): `PhotoFrame.astro`, `NumberTile.astro`, `StrikeCard.astro`, `Flowchart.astro`, `Icon.astro`. Phase 2 fills them.

## 5. Pages in this phase

- `src/layouts/Base.astro`: html shell, lang attribute, meta (title, description, og:title, og:description, viewport, canonical, hreflang), favicon as inline SVG data URI built from the asterisk mark (lime tile, black asterisk, pink center pixel), font preload, global.css, Nav, slot, Footer.
- `src/pages/index.astro` (Korean) and `src/pages/en/index.astro`: Base layout, then the hero only, then a visible placeholder `Section` for each of sections 2 through 8 containing just the section name at h3 size, so the page has its full length and the overhang from the hero into section 2 can be seen.
- Placeholder stubs for `/courses`, `/platform`, `/business`, `/about`, `/contact`, `/students` in both locales so nav links don't 404. Each renders Base with an h2 of the page name.

## 6. The hero (build this fully)

Follow blueprint row 1 in the visual spec exactly.

- 7 / 5 grid on desktop, stacked on mobile with the sticker board below the buttons.
- Headline from `home.hero.headline` at `--text-display`. The words "showed you" are wrapped in a `<span>` rendered as a pink-filled bordered inline block rotated -2° with a small shadow. The last word of the headline carries the lime superscript square (a 0.35em bordered square, top-right, offset up 0.4em).
- Sub from `home.hero.sub` at body size, max 48ch.
- Primary Button (`home.hero.cta_primary`) linking to `/app` (placeholder route, will be swapped for the app subdomain later; put the URL in one constant in `src/config.ts` so it changes in one place). Secondary text link (`home.hero.cta_secondary`) to `/business`, underlined 3px.
- StickerBoard with four stickers: LogoTile, "12-week program", "Taught in Seoul", "Ages 12 to CEO" (from `home.hero.stickers`). Rotations -5°, 3°, -2°, 4°; logo at 0°.
- The board's bottom edge extends 48px below the hero section's bottom border into the next section. Section 2's placeholder gets 48px extra top padding.
- Entrance animation per motion spec 5.2.3: headline, sub, buttons, board slide up 16px from opacity 0, 220ms, 80ms stagger; stickers arrive last, 60ms apart, ending at their rotation. Runs once on load. Removed under reduced motion.

## 7. Repo hygiene

- `README.md`: how to run, how to add a page, how to add a copy key (add to both JSON files), the app URL constant, the font subsetting TODO, and a "Phases" section listing Phase 1 as done and 2 through 4 as pending.
- `.gitignore` for node and Astro.
- No commented-out code. No unused components. No placeholder lorem ipsum anywhere; placeholders are labeled with their section or component name.

## 8. Review checklist (run before stopping, fix every failure)

1. `npm run build` succeeds with zero warnings from Astro.
2. Both `/` and `/en/` render. The Korean page shows `[KO]` prefixes on every string; the English page shows none.
3. Every string on screen comes from a JSON file. Grep the components for hardcoded English; there should be none except aria-labels, and those also belong in JSON.
4. Grep the CSS for `border-radius`, `blur`, `gradient`, `opacity:`, `filter:`, `transition: all`. Each returns zero hits except the entrance keyframes and the reduced-motion override.
5. Every color in the CSS is a `var(--…)`. No hex values outside `:root`.
6. Resize to 360px wide: no horizontal scroll, the headline wraps within three lines, the sticker board stacks below the buttons and overlaps by no more than 20%.
7. Resize to 1440px: hero is 7 / 5, sticker board overhangs the section border by 48px, visible.
8. Tab through the page: focus ring visible on the toggle, every nav link, both hero buttons, and the mobile menu button.
9. Toggle the language: lands on the same page in the other locale, `lang` attribute changes, `hreflang` tags present in the head.
10. Enable reduced motion in devtools: hero renders in its final state immediately; press and peel have no transition.
11. Open the mobile menu: full-screen, ink, links at h2 size, closes instantly.
12. Lighthouse on `/en/`: performance 95+, accessibility 100, best practices 100, SEO 100. Report the numbers.

When all twelve pass, list them with results and stop. Do not start Phase 2.
