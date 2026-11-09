import type { Locale } from './i18n';

// Weekly email sign-up, handled by the Google Apps Script in apps-script/.
// Set VITE_REMINDER_ENDPOINT to the script's Web app URL (ends in /exec) when building.

export const REMINDER_ENDPOINT: string = (import.meta.env.VITE_REMINDER_ENDPOINT ?? '').trim();
export const CONSENT_VERSION = '2026-11-09'; // keep in step with apps-script/Code.gs

export function remindersEnabled() {
  return /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(REMINDER_ENDPOINT);
}

export function isEmail(v: string) {
  const s = v.trim();
  return s.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
}

/**
 * Apps Script web apps send no CORS headers, so this posts in no-cors mode with a text body
 * (no preflight) and cannot read the reply. Resolves true unless the network itself failed.
 */
export async function requestReminders(email: string, locale: Locale): Promise<boolean> {
  try {
    await fetch(REMINDER_ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ email: email.trim(), locale, consent: true, consentVersion: CONSENT_VERSION }),
    });
    return true;
  } catch {
    return false;
  }
}
