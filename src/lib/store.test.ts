import { describe, expect, it } from 'vitest';
import { exportJSON, initialState, parseImport } from './store';

describe('export and import', () => {
  it('round-trips notes and milestones', () => {
    const s = {
      ...initialState(),
      birth: '1995-03-10',
      horizon: 85,
      locale: 'ru' as const,
      notes: { '1646': { text: 'Called my mother.', updatedAt: '2026-11-09T10:00:00.000Z' } },
      milestones: [{ id: 'x', week: 1500, date: '2023-12-01', title: 'Wedding', category: 'family' as const, createdAt: '2026-11-09T10:00:00.000Z', emoji: 'ring' as const }],
      lifeEmojiCode: 'UMR1-test',
    };
    const back = parseImport(exportJSON(s))!;
    expect(back.birth).toBe('1995-03-10');
    expect(back.horizon).toBe(85);
    expect(back.locale).toBe('ru');
    expect(back.notes['1646'].text).toBe('Called my mother.');
    expect(back.milestones[0]).toMatchObject({ week: 1500, title: 'Wedding', category: 'family', emoji: 'ring' });
    expect(back.lifeEmojiCode).toBe('UMR1-test');
  });
  it('rejects files that are not Umr exports', () => {
    expect(parseImport('not json')).toBeNull();
    expect(parseImport('{"hello":1}')).toBeNull();
    expect(parseImport('{"birth_date":"1995-03-10","week_notes":[{"life_week":99999,"text":"x"}]}')).toBeNull();
  });
});
