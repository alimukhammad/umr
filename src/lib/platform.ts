import { useEffect, useState } from 'react';

// Where Umr is running, and installing it to the home screen.

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

const ANDROID_APP_ID = 'uz.umr.app';
const TWA_KEY = 'umr.twa';

/**
 * True inside the Google Play app (a Trusted Web Activity). Its first page load has the app as referrer;
 * we remember that for the session. Inside the Play app, Life Emoji is never offered (Play billing rules).
 */
export const IN_ANDROID_APP: boolean = (() => {
  try {
    if (document.referrer.startsWith(`android-app://${ANDROID_APP_ID}`)) sessionStorage.setItem(TWA_KEY, '1');
    if (new URLSearchParams(location.search).get('source') === 'twa') sessionStorage.setItem(TWA_KEY, '1');
    return sessionStorage.getItem(TWA_KEY) === '1';
  } catch {
    return false;
  }
})();

export function isStandalone() {
  try {
    return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  } catch {
    return false;
  }
}

const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
export const IS_IOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1);
/** Chrome, Firefox and others on iPhone can't add web apps to the home screen; Safari can. */
export const IS_IOS_SAFARI = IS_IOS && !/CriOS|FxiOS|EdgiOS|OPiOS|YaBrowser|Telegram/.test(ua);

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // we show our own, calmer button instead of the browser's banner
    deferred = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    notify();
  });
}

export type InstallState = 'installed' | 'prompt' | 'ios-steps' | 'ios-open-safari' | 'unavailable';

export function useInstall() {
  const [, tick] = useState(0);
  useEffect(() => {
    const l = () => tick((n) => n + 1);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  const state: InstallState = isStandalone() || IN_ANDROID_APP ? 'installed' : deferred ? 'prompt' : IS_IOS ? (IS_IOS_SAFARI ? 'ios-steps' : 'ios-open-safari') : 'unavailable';
  const install = async () => {
    if (!deferred) return;
    const d = deferred;
    deferred = null;
    await d.prompt();
    await d.userChoice.catch(() => undefined);
    notify();
  };
  return { state, install };
}
