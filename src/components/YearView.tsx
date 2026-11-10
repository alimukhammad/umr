import { useEffect } from 'react';
import { useApp } from '../lib/app-context';
import { fill, fmtDate } from '../lib/i18n';
import { emojiByWeek, emojiUrl } from '../lib/emoji';
import { weekRange } from '../lib/week';

/** S5 Year view: one row enlarged to 52 tappable weeks, 7 rows of 7 plus 3, with dates. */
export function YearView({ age }: { age: number }) {
  const { state, t, locale, current, open, close, replace, unlocked } = useApp();
  const byWeek = emojiByWeek(state.milestones, unlocked);
  const birth = state.birth!;
  const rows = Math.max(state.horizon, Math.floor(current / 52) + 1);
  const first = weekRange(birth, age * 52).start;
  const last = weekRange(birth, age * 52 + 51).end;
  const msWeeks = new Set(state.milestones.map((m) => m.week));
  // Replace, not stack, so Back still returns to the grid.
  const go = (a: number) => replace({ kind: 'year', age: a });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Only the top-most overlay reacts.
      if (e.key === 'Escape' && document.querySelectorAll('.overlay').length === 1) close();
      if (e.key === 'ArrowLeft' && age > 0) go(age - 1);
      if (e.key === 'ArrowRight' && age < rows - 1) go(age + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="overlay">
      <section className="sheet wide" role="dialog" aria-modal="true" aria-labelledby="year-title">
        <header className="sheet-head">
          <button className="icon-btn" onClick={close} aria-label={t.year.back}>
            ←
          </button>
          <div className="year-title">
            <h2 id="year-title">{fill(t.year.title, { age })}</h2>
            <p className="quiet small">
              {fmtDate(first, locale)} – {fmtDate(last, locale)}
            </p>
          </div>
          <span className="spacer" />
        </header>
        <div className="sheet-body">
          <ol className="weeks">
            {Array.from({ length: 52 }, (_, w) => {
              const i = age * 52 + w;
              const { start } = weekRange(birth, i);
              const hasNote = !!state.notes[i]?.text.trim();
              const isMs = msWeeks.has(i);
              const cls = ['wk', i < current ? 'lived' : i === current ? 'now' : 'open', isMs ? 'ms' : ''].join(' ');
              return (
                <li key={w}>
                  <button
                    className={cls}
                    onClick={() => open({ kind: 'week', index: i })}
                    aria-label={`${fill(t.year.week, { n: w + 1 })}, ${fmtDate(start, locale)}${i === current ? ', ' + t.grid.thisWeek : ''}${isMs ? ', ' + t.grid.milestone : ''}${hasNote ? ', ' + t.week.note : ''}`}
                    aria-current={i === current ? 'date' : undefined}
                  >
                    <span className="wn">{w + 1}</span>
                    {byWeek.has(i) ? (
                      <img className="wk-emoji" src={emojiUrl(byWeek.get(i)!)} alt={t.emoji.names[byWeek.get(i)!]} width={24} height={24} />
                    ) : (
                      <span className="wd">{fmtDate(start, locale, true)}</span>
                    )}
                    {isMs && !byWeek.has(i) && <span className="diamond" aria-hidden="true" />}
                    {hasNote && <span className="dot" aria-hidden="true" />}
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="year-nav">
            <button className="btn" disabled={age <= 0} onClick={() => go(age - 1)}>
              ← {t.year.prev}
            </button>
            <button className="btn" disabled={age >= rows - 1} onClick={() => go(age + 1)}>
              {t.year.next} →
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
