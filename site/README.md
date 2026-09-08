# InnovLabs website

Static marketing site. Astro, vanilla CSS, Pretendard. Korean at `/`, English at `/en/`.
The web app (survey, profile, curriculum) is a separate project; this site only links to it.

The four documents in `docs/` are authoritative: the copy deck for every word, the content
map for structure and JSON keys, the visual and motion spec for anything visual, and the
Phase 1 brief for what this phase covers.

## Run

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # static output in dist/
npm run preview    # serve dist/ locally
npm run check      # Astro + TypeScript diagnostics
```

Deploy `dist/` as a static site (Vercel or Netlify, framework preset "Astro", root
directory `site`). No server functions.

## Where things live

- `src/config.ts`: `APP_URL`, the one place the survey CTA's destination is set. It is `/app`
  until the web app has its subdomain.
- `astro.config.mjs`: `site` is the production origin used for canonical and hreflang tags.
  It is a placeholder (`https://innovlabs.kr`) until the domain is confirmed.
- `src/styles/global.css`: design tokens, font face, language typography, the press and peel
  interactions, the hero entrance keyframes, reduced motion.
- `src/i18n/`: `en.json`, `ko.json`, and `utils.ts` (`t()`, `tList()`, locale helpers).
- `src/components/`: the building blocks. `home/Hero.astro` is the only finished home section.
- `src/layouts/Base.astro`: html shell, meta, canonical, hreflang, favicon, nav, footer.
- `src/pages/`: one file per route per locale. Korean pages sit at the root, English under `en/`.

## Add a page

1. Create `src/pages/<name>.astro` (Korean) and `src/pages/en/<name>.astro` (English).
2. Both render `Base` with a `title` and `description` taken from the JSON files.
3. Read the locale with `asLocale(Astro.currentLocale)`; build links with
   `getRelativeLocaleUrl(locale, 'path')` from `astro:i18n` so they carry the right prefix.

## Add a copy key

1. Add the key to `src/i18n/en.json` with the English text.
2. Add the same key to `src/i18n/ko.json`. Until the Korean copy exists, the value is the
   English text prefixed with `[KO] ` so untranslated strings stay visible on the Korean site.
3. Read it with `t(locale, 'dot.path.key')`. A missing key fails the build.

Keys that exist here but not in the copy deck, added because the build needed them:

- `meta.site_name`, `meta.home.title`, `meta.home.description`: page title and description tags.
- `a11y.*`: aria labels (home link, menu open/close, language switch, nav landmarks).
- `home.hero.headline_sticker`: the phrase inside the pink sticker ("showed you"). The hero
  finds this phrase inside the headline; if it is absent (as in the `[KO]` placeholder), the
  headline renders without the sticker.
- `home.hero.stickers` holds the three text stickers; the logo tile is a component, not copy.

Strings not from JSON, on purpose: the wordmark text `INNOVLABS`, the `KO` / `EN` cells of
the language toggle, and the numbered section placeholders on the home page (removed in
Phase 2).

## Fonts

Pretendard Variable 1.3.9, self-hosted as two files in `public/fonts/`, one font family:
`PretendardVariable-latin.woff2` (Latin, punctuation, symbols; about 75 KB) and
`PretendardVariable-hangul.woff2` (the 2,350 KS X 1001 Hangul syllables, jamo, CJK
punctuation; about 450 KB). `unicode-range` means English pages download only the Latin
file; Korean pages download both. Any syllable outside the 2,350 falls back to the system
Korean font. The brief asked for one file; it was split because the single 0.49 MB file held
the English home page at Lighthouse performance 92 (LCP 3.3 s), below the 95 target. Two alternatives, both a product decision:

- Full Hangul (11,172 syllables), still one file: about 1.8 MB, which pushed the home page's
  LCP to roughly 10 s on Lighthouse's throttled profile.
- Pretendard's dynamic subset (about 100 small files loaded on demand): the standard Korean
  web approach, but it is many files, which the spec rules out.

To regenerate, subset `node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2`
with any HarfBuzz-based tool (this build used the `subset-font` npm package).

## Tokens added beyond the spec list

All in `:root` in `global.css`, each tied to a number the spec states elsewhere:
`--border-w`, `--border-thin` (2px, for glyph-scale marks), `--border-paper`,
`--space-medium`, `--overhang` (48px), `--nav-h`, `--dur-toggle` (150ms), `--dur-menu`
(200ms), `--dur-enter` (220ms), `--stagger-enter` (80ms), `--stagger-sticker` (60ms).

## Open points for review

- Hero headline size. The display token (96px to 160px) is meant for short lines such as the
  proof numbers; the twelve-word headline in a 7-column cell wrapped to eight lines at 140px.
  The hero uses `clamp(2.75rem, 6.5vw, 5.5rem)` instead, landing at about four lines on
  desktop and five on a 360px phone. The brief's "three lines at 360px" is not reachable with
  this headline at any legible size.
- Superscript square offset. The spec says 0.4em above the last word. With 0.98 line-height
  that overlaps the previous line whenever the last word wraps, so it sits at the cap line.
- Footer contact column has no email address because the copy deck does not contain one.
- KakaoTalk and Privacy links are `#` placeholders per the brief.
- The Korean root page shows `[KO]` prefixes by design until the Korean copy is written.
- Lighthouse (production build, mobile profile): `/en/` 100 / 100 / 100 / 100. `/` scores 90 on
  performance because it preloads the 450 KB Hangul file (LCP 3.6 s). Real Korean copy will
  need that file for its largest text anyway; getting `/` to 95+ later means either a smaller
  Hangul subset or `font-display: optional` on the Hangul face, both spec deviations to decide.

## Phases

1. Foundation (this phase): setup, tokens, components, i18n, nav, footer, hero. Done.
2. Home content: sections 2 to 8. Pending.
3. Motion and polish. Pending.
4. Subpages: courses, platform, business, about, contact. Pending.
5. Audience pages: students, founders. Pending.
