import type { Locale } from './i18n';

// Support contacts from Implementation plan, "Support contacts to verify".
// ALL UNVERIFIED. Shown in the MVP with a "for testing only" label, at the founder's request.
// Before launch: call each one, and show only confirmed numbers (PRD safety rule 4).

export type SupportContact = {
  phone: string;
  name: Record<Locale, string>;
  hours: Record<Locale, string> | null;
  source: string;
  verified: false;
};

export const SUPPORT: SupportContact[] = [
  {
    phone: '+998712764966',
    name: {
      en: 'Mental health centre, suicide prevention line',
      ru: 'Центр психического здоровья, линия профилактики суицида',
      'uz-Latn': 'Ruhiy salomatlik markazi, suitsidning oldini olish liniyasi',
    },
    hours: { en: '24/7', ru: 'Круглосуточно', 'uz-Latn': 'Kecha-kunduz' },
    source: 'PROGRESS Guide',
    verified: false,
  },
  {
    phone: '+998711500050',
    name: {
      en: 'Ministry of Health mental health line',
      ru: 'Линия психического здоровья Минздрава',
      'uz-Latn': 'Sogʻliqni saqlash vazirligi ruhiy salomatlik liniyasi',
    },
    hours: { en: 'Mon–Fri, 9:00–17:00', ru: 'Пн–Пт, 9:00–17:00', 'uz-Latn': 'Du–Ju, 9:00–17:00' },
    source: 'PROGRESS Guide',
    verified: false,
  },
  {
    phone: '1197',
    name: {
      en: 'Psychological support, Tashkent',
      ru: 'Психологическая поддержка, Ташкент',
      'uz-Latn': 'Psixologik yordam, Toshkent',
    },
    hours: null,
    source: 'Kun.uz (2020)',
    verified: false,
  },
  {
    phone: '103',
    name: { en: 'Medical emergency', ru: 'Скорая медицинская помощь', 'uz-Latn': 'Tez tibbiy yordam' },
    hours: null,
    source: 'PROGRESS Guide',
    verified: false,
  },
  {
    phone: '102',
    name: { en: 'Police', ru: 'Полиция', 'uz-Latn': 'Politsiya' },
    hours: null,
    source: 'PROGRESS Guide',
    verified: false,
  },
];

export function formatPhone(p: string) {
  if (!p.startsWith('+998')) return p;
  const d = p.slice(4);
  return `+998 ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 7)} ${d.slice(7)}`;
}
