import type { Locale } from './i18n';

// "Today's wisdom" for the MVP.
// Questions come from the Design brief voice and need no source.
// Proverbs are well-known Uzbek sayings, shown with a "Draft – needs source review" label
// until a reviewer confirms wording, source and translations (schema: source_citation required).

export type WisdomItem =
  | { kind: 'question'; text: Record<Locale, string> }
  | { kind: 'proverb'; text: Record<Locale, string>; reviewed: false };

const q = (en: string, ru: string, uz: string): WisdomItem => ({ kind: 'question', text: { en, ru, 'uz-Latn': uz } });
const p = (uz: string, ru: string, en: string): WisdomItem => ({ kind: 'proverb', reviewed: false, text: { en, ru, 'uz-Latn': uz } });

export const QUESTIONS: WisdomItem[] = [
  q('Who did you think about this week?', 'О ком вы думали на этой неделе?', 'Bu hafta kim haqida oʻyladingiz?'),
  q('What would you like this week to be remembered for?', 'Чем бы вы хотели запомнить эту неделю?', 'Bu hafta nimasi bilan esda qolishini istardingiz?'),
  q('Whom have you not called in a while?', 'Кому вы давно не звонили?', 'Kimga anchadan beri qoʻngʻiroq qilmadingiz?'),
  q('What are you carrying that you could put down?', 'Что вы несёте с собой, но могли бы отпустить?', 'Qaysi yukni koʻtarib yuribsiz, uni qoʻyib qoʻysa ham boʻladi?'),
  q('What did you learn from someone older than you?', 'Чему вас научил кто-то старше вас?', 'Sizdan kattaroq kishidan nimani oʻrgandingiz?'),
  q('Whom would you like to thank?', 'Кого вам хотелось бы поблагодарить?', 'Kimga rahmat aytmoqchisiz?'),
  q('What small thing made you glad this week?', 'Какая мелочь порадовала вас на этой неделе?', 'Bu hafta qaysi kichik narsa sizni xursand qildi?'),
  q('What would you like to make room for next week?', 'Для чего вы хотели бы найти место на следующей неделе?', 'Keyingi haftada nimaga vaqt ajratmoqchisiz?'),
];

export const PROVERBS: WisdomItem[] = [
  p('Yaxshidan ot qoladi, yomondan — dod.', 'От доброго остаётся имя, от злого — стон.', 'The good leave behind a name; the bad leave behind a cry.'),
  p('Sabr tagi — sariq oltin.', 'На дне терпения — жёлтое золото.', 'At the bottom of patience lies yellow gold.'),
  p('Oz-oz oʻrganib dono boʻlur, qatra-qatra yigʻilib daryo boʻlur.', 'Понемногу учась, становятся мудрыми; по капле собираясь, становится река.', 'Learning little by little, one grows wise; gathering drop by drop, a river forms.'),
  p('Yaxshi soʻz — jon ozigʻi.', 'Доброе слово — пища для души.', 'A kind word is food for the soul.'),
  p('Mehnatning tagi — rohat.', 'В основе труда — отрада.', 'At the root of hard work lies ease.'),
  p('Oʻtgan ishga salovat.', 'Что прошло, то прошло — помяни добром.', 'What is past, bless it and let it be.'),
  p('Bir kun tuz ichgan joyingga qirq kun salom ber.', 'Где хоть день ел хлеб-соль, тому сорок дней кланяйся.', 'Where you shared salt for one day, send greetings for forty.'),
  p('Doʻst achitib gapirar, dushman — kuldirib.', 'Друг скажет горькое, враг — смешное.', 'A friend speaks bitterly, an enemy makes you laugh.'),
];

/** One item per life week, alternating question and proverb. Stable for the whole week. */
export function wisdomForWeek(lifeWeekIndex: number): WisdomItem {
  const i = Math.floor(lifeWeekIndex / 2);
  return lifeWeekIndex % 2 === 0 ? QUESTIONS[i % QUESTIONS.length] : PROVERBS[i % PROVERBS.length];
}

// ---- The week's question, shared with the Sunday email ---------------------------------------
// Same rules as apps-script/Code.gs, so the app and the email always show the same question:
// a new week starts every Sunday at 20:00 Tashkent time (UTC+5, no daylight saving).

const TZ_OFFSET_MS = 5 * 3_600_000;
const SEND_HOUR = 20;

/** The week's key: the date of its Sunday, e.g. '2026-11-08'. */
export function emailWeekKey(now: Date): string {
  const tz = new Date(now.getTime() + TZ_OFFSET_MS);
  let boundary = Date.UTC(tz.getUTCFullYear(), tz.getUTCMonth(), tz.getUTCDate() - tz.getUTCDay(), SEND_HOUR);
  if (boundary > tz.getTime()) boundary -= 7 * 86_400_000;
  return new Date(boundary).toISOString().slice(0, 10);
}

/** Whole weeks since Sunday 4 Jan 2026. */
export function emailWeekIndex(weekKey: string): number {
  const d = Date.parse(weekKey + 'T00:00:00Z');
  return Math.max(0, Math.round((d - Date.UTC(2026, 0, 4)) / (7 * 86_400_000)));
}

export function questionOfTheWeek(now = new Date()): WisdomItem {
  return QUESTIONS[emailWeekIndex(emailWeekKey(now)) % QUESTIONS.length];
}

/** The proverb card beside the grid, changing with the person's own life week. */
export function proverbForWeek(lifeWeekIndex: number): WisdomItem {
  return PROVERBS[lifeWeekIndex % PROVERBS.length];
}
