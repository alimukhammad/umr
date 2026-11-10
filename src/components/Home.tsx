import { useMemo } from 'react';
import { prefersReducedMotion, useApp } from '../lib/app-context';
import { fill, fmtNum } from '../lib/i18n';
import { openWeeks } from '../lib/week';
import { emojiByWeek, pinImages, useEmojiImages } from '../lib/emoji';
import { useInstall } from '../lib/platform';
import { remindersEnabled } from '../lib/reminders';
import { wisdomForWeek } from '../lib/wisdom';
import { GridCanvas } from './GridCanvas';
import { Mark } from './Mark';

/** S3 Grid reveal and S4 Grid home share this screen. */
export function Home({ revealing, revealDone, onRevealDone, onContinue }: { revealing: boolean; revealDone: boolean; onRevealDone: () => void; onContinue: () => void }) {
  const { state, t, locale, palette, current, age, open, unlocked } = useApp();
  const imgs = useEmojiImages();
  const { state: installState } = useInstall();
  const pins = useMemo(() => pinImages(emojiByWeek(state.milestones, unlocked), imgs), [state.milestones, unlocked, imgs]);
  const rows = Math.max(state.horizon, age + 1);
  const milestones = useMemo(() => new Set(state.milestones.map((m) => m.week)), [state.milestones]);
  const ow = openWeeks(state.horizon, current);
  const week = (current % 52) + 1;
  const summary =
    ow === null
      ? fill(t.grid.srSummaryBeyond, { lived: fmtNum(current, locale), week, age })
      : fill(t.grid.srSummary, { lived: fmtNum(current, locale), week, age, open: fmtNum(ow, locale), years: state.horizon });
  const wisdom = wisdomForWeek(current);
  const reduced = prefersReducedMotion();

  return (
    <main className="screen home">
      <header className="topbar">
        <Mark size={24} />
        <span className="badge">{t.testBadge}</span>
        {!revealing && (
          <nav className="top-actions">
            <button className="link" onClick={() => open({ kind: 'share' })}>
              {t.grid.share}
            </button>
            <button className="link" onClick={() => open({ kind: 'settings' })}>
              {t.grid.settings}
            </button>
          </nav>
        )}
      </header>

      <div className="home-body">
        <section className="grid-col">
          {revealing && <p className="reveal-caption serif">{t.reveal.caption}</p>}
          <GridCanvas
            rows={rows}
            current={current}
            milestones={milestones}
            palette={palette}
            reveal={revealing && !reduced}
            pulse={!reduced}
            onRevealDone={onRevealDone}
            onRow={revealing ? undefined : (a) => open({ kind: 'year', age: a })}
            label={summary}
            pins={pins}
          />
          {revealing && (
            <div className="reveal-cta">
              {revealDone && (
                <button className="btn primary fade-in" onClick={onContinue}>
                  {t.reveal.continue}
                </button>
              )}
            </div>
          )}
          {!revealing && (
            <div className="legend" aria-hidden="true">
              <span><i className="sw lived" />{t.grid.lived}</span>
              <span><i className="sw now" />{t.grid.thisWeek}</span>
              <span><i className="sw open" />{t.grid.open}</span>
              <span><i className="sw ms" />{t.grid.milestone}</span>
              <span className="avg"><i className="sw line" />75 · {t.grid.avgLine}</span>
            </div>
          )}
        </section>

        {!revealing && (
          <aside className="side">
            <dl className="facts">
              <div>
                <dt>{t.grid.weeksLived}</dt>
                <dd>{fmtNum(current, locale)}</dd>
              </div>
              <div>
                <dt>{t.grid.thisWeek}</dt>
                <dd>
                  <button className="link strong" onClick={() => open({ kind: 'week', index: current })}>
                    {fill(t.grid.thisWeekValue, { week, age })}
                  </button>
                </dd>
              </div>
              {ow !== null && (
                <div>
                  <dt>{t.grid.openWeeks}</dt>
                  <dd>{fmtNum(ow, locale)}</dd>
                </div>
              )}
            </dl>

            <figure className="wisdom">
              <figcaption className="label">{t.grid.wisdomTitle}</figcaption>
              <blockquote className="serif">{wisdom.text[locale]}</blockquote>
              {wisdom.kind === 'proverb' && (
                <p className="quiet small">
                  {t.grid.proverb} · <span className="draft">{t.grid.draft}</span>
                </p>
              )}
              {remindersEnabled() && !state.reminder && (
                <button className="link small" onClick={() => open({ kind: 'settings' })}>
                  {t.grid.emailLink} →
                </button>
              )}
            </figure>

            <p className="quiet small hint">{t.grid.tapHint}</p>
            {(installState === 'prompt' || installState === 'ios-steps') && (
              <button className="link small" onClick={() => open({ kind: 'settings' })}>
                {t.grid.installLink} →
              </button>
            )}
            <button className="link talk" onClick={() => open({ kind: 'support' })}>
              {t.grid.needTalk}
            </button>
          </aside>
        )}
      </div>
    </main>
  );
}
