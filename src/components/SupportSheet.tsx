import { useApp } from '../lib/app-context';
import { formatPhone, SUPPORT } from '../lib/support';
import { Sheet } from './Sheet';

/** S12 Support. All numbers are unverified in the MVP, and labelled so. */
export function SupportSheet() {
  const { t, locale } = useApp();
  return (
    <Sheet title={t.support.title}>
      <p className="lead">{t.support.message}</p>
      <p>
        <strong>{t.support.danger}</strong>
      </p>
      <p className="warn" role="note">
        {t.support.unverified}
      </p>
      <ul className="contacts">
        {SUPPORT.map((c) => (
          <li key={c.phone}>
            <div className="grow">
              <strong>{c.name[locale]}</strong>
              <span className="quiet small">
                {formatPhone(c.phone)} · {c.hours ? c.hours[locale] : t.support.hoursUnknown}
              </span>
            </div>
            <a className="btn small" href={`tel:${c.phone}`}>
              {t.support.call}
            </a>
          </li>
        ))}
      </ul>
      <p className="quiet small">{t.support.abroad}</p>
    </Sheet>
  );
}
