import { en, type Dict } from '../locales/en';
import { ru } from '../locales/ru';
import { uzLatn } from '../locales/uz-Latn';

// Locale codes follow Technical requirements: never a bare 'uz', so 'uz-Cyrl' can be added cleanly.
export type Locale = 'uz-Latn' | 'ru' | 'en';
export const LOCALES: Locale[] = ['uz-Latn', 'ru', 'en'];
/** Used when the phone's language is none of the three. */
export const DEFAULT_LOCALE: Locale = 'en';
export const dicts: Record<Locale, Dict> = { 'uz-Latn': uzLatn, ru, en };

/** The phone's language decides the first language (12 Nov 2026). 'uz' is treated as 'uz-Latn'; anything else gets English. */
export function detectLocale(langs: readonly string[] = typeof navigator !== 'undefined' ? navigator.languages ?? [navigator.language] : []): Locale {
  for (const raw of langs) {
    const l = raw.toLowerCase();
    if (l.startsWith('uz')) return 'uz-Latn';
    if (l.startsWith('ru')) return 'ru';
    if (l.startsWith('en')) return 'en';
  }
  return DEFAULT_LOCALE;
}

export function fill(s: string, vars: Record<string, string | number>) {
  return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

const numberLocale: Record<Locale, string> = { 'uz-Latn': 'uz', ru: 'ru', en: 'en' };

export function fmtNum(n: number, locale: Locale) {
  try {
    return new Intl.NumberFormat(numberLocale[locale]).format(n);
  } catch {
    return String(n);
  }
}

/** Dates are formatted by hand so Uzbek Latin month names are always correct. */
export function fmtDate(ms: number, locale: Locale, short = false) {
  const d = new Date(ms);
  const day = d.getUTCDate();
  const m = d.getUTCMonth();
  const y = d.getUTCFullYear();
  const t = dicts[locale];
  const month = short ? t.monthsShort[m] : t.months[m];
  if (locale === 'uz-Latn') return short ? `${day}-${month}` : `${y}-yil ${day}-${month}`;
  if (short) return `${day} ${month}`;
  return `${day} ${month} ${y}`;
}
