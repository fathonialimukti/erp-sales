import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export type Locale = 'en' | 'id';

/**
 * Locale catalogs are read from disk (not imported) so the specs stay plain
 * Node — Playwright's transform has no `@/` alias resolution.
 *
 * Every assertion goes through `msg()`, which THROWS on a missing key. That is
 * deliberate: the Bahasa spec is the regression test for untranslated keys, and
 * a silently-undefined lookup would let that test pass against a UI that fell
 * back to English.
 */
const catalogPath = (locale: Locale) =>
  fileURLToPath(new URL(`../../../locales/${locale}.json`, import.meta.url));

const CATALOGS: Record<Locale, Record<string, string>> = {
  en: JSON.parse(readFileSync(catalogPath('en'), 'utf8')),
  id: JSON.parse(readFileSync(catalogPath('id'), 'utf8')),
};

/** English copy for `key`. Throws when the key is absent. */
export const msg = (key: string, locale: Locale = 'en'): string => {
  const value = CATALOGS[locale][key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Missing i18n key "${key}" in ${locale}.json`);
  }
  return value;
};

/**
 * `msg` with ICU placeholders filled — mirrors what react-intl renders, so a
 * spec can match real text without hardcoding wording that may change.
 */
export const msgWith = (key: string, values: Record<string, string>, locale: Locale = 'en') =>
  msg(key, locale).replace(/\{(\w+)\}/g, (_, name: string) => values[name] ?? `{${name}}`);

/**
 * True when a locale actually translates `key`. Used to prove a Bahasa string
 * is a real translation rather than an English passthrough — the assertion is
 * about *differing from English*, not about one specific word, so rewording a
 * translation never breaks the suite.
 */
export const isTranslated = (key: string): boolean => msg(key, 'id') !== msg(key, 'en');
