# R0 Foundation (site + app)

Goal: every page of both products wears the 시간표 system with no layout or copy change, so later
phases recompose pages inside a finished system.

1. Site tokens (`site/src/styles/global.css`): remap values per `../README.md`; add `--grid`,
   `--marker`, `--coral`, `--sky`, `--lilac`, `--mint`, `--highlight`, `--hatch`, radii, soft
   shadows; grid-paper body; `.press` becomes a 2px lift; skip link and focus ring recoloured.
2. Site type: self-host Black Han Sans and Barlow Condensed (Korean subset for Black Han Sans);
   h1/h2/.display in Black Han Sans.
3. Site components: radius on buttons, cards, stickers, tiles; LogoTile and Wordmark redrawn;
   Nav current-page colour; footer on ink keeps paper borders.
4. App tokens (`src/app/globals.css`): same remap of `--nb-*`, grid ground, soft shadows on
   `.nb-card`/`.nb-btn`, radius; Logo.tsx mark; next/font for the two new faces.
5. Favicons and apple-touch icons regenerated (`site/scripts/make-icons.mjs`).

Done when: lint, both builds, `astro check` pass; contrast table re-run; screenshots of home,
courses, business (site) and /start, /hagwon, /app/education (app) at 390 and 1440 look coherent;
nothing in `parity.md` lost.
