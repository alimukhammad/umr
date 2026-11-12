import { createContext, useContext } from 'react';
import type { Dict } from '../locales/en';
import type { EmojiKey } from './emoji';
import type { Palette } from './grid';
import type { Locale } from './i18n';
import type { State } from './store';

export type Overlay =
  | { kind: 'year'; age: number }
  | { kind: 'week'; index: number }
  | { kind: 'milestone'; index: number }
  | { kind: 'share' }
  | { kind: 'wallpaper' }
  | { kind: 'settings' }
  | { kind: 'support' }
  | { kind: 'unlock'; emoji: EmojiKey; week: number };

export type Ctx = {
  state: State;
  update: (fn: (s: State) => State) => void;
  t: Dict;
  locale: Locale;
  palette: Palette;
  today: string;
  current: number; // this week's life index
  age: number;
  /** Life Emoji unlocked on this phone. */
  unlocked: boolean;
  open: (o: Overlay) => void;
  close: () => void;
  replace: (o: Overlay) => void;
  resetAll: () => void;
};

export const AppCtx = createContext<Ctx | null>(null);

export function useApp() {
  const c = useContext(AppCtx);
  if (!c) throw new Error('AppCtx missing');
  return c;
}

export function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}
