// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  // TODO: confirm the production domain before launch (used for canonical + hreflang).
  site: 'https://innovlabs.kr',
  output: 'static',
  trailingSlash: 'always',
  i18n: {
    defaultLocale: 'ko',
    locales: ['ko', 'en'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
