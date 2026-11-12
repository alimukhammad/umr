import { useEffect, useState } from 'react';
import { useApp } from '../lib/app-context';
import { computeLayout, drawGrid } from '../lib/grid';
import { emojiByWeek, loadEmojiImages, pinImages } from '../lib/emoji';
import { saveFile } from '../lib/files';
import { Sheet } from './Sheet';

const W = 1080;
const H = 1920;

/** S10 Share: a 1080 × 1920 image made on the device, with no name, birth date or notes. */
export function ShareSheet() {
  const { state, t, palette, current, age, unlocked, replace } = useApp();
  const [url, setUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    const render = (pins: Map<number, CanvasImageSource>) => {
      const rows = Math.max(state.horizon, age + 1);
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = palette.bg;
      ctx.fillRect(0, 0, W, H);

      // Mark: a single woven cell plus the wordmark.
      const mx = 90;
      const my = 110;
      ctx.fillStyle = palette.lived;
      ctx.fillRect(mx, my, 56, 56);
      ctx.fillStyle = palette.now;
      ctx.fillRect(mx + 18, my, 5, 56);
      ctx.fillRect(mx + 36, my, 5, 56);
      ctx.fillStyle = palette.text;
      ctx.font = '600 56px "Noto Serif", Georgia, serif';
      ctx.textBaseline = 'middle';
      ctx.fillText('Umr', mx + 80, my + 30);

      // Grid sized to fit between the header and the line of text, centred.
      const top = 240;
      const avail = H - top - 260;
      const gutter = 56;
      const decades = Math.floor((rows - 1) / 10);
      const pitch = Math.min((W - 180 - gutter) / 52, (avail - decades * 6 - 4) / rows);
      const L = computeLayout(gutter + 2 + pitch * 52, rows, { gutter, maxPitch: pitch, top: 0 });
      ctx.save();
      ctx.translate((W - pitch * 52) / 2 - L.x0, top + (avail - L.height) / 2);
      drawGrid(ctx, L, {
        current,
        milestones: new Set(state.milestones.map((m) => m.week)),
        palette,
        fontFamily: '"Noto Sans", system-ui, sans-serif',
        labelSize: 22,
        pins,
        pinSize: 40, // Design brief: 40 px on the share image
      });
      ctx.restore();

      ctx.fillStyle = palette.text;
      ctx.font = '44px "Noto Serif", Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(t.share.line, W / 2, H - 150);
      ctx.fillStyle = palette.quiet;
      ctx.font = '30px "Noto Sans", system-ui, sans-serif';
      ctx.fillText('umr.grader.uz', W / 2, H - 95);

      c.toBlob((b) => {
        if (!b || cancelled) return;
        objectUrl = URL.createObjectURL(b);
        setBlob(b);
        setUrl(objectUrl);
      }, 'image/png');
    };

    void loadEmojiImages().then((imgs) => {
      if (!cancelled) render(pinImages(emojiByWeek(state.milestones, unlocked), imgs));
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [state.horizon, state.milestones, palette, current, age, t.share.line, unlocked]);

  const file = blob ? new File([blob], 'umr-life-in-weeks.png', { type: 'image/png' }) : null;
  const canShare = !!file && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });

  return (
    <Sheet title={t.share.title}>
      <p className="quiet small">{t.share.note}</p>
      <div className="share-preview">{url ? <img src={url} alt={t.share.line} /> : <div className="share-placeholder" />}</div>
      <button className="link small" onClick={() => replace({ kind: 'wallpaper' })}>
        {t.grid.wallpaperLink} →
      </button>
      <div className="row-btns">
        {blob && (
          <button className="btn" onClick={() => void saveFile('umr-life-in-weeks.png', blob)}>
            {t.share.save}
          </button>
        )}
        {canShare && (
          <button className="btn primary" onClick={() => navigator.share({ files: [file!] }).catch(() => {})}>
            {t.share.share}
          </button>
        )}
      </div>
    </Sheet>
  );
}
