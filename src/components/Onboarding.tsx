import { useState } from 'react';
import { dicts, LOCALES, type Locale } from '../lib/i18n';
import { checkBirthDate, localTodayISO } from '../lib/week';
import { Mark } from './Mark';

/** S1 Welcome: the idea in one sentence, choose a language. */
export function Welcome({ locale, onLocale, onBegin }: { locale: Locale; onLocale: (l: Locale) => void; onBegin: () => void }) {
  const t = dicts[locale];
  return (
    <main className="screen center">
      <div className="stack narrow">
        <Mark size={44} />
        <h1 className="display">{t.welcome.title}</h1>
        <p className="lead">{t.welcome.lead}</p>
        <fieldset className="langs">
          <legend className="label">{t.welcome.language}</legend>
          {LOCALES.map((l) => (
            <button key={l} type="button" className={'chip' + (l === locale ? ' on' : '')} aria-pressed={l === locale} lang={l} onClick={() => onLocale(l)}>
              {dicts[l].langName}
            </button>
          ))}
        </fieldset>
        <button className="btn primary" onClick={onBegin}>
          {t.welcome.begin}
        </button>
        <p className="quiet small">{t.welcome.privacy}</p>
      </div>
    </main>
  );
}

/** S2 Birth date: day, month and year as separate fields (easier than a date picker for old years). */
export function BirthDate({
  locale,
  onBack,
  onDone,
  onUnder18,
}: {
  locale: Locale;
  onBack: () => void;
  onDone: (iso: string) => void;
  onUnder18: () => void;
}) {
  const t = dicts[locale];
  const [d, setD] = useState('');
  const [m, setM] = useState('');
  const [y, setY] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const today = localTodayISO();
    const r = checkBirthDate(Number(y), Number(m), Number(d), today);
    if (r === 'under_18') {
      setD('');
      setM('');
      setY('');
      onUnder18();
      return;
    }
    if (r !== 'ok') {
      setErr(t.birth[r]);
      return;
    }
    onDone(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
  };

  return (
    <main className="screen center">
      <form className="stack narrow" onSubmit={submit} noValidate>
        <button type="button" className="link back" onClick={onBack}>
          ← {t.common.back}
        </button>
        <h1 className="display">{t.birth.title}</h1>
        <div className="dob">
          <label>
            <span className="label">{t.birth.day}</span>
            <input inputMode="numeric" pattern="[0-9]*" maxLength={2} autoComplete="bday-day" value={d} onChange={(e) => (setD(e.target.value.replace(/\D/g, '')), setErr(null))} placeholder="10" aria-invalid={!!err} />
          </label>
          <label className="grow">
            <span className="label">{t.birth.month}</span>
            <select value={m} onChange={(e) => (setM(e.target.value), setErr(null))} autoComplete="bday-month" aria-invalid={!!err}>
              <option value="" disabled>
                —
              </option>
              {t.monthsShort.map((_, i) => (
                <option key={i} value={String(i + 1)}>
                  {t.monthsNom[i]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">{t.birth.year}</span>
            <input inputMode="numeric" pattern="[0-9]*" maxLength={4} autoComplete="bday-year" value={y} onChange={(e) => (setY(e.target.value.replace(/\D/g, '')), setErr(null))} placeholder="1995" className="year" aria-invalid={!!err} />
          </label>
        </div>
        <p className="error" role="alert" aria-live="polite">
          {err ?? ' '}
        </p>
        <button className="btn primary" type="submit" disabled={!d || !m || y.length !== 4}>
          {t.birth.submit}
        </button>
        <p className="quiet small">{t.welcome.privacy}</p>
      </form>
    </main>
  );
}

/** S13 Adults only. Nothing is stored. */
export function AdultsOnly({ locale, onClose }: { locale: Locale; onClose: () => void }) {
  const t = dicts[locale];
  return (
    <main className="screen center">
      <div className="stack narrow">
        <Mark size={36} />
        <h1 className="display">{t.adults.title}</h1>
        <p className="lead">{t.adults.body}</p>
        <button className="btn" onClick={onClose}>
          {t.common.close}
        </button>
      </div>
    </main>
  );
}
