/**
 * Where the survey CTA sends people: the funnel app's fork screen (/start),
 * which asks "어떤 상황에서 AI를 활용하고 싶으신가요?" and routes into the survey.
 * Set PUBLIC_APP_URL at build time per environment (deploy/publish.sh does);
 * the fallback is the review droplet where the funnel runs on port 3100.
 */
export const APP_URL: string = import.meta.env.PUBLIC_APP_URL ?? 'http://165.245.186.254:3100/start';

/**
 * Where the business inquiry form posts (Formspree, Netlify Forms, or our own
 * endpoint). Empty means the form renders but its submit is disabled and a
 * note points people to the KakaoTalk channel.
 */
export const FORM_ENDPOINT: string = import.meta.env.PUBLIC_FORM_ENDPOINT ?? '';

/** Draft subpages render only when PUBLIC_SHOW_DRAFTS=1 at build time; otherwise stubs. */
export const SHOW_DRAFTS: boolean = import.meta.env.PUBLIC_SHOW_DRAFTS === '1';
