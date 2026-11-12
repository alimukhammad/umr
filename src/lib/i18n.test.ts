import { describe, expect, it } from 'vitest';
import { detectLocale } from './i18n';

describe('first language follows the phone', () => {
  it('Uzbek phones get Uzbek Latin', () => expect(detectLocale(['uz-UZ'])).toBe('uz-Latn'));
  it('Uzbek Cyrillic phones get Uzbek Latin for now', () => expect(detectLocale(['uz-Cyrl-UZ'])).toBe('uz-Latn'));
  it('Russian phones get Russian', () => expect(detectLocale(['ru-RU', 'en-US'])).toBe('ru'));
  it('English phones get English', () => expect(detectLocale(['en-GB'])).toBe('en'));
  it('the first known language wins', () => expect(detectLocale(['de-DE', 'ru-RU'])).toBe('ru'));
  it('anything else gets English', () => expect(detectLocale(['tr-TR', 'de-DE'])).toBe('en'));
  it('no language at all gets English', () => expect(detectLocale([])).toBe('en'));
});
