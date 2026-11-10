import { isEmojiKey, type EmojiKey } from './emoji';
import type { Locale } from './i18n';

// Guest storage. In the MVP everything lives in this browser only (Webapp flow: "Guest: no server call").
// When accounts arrive, notes and milestone titles move to the server, encrypted (Backend schema).

export type Category = 'family' | 'study' | 'work' | 'travel' | 'loss' | 'other';
export const CATEGORIES: Category[] = ['family', 'study', 'work', 'travel', 'loss', 'other'];

export type Milestone = { id: string; week: number; date: string; title: string; category: Category; createdAt: string; emoji?: EmojiKey };
export type Note = { text: string; updatedAt: string };
export type ThemePref = 'auto' | 'light' | 'dark';

export type State = {
  v: 1;
  locale: Locale | null;
  theme: ThemePref;
  horizon: number;
  birth: string | null;
  revealed: boolean;
  notes: Record<string, Note>;
  milestones: Milestone[];
  /** Last email this phone asked to receive reminders at. The address itself lives in the Google Sheet. */
  reminder: { email: string; requestedAt: string } | null;
  /** A verified Life Emoji unlock code, kept so a backup file can restore it. */
  lifeEmojiCode: string | null;
};

const KEY = 'umr.v1';

export const initialState = (): State => ({
  v: 1,
  locale: null,
  theme: 'auto',
  horizon: 90,
  birth: null,
  revealed: false,
  notes: {},
  milestones: [],
  reminder: null,
  lifeEmojiCode: null,
});

export function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initialState();
    const s = JSON.parse(raw) as State;
    if (s.v !== 1) return initialState();
    return { ...initialState(), ...s };
  } catch {
    return initialState();
  }
}

export function save(s: State) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Storage can be unavailable (private mode, some in-app browsers). The app still works for this visit.
  }
}

export function clearAll() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}

export function hasPersonalEntries(s: State) {
  return s.milestones.length > 0 || Object.values(s.notes).some((n) => n.text.trim() !== '');
}

export function newId() {
  try {
    return crypto.randomUUID();
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

/** Export shaped like the future GET /me/export, so testers see what they will get later. */
export function exportJSON(s: State) {
  return JSON.stringify(
    {
      exported_at: new Date().toISOString(),
      app: 'Umr (test version)',
      birth_date: s.birth,
      locale: s.locale,
      horizon_years: s.horizon,
      week_notes: Object.entries(s.notes)
        .filter(([, n]) => n.text.trim() !== '')
        .map(([w, n]) => ({ life_week: Number(w), text: n.text, updated_at: n.updatedAt })),
      milestones: s.milestones.map((m) => ({ life_week: m.week, date: m.date, title: m.title, category: m.category, emoji_key: m.emoji ?? null, created_at: m.createdAt })),
      life_emoji_code: s.lifeEmojiCode,
    },
    null,
    2,
  );
}

/** Reads a file made by exportJSON. Returns null if it isn't one. */
export function parseImport(text: string): (Pick<State, 'birth' | 'horizon' | 'notes' | 'milestones'> & { locale: Locale | null; lifeEmojiCode: string | null }) | null {
  let d: Record<string, unknown>;
  try {
    d = JSON.parse(text);
  } catch {
    return null;
  }
  if (!d || typeof d !== 'object') return null;
  const birth = d.birth_date;
  if (typeof birth !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(birth)) return null;
  const horizon = typeof d.horizon_years === 'number' && d.horizon_years >= 75 && d.horizon_years <= 100 ? d.horizon_years : 90;
  const locale = d.locale === 'uz-Latn' || d.locale === 'ru' || d.locale === 'en' ? d.locale : null;
  const notes: Record<string, Note> = {};
  if (Array.isArray(d.week_notes)) {
    for (const n of d.week_notes as Record<string, unknown>[]) {
      const w = Number(n?.life_week);
      if (!Number.isInteger(w) || w < 0 || w > 5719 || typeof n.text !== 'string') return null;
      notes[w] = { text: n.text.slice(0, 1000), updatedAt: typeof n.updated_at === 'string' ? n.updated_at : new Date().toISOString() };
    }
  }
  const milestones: Milestone[] = [];
  if (Array.isArray(d.milestones)) {
    for (const m of d.milestones as Record<string, unknown>[]) {
      const w = Number(m?.life_week);
      const cat = CATEGORIES.includes(m?.category as Category) ? (m.category as Category) : 'other';
      if (!Number.isInteger(w) || w < 0 || w > 5719 || typeof m.title !== 'string' || typeof m.date !== 'string') return null;
      milestones.push({
        id: newId(),
        week: w,
        date: m.date,
        title: m.title.slice(0, 120),
        category: cat,
        createdAt: typeof m.created_at === 'string' ? m.created_at : new Date().toISOString(),
        ...(isEmojiKey(m.emoji_key) ? { emoji: m.emoji_key } : {}),
      });
    }
  }
  const lifeEmojiCode = typeof d.life_emoji_code === 'string' ? d.life_emoji_code.slice(0, 200) : null;
  return { birth, horizon, locale, notes, milestones, lifeEmojiCode };
}
