import { describe, expect, it } from 'vitest';
import { emojiByWeek } from './emoji';
import type { Milestone } from './store';

const m = (week: number, emoji: Milestone['emoji'], createdAt: string): Milestone => ({ id: createdAt, week, date: '2020-01-01', title: 't', category: 'other', createdAt, emoji });

describe('emojiByWeek', () => {
  it('shows the newest emoji when two milestones share a week', () => {
    const map = emojiByWeek([m(10, 'ring', '2026-01-01'), m(10, 'home', '2026-02-01')], true);
    expect(map.get(10)).toBe('home');
  });
  it('shows only the free dove when locked', () => {
    const map = emojiByWeek([m(10, 'ring', '2026-01-01'), m(11, 'dove', '2026-01-01')], false);
    expect(map.has(10)).toBe(false);
    expect(map.get(11)).toBe('dove');
  });
  it('falls back to an older allowed emoji when the newest is locked', () => {
    const map = emojiByWeek([m(10, 'dove', '2026-01-01'), m(10, 'ring', '2026-02-01')], false);
    expect(map.get(10)).toBe('dove');
  });
});
