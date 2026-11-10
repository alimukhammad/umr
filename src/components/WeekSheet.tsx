import { useEffect, useRef, useState } from 'react';
import { EMOJI_KEYS, emojiAllowed, emojiUrl, FREE_EMOJI, type EmojiKey } from '../lib/emoji';
import { IN_ANDROID_APP } from '../lib/platform';
import { useApp } from '../lib/app-context';
import { fill, fmtDate } from '../lib/i18n';
import { CATEGORIES, newId, type Category } from '../lib/store';
import { lifeWeek, MAX_LIFE_WEEK, toISO, weekRange } from '../lib/week';
import { Sheet } from './Sheet';

const NOTE_MAX = 1000;

/** S6 Week sheet: dates, one private note, milestones. */
export function WeekSheet({ index }: { index: number }) {
  const { state, update, t, locale, open, unlocked } = useApp();
  const birth = state.birth!;
  const age = Math.floor(index / 52);
  const n = (index % 52) + 1;
  const { start, end } = weekRange(birth, index);
  const [text, setText] = useState(state.notes[index]?.text ?? '');
  const [saved, setSaved] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const list = state.milestones.filter((m) => m.week === index).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const persist = (value: string) => {
    update((s) => {
      const notes = { ...s.notes };
      if (value.trim() === '') delete notes[index];
      else notes[index] = { text: value, updatedAt: new Date().toISOString() };
      return { ...s, notes };
    });
    setSaved(true);
  };

  // Autosave as the person writes, so nothing is lost if the tab closes.
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const onChange = (v: string) => {
    const value = v.slice(0, NOTE_MAX);
    setText(value);
    setSaved(false);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => persist(value), 400);
  };

  return (
    <Sheet title={fill(t.week.title, { n, age })}>
      <p className="quiet">
        {fmtDate(start, locale)} – {fmtDate(end, locale)}
      </p>

      <label className="field">
        <span className="label">{t.week.note}</span>
        <textarea rows={6} value={text} maxLength={NOTE_MAX} placeholder={t.week.placeholder} onChange={(e) => onChange(e.target.value)} onBlur={() => persist(text)} />
        <span className="field-foot quiet small">
          <span aria-live="polite">{saved ? '✓ ' + t.week.saved : ' '}</span>
          <span>
            {text.length} / {NOTE_MAX}
          </span>
        </span>
      </label>

      <h3 className="label">{t.week.milestones}</h3>
      {list.length === 0 ? (
        <p className="quiet small">{t.week.none}</p>
      ) : (
        <ul className="ms-list">
          {list.map((m) => (
            <li key={m.id}>
              {m.emoji && emojiAllowed(m.emoji, unlocked) ? (
                <img src={emojiUrl(m.emoji)} alt={t.emoji.names[m.emoji]} width={22} height={22} />
              ) : (
                <span className="diamond" aria-hidden="true" />
              )}
              <span className="grow">
                <strong>{m.title}</strong>
                <span className="quiet small"> · {t.milestone.categories[m.category]}</span>
              </span>
              <button className="link danger small" onClick={() => update((s) => ({ ...s, milestones: s.milestones.filter((x) => x.id !== m.id) }))}>
                {t.common.delete}
              </button>
            </li>
          ))}
        </ul>
      )}
      <button className="btn" onClick={() => open({ kind: 'milestone', index })}>
        + {t.week.add}
      </button>
    </Sheet>
  );
}

/** S7 Milestone form: title, kind and date. The date decides the week. */
export function MilestoneForm({ index }: { index: number }) {
  const { state, update, t, close, open, unlocked } = useApp();
  const birth = state.birth!;
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState<EmojiKey | null>(null);
  const [wanted, setWanted] = useState<EmojiKey | null>(null);
  // After an unlock, the emoji the person tapped is chosen for them.
  useEffect(() => {
    if (unlocked && wanted) {
      setEmoji(wanted);
      setWanted(null);
    }
  }, [unlocked, wanted]);
  const [category, setCategory] = useState<Category>('family');
  const [date, setDate] = useState(toISO(weekRange(birth, index).start));
  const [err, setErr] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setErr(t.milestone.errTitle);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < birth) return setErr(t.milestone.errDate);
    const week = lifeWeek(birth, date).index;
    if (week < 0 || week > MAX_LIFE_WEEK) return setErr(t.milestone.errDate);
    update((s) => ({
      ...s,
      milestones: [
        ...s.milestones,
        {
          id: newId(),
          week,
          date,
          title: title.trim().slice(0, 120),
          category,
          createdAt: new Date().toISOString(),
          ...(emoji && emojiAllowed(emoji, unlocked) ? { emoji } : {}),
        },
      ],
    }));
    close();
  };

  return (
    <Sheet title={t.milestone.title}>
      <form className="stack" onSubmit={submit} noValidate>
        <label className="field">
          <span className="label">{t.milestone.name}</span>
          <input value={title} maxLength={120} placeholder={t.milestone.namePlaceholder} onChange={(e) => (setTitle(e.target.value), setErr(null))} />
        </label>
        <fieldset className="field">
          <legend className="label">{t.emoji.label}</legend>
          <div className="emoji-row">
            {/* Inside the Google Play app, locked emoji aren't shown at all: no offer, no outside payment (Play rules). */}
            {EMOJI_KEYS.filter((k) => !IN_ANDROID_APP || emojiAllowed(k, unlocked)).map((k) => {
              const ok = emojiAllowed(k, unlocked);
              const on = emoji === k;
              return (
                <button
                  type="button"
                  key={k}
                  className={'emoji-btn' + (on ? ' on' : '') + (ok ? '' : ' locked')}
                  aria-pressed={on}
                  aria-label={`${t.emoji.names[k]}${FREE_EMOJI.has(k) ? ', ' + t.emoji.free : ok ? '' : ', ' + t.emoji.locked}`}
                  title={t.emoji.names[k]}
                  onClick={() => {
                    if (ok) return setEmoji(on ? null : k);
                    // A paid emoji opens the offer. Closing it leaves a plain milestone, with no follow-up.
                    const w = /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= birth ? lifeWeek(birth, date).index : index;
                    setWanted(k);
                    open({ kind: 'unlock', emoji: k, week: w });
                  }}
                >
                  <img src={emojiUrl(k)} alt="" width={28} height={28} />
                  {!ok && <span className="lock" aria-hidden="true">🔒</span>}
                </button>
              );
            })}
          </div>
        </fieldset>
        <fieldset className="field">
          <legend className="label">{t.milestone.category}</legend>
          <div className="chips">
            {CATEGORIES.map((c) => (
              <button type="button" key={c} className={'chip' + (c === category ? ' on' : '')} aria-pressed={c === category} onClick={() => setCategory(c)}>
                {t.milestone.categories[c]}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="field">
          <span className="label">{t.milestone.date}</span>
          <input type="date" value={date} min={birth} onChange={(e) => (setDate(e.target.value), setErr(null))} />
        </label>
        <p className="error" role="alert">
          {err ?? ' '}
        </p>
        <div className="row-btns">
          <button type="button" className="btn" onClick={close}>
            {t.common.cancel}
          </button>
          <button type="submit" className="btn primary">
            {t.common.save}
          </button>
        </div>
      </form>
    </Sheet>
  );
}
