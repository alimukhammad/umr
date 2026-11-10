// Settings read at build time (see .env.example). Empty values hide the matching button.
const env = import.meta.env;

/** Payme or Click payment link for Life Emoji. */
export const PAYMENT_URL = (env.VITE_PAYMENT_URL ?? '').trim();
/** Where buyers email to ask for their code. */
export const ORDER_EMAIL = (env.VITE_ORDER_EMAIL ?? '').trim();
/** Telegram username (without @) where buyers can ask for their code. */
export const ORDER_TELEGRAM = (env.VITE_ORDER_TELEGRAM ?? '').trim().replace(/^@/, '');
/** One-time Life Emoji price in so'm. */
export const EMOJI_PRICE_UZS = Number(env.VITE_EMOJI_PRICE_UZS) > 0 ? Number(env.VITE_EMOJI_PRICE_UZS) : 50_000;

export const isHttpsUrl = (u: string) => /^https:\/\/[^\s]+$/.test(u);
