import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useApp } from '../lib/app-context';
import { EMOJI_PRICE_UZS, isHttpsUrl, ORDER_EMAIL, ORDER_TELEGRAM, PAYMENT_URL } from '../lib/config';
import { emojiUrl, loadEmojiImages, type EmojiKey } from '../lib/emoji';
import { computeLayout, drawGrid, rowY } from '../lib/grid';
import { fill, fmtNum } from '../lib/i18n';
import { cleanCode, verifyCode } from '../lib/unlock';
import { Sheet } from './Sheet';

/**
 * Life Emoji offer. Opened only from the milestone form, when someone taps a paid emoji
 * (PRD: never prompt a purchase from a loss, a birthday or the passing of time).
 * Payment is a Payme/Click link; the founder sends a signed code by email or Telegram.
 */
export function UnlockSheet({ emoji, week }: { emoji: EmojiKey; week: number }) {
  const { t, locale, update, close } = useApp();
  const e = t.emoji;
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const price = `${fmtNum(EMOJI_PRICE_UZS, locale)} ${e.currency}`;

  const mailto = ORDER_EMAIL
    ? `mailto:${ORDER_EMAIL}?subject=${encodeURIComponent(e.mailSubject)}&body=${encodeURIComponent(fill(e.mailBody, { price }))}`
    : '';
  const telegram = ORDER_TELEGRAM ? `https://t.me/${encodeURIComponent(ORDER_TELEGRAM)}` : '';

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setBusy(true);
    const ok = await verifyCode(code);
    setBusy(false);
    if (!ok) return setMsg({ ok: false, text: e.bad });
    update((s) => ({ ...s, lifeEmojiCode: cleanCode(code) }));
    setMsg({ ok: true, text: e.done });
  };

  return (
    <Sheet title={e.title}>
      <p>{e.lead}</p>

      <figure className="unlock-preview">
        <EmojiPreview emoji={emoji} week={week} />
        <figcaption className="quiet small">
          <img src={emojiUrl(emoji)} alt="" width={20} height={20} /> {e.names[emoji]} · {e.preview}
        </figcaption>
      </figure>

      {msg?.ok ? (
        <>
          <p className="ok" role="status">
            ✓ {msg.text}
          </p>
          <button className="btn primary" onClick={close}>
            {t.common.close}
          </button>
        </>
      ) : (
        <>
          <p className="price">
            <span className="quiet small">{e.price}</span>
            <strong>{price}</strong>
          </p>

          <section className="unlock-step">
            <h3 className="label">{e.step1}</h3>
            {isHttpsUrl(PAYMENT_URL) ? (
              <a className="btn primary" href={PAYMENT_URL} target="_blank" rel="noopener noreferrer">
                {e.pay}
              </a>
            ) : (
              <p className="quiet small">{e.paySoon}</p>
            )}
          </section>

          {(mailto || telegram) && (
            <section className="unlock-step">
              <h3 className="label">{e.step2}</h3>
              <p className="quiet small">{e.step2Lead}</p>
              <div className="row-btns start">
                {mailto && (
                  <a className="btn" href={mailto}>
                    {e.byEmail}
                  </a>
                )}
                {telegram && (
                  <a className="btn" href={telegram} target="_blank" rel="noopener noreferrer">
                    {e.byTelegram}
                  </a>
                )}
              </div>
              {ORDER_EMAIL && <p className="quiet small">{ORDER_EMAIL}</p>}
            </section>
          )}

          <CodeForm code={code} setCode={setCode} busy={busy} msg={msg} onSubmit={submit} label={e.step3} />
        </>
      )}
    </Sheet>
  );
}

export function CodeForm({
  code,
  setCode,
  busy,
  msg,
  onSubmit,
  label,
}: {
  code: string;
  setCode: (v: string) => void;
  busy: boolean;
  msg: { ok: boolean; text: string } | null;
  onSubmit: (e: React.FormEvent) => void;
  label: string;
}) {
  const { t } = useApp();
  return (
    <form className="unlock-step" onSubmit={onSubmit} noValidate>
      <label className="field">
        <span className="label">{label}</span>
        <textarea rows={3} className="code" value={code} placeholder={t.emoji.codePlaceholder} spellCheck={false} autoCapitalize="off" autoCorrect="off" onChange={(ev) => setCode(ev.target.value)} />
      </label>
      {msg && !msg.ok && (
        <p className="error" role="alert">
          {msg.text}
        </p>
      )}
      <button className="btn" type="submit" disabled={busy || cleanCode(code).length < 10}>
        {busy ? t.emoji.checking : t.emoji.unlock}
      </button>
    </form>
  );
}

/** Ten years of the person's own grid around the chosen week, with the emoji pinned on it. */
function EmojiPreview({ emoji, week }: { emoji: EmojiKey; week: number }) {
  const { state, palette, current } = useApp();
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);
  const [img, setImg] = useState<HTMLImageElement | null>(null);

  useLayoutEffect(() => {
    if (wrap.current) setWidth(Math.min(wrap.current.clientWidth, 520));
  }, []);
  useEffect(() => {
    let alive = true;
    void loadEmojiImages().then((imgs) => alive && setImg(imgs[emoji] ?? null));
    return () => {
      alive = false;
    };
  }, [emoji]);

  useEffect(() => {
    const c = canvas.current;
    if (!c || !width) return;
    const rows = Math.max(state.horizon, Math.floor(current / 52) + 1, Math.floor(week / 52) + 1);
    const L = computeLayout(width, rows);
    const first = Math.max(0, Math.min(Math.floor(week / 52) - 4, rows - 10));
    const top = rowY(L, first) - 6;
    const height = rowY(L, Math.min(first + 10, rows)) - top + 2;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    c.width = Math.round(width * dpr);
    c.height = Math.round(height * dpr);
    c.style.width = `${width}px`;
    c.style.height = `${height}px`;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, -top * dpr);
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, top, width, height);
    const pins = new Map<number, CanvasImageSource>(img ? [[week, img]] : []);
    drawGrid(ctx, L, {
      current,
      milestones: new Set(state.milestones.map((m) => m.week)),
      palette,
      pins,
      fontFamily: '"Noto Sans", system-ui, sans-serif',
    });
  }, [width, img, week, state.horizon, state.milestones, palette, current]);

  return (
    <div ref={wrap} className="preview-wrap">
      <canvas ref={canvas} role="img" aria-label={`${emoji}`} />
    </div>
  );
}
