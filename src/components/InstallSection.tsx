import { useApp } from '../lib/app-context';
import { useInstall } from '../lib/platform';

/** Settings: install Umr to the home screen (Android prompt, iPhone steps). */
export function InstallSection() {
  const { t } = useApp();
  const { state, install } = useInstall();
  if (state === 'installed') return <p className="quiet small">✓ {t.settings.installed}</p>;
  return (
    <>
      <p className="quiet small">{t.settings.installLead}</p>
      {state === 'prompt' && (
        <button className="btn primary" onClick={() => void install()}>
          {t.settings.installButton}
        </button>
      )}
      {state === 'ios-steps' && <p className="small">{t.settings.installIos}</p>}
      {state === 'ios-open-safari' && <p className="small">{t.settings.installIosSafari}</p>}
      {state === 'unavailable' && <p className="small">{t.settings.installOther}</p>}
    </>
  );
}
