import { describe, expect, it } from 'vitest';
import { checkBirthDate, lifeWeek, openWeeks, tashkentTodayISO, toISO, weekRange } from './week';

// The cases from Technical requirements, kept as unit tests.
const cases: [string, string, number, number, number][] = [
  ['1995-03-10', '1995-03-10', 0, 0, 0],
  ['1995-03-10', '2026-11-04', 31, 34, 1646],
  ['1995-03-10', '2027-03-09', 31, 51, 1663],
  ['2000-02-29', '2026-02-28', 25, 51, 1351],
  ['2000-02-29', '2026-03-01', 26, 0, 1352],
  ['2000-02-29', '2028-02-29', 28, 0, 1456],
];

describe('lifeWeek', () => {
  for (const [born, today, age, week, index] of cases) {
    it(`${born} on ${today}`, () => {
      expect(lifeWeek(born, today)).toEqual({ age, week, index });
    });
  }
});

describe('openWeeks', () => {
  it('matches the documented example', () => {
    expect(openWeeks(90, 1646)).toBe(3033);
  });
  it('is null beyond the horizon', () => {
    expect(openWeeks(75, 75 * 52)).toBeNull();
  });
});

describe('weekRange', () => {
  it('final week absorbs the extra days', () => {
    const r = weekRange('1995-03-10', 51);
    expect(toISO(r.start)).toBe('1996-03-01');
    expect(toISO(r.end)).toBe('1996-03-09');
  });
  it('every day maps back to its own week', () => {
    const birth = '2000-02-29';
    for (let i = 0; i < 52 * 3; i++) {
      const { start, end } = weekRange(birth, i);
      expect(lifeWeek(birth, toISO(start)).index).toBe(i);
      expect(lifeWeek(birth, toISO(end)).index).toBe(i);
    }
  });
});

describe('checkBirthDate', () => {
  const today = '2026-11-09';
  it('accepts an adult', () => expect(checkBirthDate(1995, 3, 10, today)).toBe('ok'));
  it('rejects the future', () => expect(checkBirthDate(2027, 1, 1, today)).toBe('future'));
  it('rejects under 18', () => expect(checkBirthDate(2010, 1, 1, today)).toBe('under_18'));
  it('turns 18 on the birthday', () => expect(checkBirthDate(2008, 11, 9, today)).toBe('ok'));
  it('rejects over 110', () => expect(checkBirthDate(1910, 1, 1, today)).toBe('too_old'));
  it('rejects 31 February', () => expect(checkBirthDate(1990, 2, 31, today)).toBe('invalid'));
});

describe('tashkentTodayISO', () => {
  it('is already the next day in Tashkent at 19:00 UTC', () => {
    expect(tashkentTodayISO(new Date('2026-11-09T19:00:00Z'))).toBe('2026-11-10');
  });
  it('is still the same day at 18:59 UTC', () => {
    expect(tashkentTodayISO(new Date('2026-11-09T18:59:00Z'))).toBe('2026-11-09');
  });
});
