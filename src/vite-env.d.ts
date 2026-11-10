/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_REMINDER_ENDPOINT?: string;
  readonly VITE_PAYMENT_URL?: string;
  readonly VITE_ORDER_EMAIL?: string;
  readonly VITE_ORDER_TELEGRAM?: string;
  readonly VITE_EMOJI_PRICE_UZS?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
