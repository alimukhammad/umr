import { useState } from 'react';
import { useApp } from '../lib/app-context';
import { dicts, fill, fmtDate, LOCALES } from '../lib/i18n';
import { exportJSON, hasPersonalEntries, type ThemePref } from '../lib/store';
import { Sheet } from './Sheet';

/** S11 Settings: language, theme, grid length, birth date, data export and deletion. */
export function SettingsSheet({ onChangeBirth }: { onChangeBirth: () => void }) {
  const { state, update, t, locale, open, resetAll } = useApp();
  const [confirm, setConfirm] = useState('');
  const locked = hasPersonalEntries(state);
  const [y, m, d] = state.birth!.split('-').map(Number);

  const download = () => {
    const blob = new Blob([exportJSON(state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'umr-data.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const themes: [ThemePref, string][] = [
    ['auto', t.settings.themeAuto],
    ['light', t.settings.themeLight],
    ['dark', t.settings.themeDark],
  ];

  return (
    <Sheet title={t.settings.title}>
      <section className="set">
        <h3 className="label">{t.settings.language}</h3>
        <div className="chips">
          {LOCALES.map((l) => (
            <button key={l} lang={l} className={'chip' + (l === locale ? ' on' : '')} aria-pressed={l === locale} onClick={() => update((s) => ({ ...s, locale: l }))}>
              {dicts[l].langName}
            </button>
          ))}
        </div>
      </section>

      <section className="set">
        <h3 className="label">{t.settings.theme}</h3>
        <div className="chips">
          {themes.map(([k, label]) => (
            <button key={k} className={'chip' + (k === state.theme ? ' on' : '')} aria-pressed={k === state.theme} onClick={() => update((s) => ({ ...s, theme: k }))}>
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="set">
        <label className="field">
          <span className="label">
            {t.settings.horizon}: <strong>{fill(t.settings.horizonValue, { n: state.horizon })}</strong>
          </span>
          <input type="range" min={75} max={100} step={1} value={state.horizon} onChange={(e) => update((s) => ({ ...s, horizon: Number(e.target.value) }))} />
        </label>
      </section>

      <section className="set">
        <h3 className="label">{t.settings.birth}</h3>
        <div className="set-row">
          <span>{fmtDate(Date.UTC(y, m - 1, d), locale)}</span>
          {!locked && (
            <button className="link" onClick={onChangeBirth}>
              {t.settings.birthChange}
            </button>
          )}
        </div>
        {locked && <p className="quiet small">{t.settings.birthLocked}</p>}
      </section>

      <section className="set">
        <h3 className="label">{t.settings.reminders}</h3>
        <p className="quiet small">{t.settings.remindersSoon}</p>
      </section>

      <section className="set">
        <button className="link" onClick={() => open({ kind: 'support' })}>
          {t.settings.support} →
        </button>
      </section>

      <section className="set">
        <h3 className="label">{t.settings.data}</h3>
        <button className="btn" onClick={download}>
          {t.settings.export}
        </button>
        <div className="danger-zone">
          <h4>{t.settings.deleteTitle}</h4>
          <p className="quiet small">{fill(t.settings.deleteHint, { word: t.settings.deleteWord })}</p>
          <div className="set-row">
            <input value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-label={t.settings.deleteTitle} placeholder={t.settings.deleteWord} autoCapitalize="characters" />
            <button className="btn danger" disabled={confirm.trim().toLocaleUpperCase() !== t.settings.deleteWord.toLocaleUpperCase()} onClick={resetAll}>
              {t.common.delete}
            </button>
          </div>
        </div>
        <p className="quiet small">{t.settings.about}</p>
      </section>
    </Sheet>
  );
}
