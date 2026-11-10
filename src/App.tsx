import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AdultsOnly, BirthDate, Welcome } from './components/Onboarding';
import { Home } from './components/Home';
import { MilestoneForm, WeekSheet } from './components/WeekSheet';
import { SettingsSheet } from './components/SettingsSheet';
import { ShareSheet } from './components/ShareSheet';
import { SupportSheet } from './components/SupportSheet';
import { UnlockSheet } from './components/UnlockSheet';
import { YearView } from './components/YearView';
import { AppCtx, prefersReducedMotion, type Ctx, type Overlay } from './lib/app-context';
import { PALETTES } from './lib/grid';
import { DEFAULT_LOCALE, dicts } from './lib/i18n';
import { clearAll, initialState, load, save, type State } from './lib/store';
import { lifeWeek, tashkentTodayISO } from './lib/week';

type Phase = 'welcome' | 'birth' | 'adults' | 'reveal' | 'home' | 'edit-birth';

function useSystemDark() {
  const [dark, setDark] = useState(() => {
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const on = () => setDark(mq.matches);
      mq.addEventListener('change', on);
      return () => mq.removeEventListener('change', on);
    } catch {
      return undefined;
    }
  }, []);
  return dark;
}

export default function App() {
  const [state, setState] = useState<State>(load);
  const [phase, setPhase] = useState<Phase>(() => {
    const s = load();
    return s.birth ? (s.revealed ? 'home' : 'reveal') : 'welcome';
  });
  const [revealDone, setRevealDone] = useState(false);
  const [stack, setStack] = useState<Overlay[]>([]);
  const [today, setToday] = useState(tashkentTodayISO);
  const historyOk = useRef(true);

  // Uzbek Latin first, whatever the browser's language. Russian and English stay one tap away.
  const locale = state.locale ?? DEFAULT_LOCALE;
  const t = dicts[locale];
  const systemDark = useSystemDark();
  const themeName = state.theme === 'auto' ? (systemDark ? 'dark' : 'light') : state.theme;
  const palette = PALETTES[themeName];

  const update = useCallback((fn: (s: State) => State) => {
    setState((prev) => {
      const next = fn(prev);
      save(next);
      return next;
    });
  }, []);

  // Theme, language and the browser bar colour.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = themeName;
    root.lang = locale;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', palette.bg);
    document.title = locale === 'ru' ? 'Umr — жизнь в неделях' : locale === 'uz-Latn' ? 'Umr — haftalardagi umr' : 'Umr — your life in weeks';
  }, [themeName, locale, palette.bg]);

  // Roll over to a new week while the app stays open.
  useEffect(() => {
    const tick = () => setToday(tashkentTodayISO());
    document.addEventListener('visibilitychange', tick);
    const id = window.setInterval(tick, 60_000);
    return () => {
      document.removeEventListener('visibilitychange', tick);
      window.clearInterval(id);
    };
  }, []);

  // Overlays sit on the browser history, so the phone's back button closes them.
  useEffect(() => {
    const onPop = () => setStack((s) => s.slice(0, -1));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const open = useCallback((o: Overlay) => {
    setStack((s) => [...s, o]);
    try {
      history.pushState({ umr: true }, '');
    } catch {
      historyOk.current = false;
    }
  }, []);
  const close = useCallback(() => {
    if (historyOk.current) {
      try {
        history.back();
        return;
      } catch {
        historyOk.current = false;
      }
    }
    setStack((s) => s.slice(0, -1));
  }, []);
  const replace = useCallback((o: Overlay) => setStack((s) => [...s.slice(0, -1), o]), []);

  const resetAll = useCallback(() => {
    clearAll();
    setState(initialState());
    setStack([]);
    setRevealDone(false);
    setPhase('welcome');
  }, []);

  const lw = state.birth ? lifeWeek(state.birth, today) : { age: 0, week: 0, index: 0 };

  const ctx: Ctx = useMemo(
    () => ({ state, update, t, locale, palette, today, current: lw.index, age: lw.age, unlocked: !!state.lifeEmojiCode, open, close, replace, resetAll }),
    [state, update, t, locale, palette, today, lw.index, lw.age, open, close, replace, resetAll],
  );

  const setLocale = (l: typeof locale) => setState((s) => ({ ...s, locale: l }));

  let screen: React.ReactNode;
  if (phase === 'welcome') {
    screen = <Welcome locale={locale} onLocale={setLocale} onBegin={() => setPhase('birth')} />;
  } else if (phase === 'birth' || phase === 'edit-birth') {
    const editing = phase === 'edit-birth';
    screen = (
      <BirthDate
        locale={locale}
        onBack={() => setPhase(editing ? 'home' : 'welcome')}
        onUnder18={() => {
          if (editing) return resetAll();
          setPhase('adults');
        }}
        onDone={(iso) => {
          // The birth date is stored only once the person is confirmed as an adult.
          update((s) => ({ ...s, locale, birth: iso, revealed: editing ? true : s.revealed }));
          setRevealDone(false);
          setPhase(editing ? 'home' : 'reveal');
        }}
      />
    );
  } else if (phase === 'adults') {
    screen = <AdultsOnly locale={locale} onClose={() => setPhase('welcome')} />;
  } else {
    const revealing = phase === 'reveal';
    screen = (
      <Home
        revealing={revealing}
        revealDone={revealDone || prefersReducedMotion()}
        onRevealDone={() => setRevealDone(true)}
        onContinue={() => {
          update((s) => ({ ...s, revealed: true }));
          setPhase('home');
        }}
      />
    );
  }

  return (
    <AppCtx.Provider value={ctx}>
      {screen}
      {phase === 'home' &&
        stack.map((o, i) => {
          const key = `${i}-${o.kind}`;
          switch (o.kind) {
            case 'year':
              return <YearView key={`${key}-${o.age}`} age={o.age} />;
            case 'week':
              return <WeekSheet key={`${key}-${o.index}`} index={o.index} />;
            case 'milestone':
              return <MilestoneForm key={key} index={o.index} />;
            case 'share':
              return <ShareSheet key={key} />;
            case 'settings':
              return (
                <SettingsSheet
                  key={key}
                  onChangeBirth={() => {
                    setStack([]);
                    setPhase('edit-birth');
                  }}
                />
              );
            case 'support':
              return <SupportSheet key={key} />;
            case 'unlock':
              return <UnlockSheet key={key} emoji={o.emoji} week={o.week} />;
          }
        })}
    </AppCtx.Provider>
  );
}
