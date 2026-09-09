// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // Production domain (Gabia DNS, Caddy on the droplet). deploy/publish.sh passes
  // --site for the review build so canonical, hreflang, and OG URLs match the host.
  site: 'https://innovlab.me',
  output: 'static',
  trailingSlash: 'always',
  i18n: {
    defaultLocale: 'ko',
    locales: ['ko', 'en'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  integrations: [
    sitemap({
      // Emits sitemap-index.xml + sitemap-0.xml with hreflang alternates per page.
      // Stub pages stay out until v5 gives them content.
      filter: (page) => !/\/students\/$/.test(page) && !/\/founders\/$/.test(page),
      i18n: {
        defaultLocale: 'ko',
        locales: { ko: 'ko-KR', en: 'en-US' },
      },
    }),
  ],
});
