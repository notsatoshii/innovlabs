/**
 * Where the survey CTA sends people: the funnel app's fork screen (/start),
 * which asks "어떤 상황에서 AI를 활용하고 싶으신가요?" and routes into the survey.
 * Set PUBLIC_APP_URL at build time per environment (deploy/publish.sh does);
 * the fallback is the review droplet where the funnel runs on port 3100.
 */
export const APP_URL: string = import.meta.env.PUBLIC_APP_URL ?? 'http://165.245.186.254:3100/start';

/**
 * Where the Companies inquiry form posts: the funnel app's /api/inquiry.
 * Set PUBLIC_INQUIRY_URL at build time; the fallback is the review droplet.
 */
/**
 * Returning users sign in here: the funnel app's /login. Derived from APP_URL so
 * one build-time variable covers both (the fork screen is /start).
 */
export const LOGIN_URL: string = APP_URL.replace(//start/?$/, "") + "/login";

export const INQUIRY_URL: string = import.meta.env.PUBLIC_INQUIRY_URL ?? 'http://165.245.186.254:3100/api/inquiry';
