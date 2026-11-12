import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import { emailWeekIndex, emailWeekKey, QUESTIONS, questionOfTheWeek } from './wisdom';

// Load the Apps Script's own week functions to prove the app and the email agree.
const gs: Record<string, any> = { console };
vm.createContext(gs);
vm.runInContext(readFileSync(join(__dirname, '../../apps-script/Code.gs'), 'utf8'), gs);

describe('question of the week', () => {
  const times = ['2026-11-15T14:59:00Z', '2026-11-15T15:00:00Z', '2026-11-18T10:00:00Z', '2027-03-07T00:00:00Z', '2026-01-04T15:00:00Z'];
  for (const iso of times) {
    it(`matches the email at ${iso}`, () => {
      const now = new Date(iso);
      expect(emailWeekKey(now)).toBe(gs.currentWeekKey(now));
      expect(emailWeekIndex(emailWeekKey(now))).toBe(gs.weekIndex(gs.currentWeekKey(now)));
      const app = questionOfTheWeek(now).text;
      const mail = gs.QUESTIONS[gs.weekIndex(gs.currentWeekKey(now)) % gs.QUESTIONS.length];
      expect(app.en).toBe(mail.en);
      expect(app.ru).toBe(mail.ru);
    });
  }
  it('has the same questions as the email script', () => {
    expect(gs.QUESTIONS.map((q: any) => q.en)).toEqual(QUESTIONS.map((q) => q.text.en));
  });
});
