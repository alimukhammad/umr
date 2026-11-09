// The one week function used everywhere (Technical requirements, "Week calculation").
// Each year of life has exactly 52 weeks, counted from the birthday.
// The last week (51) absorbs the extra 1 or 2 days.

export const DAY = 86_400_000;
export const WEEKS_PER_YEAR = 52;
export const MAX_LIFE_WEEK = 5719; // 110 years, matches the database check

const utc = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d);
export const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

// A 29 February birthday falls on 1 March in non-leap years.
export function birthdayIn(year: number, m: number, d: number) {
  if (m === 2 && d === 29 && !isLeap(year)) return utc(year, 3, 1);
  return utc(year, m, d);
}

const parse = (iso: string) => iso.split('-').map(Number) as [number, number, number];

// Dates are 'YYYY-MM-DD'. todayISO is the date in the user's timezone.
export function lifeWeek(birthISO: string, todayISO: string) {
  const [by, bm, bd] = parse(birthISO);
  const [ty, tm, td] = parse(todayISO);
  const today = utc(ty, tm, td);
  const year = birthdayIn(ty, bm, bd) <= today ? ty : ty - 1;
  const age = year - by;
  const week = Math.min(Math.floor((today - birthdayIn(year, bm, bd)) / DAY / 7), 51);
  return { age, week, index: age * 52 + week };
}

/** First and last day (UTC ms) of a given life week. */
export function weekRange(birthISO: string, index: number) {
  const [by, bm, bd] = parse(birthISO);
  const age = Math.floor(index / 52);
  const week = index % 52;
  const yearStart = birthdayIn(by + age, bm, bd);
  const start = yearStart + week * 7 * DAY;
  const end = week === 51 ? birthdayIn(by + age + 1, bm, bd) - DAY : start + 6 * DAY;
  return { start, end };
}

export function toISO(ms: number) {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Today's date in Tashkent, as 'YYYY-MM-DD'. Umr launches for people in Uzbekistan,
 * so weeks roll over at midnight Tashkent time whatever the phone's own time zone.
 * Uzbekistan is UTC+5 all year (no daylight saving), so a fixed offset is exact.
 */
export const TASHKENT_OFFSET_MS = 5 * 3_600_000;
export function tashkentTodayISO(now = new Date()) {
  return new Date(now.getTime() + TASHKENT_OFFSET_MS).toISOString().slice(0, 10);
}

/** Open weeks = horizon × 52 − index − 1. Null once someone outlives the horizon. */
export function openWeeks(horizonYears: number, index: number) {
  const n = horizonYears * 52 - index - 1;
  return n >= 0 ? n : null;
}

export function isValidDate(y: number, m: number, d: number) {
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return false;
  if (m < 1 || m > 12 || d < 1) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export type BirthCheck = 'ok' | 'invalid' | 'future' | 'too_old' | 'under_18';

/** Validation from the Webapp flow edge cases. */
export function checkBirthDate(y: number, m: number, d: number, todayISO: string): BirthCheck {
  if (!isValidDate(y, m, d)) return 'invalid';
  const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  if (iso > todayISO) return 'future';
  const { age } = lifeWeek(iso, todayISO);
  if (age > 110 || y < 1900) return 'too_old';
  if (age < 18) return 'under_18';
  return 'ok';
}
