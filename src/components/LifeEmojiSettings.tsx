import { useState } from 'react';
import { useApp } from '../lib/app-context';
import { cleanCode, verifyCode } from '../lib/unlock';
import { CodeForm } from './UnlockSheet';

/** Settings: shows the unlock, or takes a code. No price or buy button here (offers appear only in the milestone form). */
export function LifeEmojiSettings() {
  const { t, unlocked, update } = useApp();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (unlocked) {
    return (
      <>
        <p className="small">✓ {t.emoji.settingsUnlocked}</p>
        <p className="quiet small">{t.emoji.credit}</p>
      </>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const ok = await verifyCode(code);
    setBusy(false);
    if (!ok) return setMsg({ ok: false, text: t.emoji.bad });
    update((s) => ({ ...s, lifeEmojiCode: cleanCode(code) }));
  };

  return (
    <>
      <CodeForm code={code} setCode={setCode} busy={busy} msg={msg} onSubmit={submit} label={t.emoji.settingsHave} />
      <p className="quiet small">{t.emoji.credit}</p>
    </>
  );
}
