import en from './en.json';
import ko from './ko.json';

export type Locale = 'ko' | 'en';

export const LOCALES: readonly Locale[] = ['ko', 'en'] as const;
export const DEFAULT_LOCALE: Locale = 'ko';

const DICTIONARIES: Record<Locale, unknown> = { en, ko };

function lookup(locale: Locale, key: string): unknown {
  return key.split('.').reduce<unknown>((node, part) => {
    if (node && typeof node === 'object' && part in (node as Record<string, unknown>)) {
      return (node as Record<string, unknown>)[part];
    }
    return undefined;
  }, DICTIONARIES[locale]);
}

/**
 * Returns the string at a dot-path key for the given locale.
 * A missing key throws, which fails the static build instead of rendering
 * an empty string.
 */
export function t(locale: Locale, key: string): string {
  const value = lookup(locale, key);
  if (typeof value !== 'string') {
    throw new Error(`[i18n] Missing string "${key}" for locale "${locale}"`);
  }
  return value;
}

/** Same as t(), for keys whose value is a list of strings. */
export function tList(locale: Locale, key: string): string[] {
  const value = lookup(locale, key);
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throw new Error(`[i18n] Missing string list "${key}" for locale "${locale}"`);
  }
  return value;
}

/** Narrows Astro.currentLocale (string | undefined) to a known locale. */
export function asLocale(value: string | undefined): Locale {
  if (value === 'ko' || value === 'en') return value;
  throw new Error(`[i18n] Unknown locale "${value}"`);
}

export function otherLocale(locale: Locale): Locale {
  return locale === 'ko' ? 'en' : 'ko';
}

/** Removes a leading locale segment so the same path can be rebuilt for another locale. */
export function stripLocale(pathname: string): string {
  for (const locale of LOCALES) {
    if (pathname === `/${locale}` || pathname === `/${locale}/`) return '/';
    if (pathname.startsWith(`/${locale}/`)) return pathname.slice(locale.length + 1);
  }
  return pathname;
}
