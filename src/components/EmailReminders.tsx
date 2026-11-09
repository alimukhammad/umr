import { useState } from 'react';
import { useApp } from '../lib/app-context';
import { fill } from '../lib/i18n';
import { isEmail, remindersEnabled, requestReminders } from '../lib/reminders';

/** Weekly reflection by email (replaces S9's Telegram reminder). Sign-up goes to the Apps Script. */
export function EmailReminders() {
  const { state, update, t, locale } = useApp();
  const [email, setEmail] = useState(state.reminder?.email ?? '');
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState(!state.reminder);

  if (!remindersEnabled()) {
    return <p className="quiet small">{t.settings.remindersSoon}</p>;
  }

  if (state.reminder && !editing) {
    return (
      <>
        <p className="small" role="status">
          {fill(t.settings.sent, { email: state.reminder.email })}
        </p>
        <button className="link small" onClick={() => setEditing(true)}>
          {t.settings.another}
        </button>
      </>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmail(email)) return setErr(t.settings.errEmail);
    if (!agree) return setErr(t.settings.errConsent);
    setBusy(true);
    const ok = await requestReminders(email, locale);
    setBusy(false);
    if (!ok) return setErr(t.settings.errNetwork);
    update((s) => ({ ...s, reminder: { email: email.trim(), requestedAt: new Date().toISOString() } }));
    setEditing(false);
  };

  return (
    <form className="stack-sm" onSubmit={submit} noValidate>
      <p className="quiet small">{t.settings.remindersLead}</p>
      <label className="field">
        <span className="label">{t.settings.email}</span>
        <input type="email" inputMode="email" autoComplete="email" value={email} placeholder={t.settings.emailPlaceholder} onChange={(e) => (setEmail(e.target.value), setErr(null))} aria-invalid={err === t.settings.errEmail} />
      </label>
      <label className="check">
        <input type="checkbox" checked={agree} onChange={(e) => (setAgree(e.target.checked), setErr(null))} />
        <span className="small">{t.settings.consent}</span>
      </label>
      <p className="error" role="alert">
        {err ?? ' '}
      </p>
      <button className="btn primary" type="submit" disabled={busy}>
        {busy ? t.settings.sending : t.settings.subscribe}
      </button>
    </form>
  );
}
