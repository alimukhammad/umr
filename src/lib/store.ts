import type { Locale } from './i18n';

// Guest storage. In the MVP everything lives in this browser only (Webapp flow: "Guest: no server call").
// When accounts arrive, notes and milestone titles move to the server, encrypted (Backend schema).

export type Category = 'family' | 'study' | 'work' | 'travel' | 'loss' | 'other';
export const CATEGORIES: Category[] = ['family', 'study', 'work', 'travel', 'loss', 'other'];

export type Milestone = { id: string; week: number; date: string; title: string; category: Category; createdAt: string };
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
      milestones: s.milestones.map((m) => ({ life_week: m.week, date: m.date, title: m.title, category: m.category, created_at: m.createdAt })),
    },
    null,
    2,
  );
}
