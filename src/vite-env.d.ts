/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_REMINDER_ENDPOINT?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
