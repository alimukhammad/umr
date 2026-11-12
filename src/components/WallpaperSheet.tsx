import { useEffect, useState } from 'react';
import { useApp } from '../lib/app-context';
import { emojiByWeek, loadEmojiImages, pinImages } from '../lib/emoji';
import { saveFile } from '../lib/files';
import { PALETTES } from '../lib/grid';
import { fill, fmtDate } from '../lib/i18n';
import { IS_IOS } from '../lib/platform';
import { drawWallpaper, wallpaperSize, type WallpaperMode } from '../lib/wallpaper';
import { weekRange } from '../lib/week';
import { Sheet } from './Sheet';

/** Save the grid as a phone wallpaper, for the lock screen or the home screen, light or dark. */
export function WallpaperSheet() {
  const { state, t, locale, palette, current, age, unlocked } = useApp();
  const w = t.wallpaper;
  const [mode, setMode] = useState<WallpaperMode>('lock');
  const [theme, setTheme] = useState<'light' | 'dark'>(palette === PALETTES.dark ? 'dark' : 'light');
  const [url, setUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const size = wallpaperSize();
  const line = fill(t.grid.thisWeekValue, { week: (current % 52) + 1, age });

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    setBlob(null); // Save waits for the new version, so nobody saves the previous one
    void loadEmojiImages().then((imgs) => {
      if (cancelled) return;
      const c = document.createElement('canvas');
      c.width = size.width;
      c.height = size.height;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      drawWallpaper(ctx, {
        ...size,
        mode,
        palette: PALETTES[theme],
        rows: Math.max(state.horizon, age + 1),
        current,
        milestones: new Set(state.milestones.map((m) => m.week)),
        pins: pinImages(emojiByWeek(state.milestones, unlocked), imgs),
        line,
      });
      c.toBlob((b) => {
        if (!b || cancelled) return;
        objectUrl = URL.createObjectURL(b);
        setBlob(b);
        setUrl(objectUrl);
      }, 'image/png');
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, theme, state.horizon, state.milestones, current, age, unlocked, line]);

  const next = weekRange(state.birth!, current + 1).start;
  const day = `${w.weekdays[new Date(next).getUTCDay()]}, ${fmtDate(next, locale)}`;

  return (
    <Sheet title={w.title}>
      <p className="quiet small">{w.lead}</p>

      <div className="seg" role="group" aria-label={w.title}>
        <button className={mode === 'lock' ? 'on' : ''} aria-pressed={mode === 'lock'} onClick={() => setMode('lock')}>
          {w.lock}
        </button>
        <button className={mode === 'home' ? 'on' : ''} aria-pressed={mode === 'home'} onClick={() => setMode('home')}>
          {w.home}
        </button>
      </div>
      <div className="seg" role="group" aria-label={t.settings.theme}>
        <button className={theme === 'light' ? 'on' : ''} aria-pressed={theme === 'light'} onClick={() => setTheme('light')}>
          {w.light}
        </button>
        <button className={theme === 'dark' ? 'on' : ''} aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')}>
          {w.dark}
        </button>
      </div>

      <div className={'wall-preview ' + mode + (blob ? '' : ' busy')} aria-busy={!blob}>
        {url ? <img src={url} alt={w.title} style={{ aspectRatio: `${size.width} / ${size.height}` }} /> : <div className="share-placeholder" />}
        {mode === 'lock' && <span className="fake-clock" aria-hidden="true">9:41</span>}
      </div>

      <button className="btn primary" disabled={!blob} onClick={() => blob && void saveFile(`umr-wallpaper-${mode}.png`, blob)}>
        {w.save}
      </button>

      <section className="stack-sm">
        <h3 className="label">{w.howTitle}</h3>
        {IS_IOS ? (
          <p className="small">{w.iphone}</p>
        ) : (
          <>
            <p className="small">{w.android}</p>
            <p className="small quiet">{w.iphone}</p>
          </>
        )}
        <p className="small quiet">{fill(w.next, { day })}</p>
      </section>
    </Sheet>
  );
}
