/// <reference types="vite/client" />

/// Vite injects `import.meta.env` at build time. `src/lib/site.ts` reads
/// `DEV` (local build vs release build) and `VITE_SITE_URL` (host override).
interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
  readonly VITE_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
