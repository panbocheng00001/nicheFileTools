/// Where the matching web pages live — and therefore where "Get the code"
/// sends the user.
///
/// The desktop app points at different hosts depending on how it was built:
///
/// | How it was started          | `import.meta.env.DEV` | Host                      |
/// |-----------------------------|-----------------------|---------------------------|
/// | `npm run dev` (vite only)   | `true`                | `http://localhost:3000`   |
/// | `npm run tauri dev`         | `true`                | `http://localhost:3000`   |
/// | `npm run tauri build`       | `false`               | `https://nichefiletools.com` |
///
/// `tauri dev` runs `beforeDevCommand: npm run dev` (the vite dev server) and
/// `tauri build` runs `beforeBuildCommand: npm run build` (`vite build`), so
/// Vite's own DEV flag already tracks "am I a local build or a release build"
/// with no extra wiring.
///
/// Set `VITE_SITE_URL` to point somewhere else — a staging box, a LAN address
/// for testing on a phone, or a different port. Copy `.env.example` to
/// `.env.local` first; `.env*` is gitignored.
const PROD_SITE = "https://nichefiletools.com";
const DEV_SITE = "http://localhost:3000";

/// Stray whitespace or trailing slashes from a hand-edited `.env` would produce
/// `//tools/...` links, so every host goes through here. Exported for tests.
export function normalizeSiteUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, "");
}

const override = import.meta.env.VITE_SITE_URL as string | undefined;

export const SITE: string = normalizeSiteUrl(
  override && override.trim() ? override : import.meta.env.DEV ? DEV_SITE : PROD_SITE,
);

/// True when the app is currently pointing at a local/staging host rather than
/// the production domain. Surfaced in the UI so a tester can never wonder which
/// site a code came from.
export const IS_DEV_SITE: boolean = !SITE.startsWith(PROD_SITE);

/// Page that shows the current unlock code for a tool.
export function toolPageUrl(webSlug: string): string {
  return `${SITE}/tools/${webSlug}`;
}

/// Bare origin, for "opens <host>" hints in the UI.
export function siteOrigin(): string {
  return SITE.replace(/^https?:\/\//, "");
}

/// Same value as `HOUR_MS` in `web/src/lib/desktopCode.ts` and
/// `desktop/src-tauri/src/desktop_code.rs`. Codes rotate on the UTC hour.
export const CODE_HOUR_MS = 3_600_000;

/// "42:15" / "1:02:03" — matches `formatRemaining` on the web side.
export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
