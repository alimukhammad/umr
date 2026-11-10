import { useEffect, useState } from 'react';
import type { Milestone } from './store';

// Life Emoji: 8 curated Noto Emoji (Apache 2.0), bundled as images so the canvas grid and the
// share image look the same on every phone. The dove is always free (PRD: marking a loss stays free).

export const EMOJI_KEYS = ['ring', 'baby', 'graduation', 'home', 'job', 'journey', 'star', 'dove'] as const;
export type EmojiKey = (typeof EMOJI_KEYS)[number];
export const FREE_EMOJI: ReadonlySet<EmojiKey> = new Set<EmojiKey>(['dove']);

export const EMOJI_CHAR: Record<EmojiKey, string> = {
  ring: '💍',
  baby: '👶',
  graduation: '🎓',
  home: '🏠',
  job: '💼',
  journey: '✈️',
  star: '⭐',
  dove: '🕊️',
};

export const isEmojiKey = (v: unknown): v is EmojiKey => typeof v === 'string' && (EMOJI_KEYS as readonly string[]).includes(v);

export const emojiUrl = (k: EmojiKey) => `${import.meta.env.BASE_URL}emoji/${k}.svg`;

export const emojiAllowed = (k: EmojiKey, unlocked: boolean) => unlocked || FREE_EMOJI.has(k);

let cache: Partial<Record<EmojiKey, HTMLImageElement>> | null = null;
let pending: Promise<Partial<Record<EmojiKey, HTMLImageElement>>> | null = null;

/** Loads all 8 images once. Failed ones are simply left out. */
export function loadEmojiImages() {
  if (cache) return Promise.resolve(cache);
  if (!pending) {
    pending = Promise.all(
      EMOJI_KEYS.map(
        (k) =>
          new Promise<[EmojiKey, HTMLImageElement | null]>((resolve) => {
            const img = new Image();
            img.decoding = 'async';
            img.onload = () => resolve([k, img]);
            img.onerror = () => resolve([k, null]);
            img.src = emojiUrl(k);
          }),
      ),
    ).then((pairs) => {
      cache = {};
      for (const [k, img] of pairs) if (img) cache[k] = img;
      return cache;
    });
  }
  return pending;
}

export function useEmojiImages() {
  const [imgs, setImgs] = useState(cache);
  useEffect(() => {
    let alive = true;
    if (!cache) void loadEmojiImages().then((c) => alive && setImgs(c));
    return () => {
      alive = false;
    };
  }, []);
  return imgs;
}

/**
 * Which emoji shows on each week: the newest milestone with an emoji the person may use.
 * (Design brief: two milestones in one week show the newest; the year view lists both.)
 */
export function emojiByWeek(milestones: Milestone[], unlocked: boolean): Map<number, EmojiKey> {
  const out = new Map<number, { key: EmojiKey; at: string }>();
  for (const m of milestones) {
    if (!m.emoji || !emojiAllowed(m.emoji, unlocked)) continue;
    const cur = out.get(m.week);
    if (!cur || m.createdAt > cur.at) out.set(m.week, { key: m.emoji, at: m.createdAt });
  }
  return new Map([...out].map(([w, v]) => [w, v.key]));
}

/** Week → image, for the canvas. */
export function pinImages(byWeek: Map<number, EmojiKey>, imgs: Partial<Record<EmojiKey, HTMLImageElement>> | null) {
  const out = new Map<number, HTMLImageElement>();
  if (!imgs) return out;
  for (const [w, k] of byWeek) {
    const img = imgs[k];
    if (img) out.set(w, img);
  }
  return out;
}
