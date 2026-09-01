/// Browser preview shims.
///
/// The desktop UI gets its tool list and converts files through Tauri IPC,
/// which only exists inside the native window. When the same bundle is served by
/// a plain `vite` dev server (`npm run dev`), every `invoke()` throws and the app
/// renders an empty shell. These shims take over **only** outside Tauri, so the
/// UI can be previewed and styled in a normal browser.
import { MOCK_TOOLS } from "./mock-tools.generated";
import { siteOrigin } from "./site";
import type {
  BatchItem,
  BatchProgress,
  BatchResult,
  ConvertOutput,
  EngineInfo,
  EngineStatus,
  LicenseInfo,
  ToolMeta,
} from "./tauri";
import type { UnlistenFn } from "@tauri-apps/api/event";

/// True only when running inside a Tauri webview (the window injects the IPC
/// bridge before the frontend loads).
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/// Fake absolute paths — enough to exercise the queue, progress and result UI
/// without a native file dialog.
const SAMPLE_DIR = "C:\\preview-samples";

/// Preview capture hooks (browser preview only — never used inside Tauri).
/// Query params let a headless-browser capture pipeline drive UI states the
/// shims cannot reach on their own:
///   ?engineOk=1   every engine reports as installed, so the converting/result
///                 UI can be exercised without the sidecar binaries
///   ?files=a,b,c  pickFiles() returns those base names (the first filter's
///                 extension is appended when missing) so screenshots show
///                 realistic filenames instead of sample/sample-2
function previewParam(name: string): string | null {
  if (typeof location === "undefined") return null;
  return new URLSearchParams(location.search).get(name);
}

const HOUR_MS = 3_600_000;

/// Errors thrown here mimic the Rust `AppErrorPayload` shape (`{code, message}`)
/// so the UI's error branches behave exactly as they do in the real app.
function ipcError(code: string, message: string): never {
  const e = new Error(message) as Error & { code: string };
  e.code = code;
  throw e;
}

/// slug -> epoch ms at which the unlock lapses.
///
/// Backed by `localStorage` in preview mode so a hot reload doesn't re-lock
/// every tool — styling the unlocked state without that would mean re-pasting a
/// code after every edit. The real store lives in the Tauri app-data dir.
const LS_PREVIEW_LICENSES = "nft_preview_licenses";

const mockLicenses: Map<string, number> = (() => {
  const map = new Map<string, number>();
  try {
    const raw = localStorage.getItem(LS_PREVIEW_LICENSES);
    if (raw) {
      const now = Date.now();
      for (const [slug, expires] of Object.entries(JSON.parse(raw) as Record<string, number>)) {
        if (typeof expires === "number" && expires > now) map.set(slug, expires);
      }
    }
  } catch {
    /* corrupt or unavailable storage — start empty */
  }
  return map;
})();

function persistMockLicenses(): void {
  try {
    localStorage.setItem(
      LS_PREVIEW_LICENSES,
      JSON.stringify(Object.fromEntries(mockLicenses)),
    );
  } catch {
    /* ignore */
  }
}

export function mockLicenseStatus(slug: string): LicenseInfo {
  const expires = mockLicenses.get(slug) ?? 0;
  const now = Date.now();
  if (expires > now) {
    return { slug, unlocked: true, expires_at: expires, remaining_ms: expires - now };
  }
  if (mockLicenses.delete(slug)) persistMockLicenses();
  return { slug, unlocked: false, expires_at: 0, remaining_ms: 0 };
}

export function mockLicenseStatusAll(slugs: string[]): LicenseInfo[] {
  return slugs.map(mockLicenseStatus);
}

/// Any plausible code is accepted in preview mode — the point is exercising the
/// locked → unlocked → expired UI, not validating a real code.
export async function mockActivateTool(slug: string, code: string): Promise<LicenseInfo> {
  const normalized = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (normalized.length < 4) {
    ipcError(
      "invalid_code",
      "That code is not valid for this tool right now. Codes refresh on the hour — copy the latest one from the tool's page.",
    );
  }
  await delay(200);
  const expires = (Math.floor(Date.now() / HOUR_MS) + 1) * HOUR_MS;
  mockLicenses.set(slug, expires);
  persistMockLicenses();
  return mockLicenseStatus(slug);
}

/// Mirror of `Engine::label()` / `Engine::install_url()` in
/// `src-tauri/src/convert/engine.rs`.
const ENGINE_INFO: Record<string, EngineInfo> = {
  "rust-native": { engine: "rust-native", label: "Built-in", url: "" },
  ffmpeg: { engine: "ffmpeg", label: "FFmpeg", url: "https://ffmpeg.org/download.html" },
  blender: { engine: "blender", label: "Blender", url: "https://www.blender.org/download/" },
  occt: { engine: "occt", label: "FreeCAD / OpenCASCADE", url: "https://www.freecad.org/download/" },
  calibre: { engine: "calibre", label: "Calibre", url: "https://calibre-ebook.com/download" },
  "python-fonttools": {
    engine: "python-fonttools",
    label: "Python + fonttools",
    url: "https://www.python.org/downloads/",
  },
};

export function mockListTools(): ToolMeta[] {
  return MOCK_TOOLS;
}

/// A browser cannot probe the host for sidecar binaries, so every non-built-in
/// engine is reported missing — same state the desktop shows before installing.
export function mockEngineStatus(slug: string): EngineStatus {
  // Capture hook: force the "all engines installed" state in the browser.
  if (previewParam("engineOk") === "1") {
    return { slug, available: true, missing: [], guide: null };
  }
  const tool = MOCK_TOOLS.find((t) => t.slug === slug);
  if (!tool) return { slug, available: false, missing: [], guide: null };
  const missing = tool.engines
    .filter((e) => e !== "rust-native")
    .map((e) => ENGINE_INFO[e] ?? { engine: e, label: e, url: "" });
  return { slug, available: missing.length === 0, missing, guide: tool.guide ?? null };
}

export function mockPickInput(ext?: string): string {
  return `${SAMPLE_DIR}\\sample${ext ?? ".bin"}`;
}

export function mockPickOutput(defaultPath: string): string {
  return defaultPath || `${SAMPLE_DIR}\\output.bin`;
}

export function mockPickInputFiles(filters: { extensions: string[] }[]): string[] {
  // Capture hook: named files from ?files=a,b,c (ext appended when missing).
  const named = previewParam("files");
  if (named) {
    const ext = (filters?.[0]?.extensions[0] ?? "bin").toLowerCase();
    return named
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean)
      .map((n) => (n.toLowerCase().endsWith(`.${ext}`) ? n : `${n}.${ext}`));
  }
  const ext = filters?.[0]?.extensions[0];
  const name = ext ? `sample.${ext}` : "sample.bin";
  return [`${SAMPLE_DIR}\\${name}`, `${SAMPLE_DIR}\\${name.replace(/^sample/, "sample-2")}`];
}

export function mockPickDirectory(): string {
  return SAMPLE_DIR;
}

/// Browsers cannot walk directories; hand the dropped/selected roots straight
/// back so the queue still fills.
export function mockCollectFiles(roots: string[]): string[] {
  return roots;
}

const progressListeners = new Set<(p: BatchProgress) => void>();

export function mockOnConvertProgress(cb: (p: BatchProgress) => void): UnlistenFn {
  progressListeners.add(cb);
  return () => {
    progressListeners.delete(cb);
  };
}

function emitProgress(p: BatchProgress): void {
  progressListeners.forEach((cb) => cb(p));
}

const FAKE_TOTAL = 1_048_576;
const FAKE_SIZE = 524_288;

/// Simulated batch run: emits the same progress events as the Rust backend so
/// the queue transitions (queued -> running -> done) can be previewed. Nothing
/// is read from or written to disk.
export async function mockConvertBatch(items: BatchItem[]): Promise<BatchResult[]> {
  // Same gate as the Rust backend: a locked tool must refuse before any work.
  const slug = items[0]?.slug;
  if (slug && !mockLicenseStatus(slug).unlocked) {
    ipcError(
      "license_required",
      `This tool is locked. Copy the current unlock code from its page on ${siteOrigin()} to unlock it for the next hour.`,
    );
  }
  const results: BatchResult[] = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    for (const frac of [0.2, 0.55, 0.85]) {
      await delay(140);
      emitProgress({
        index: i,
        total: items.length,
        slug: it.slug,
        inputPath: it.inputPath,
        status: "running",
        bytesProcessed: Math.round(FAKE_TOTAL * frac),
        bytesTotal: FAKE_TOTAL,
        phase: "converting",
        size: 0,
        error: null,
        rid: null,
      });
    }
    await delay(180);
    emitProgress({
      index: i,
      total: items.length,
      slug: it.slug,
      inputPath: it.inputPath,
      status: "done",
      bytesProcessed: FAKE_TOTAL,
      bytesTotal: FAKE_TOTAL,
      phase: "done",
      size: FAKE_SIZE,
      error: null,
      rid: null,
    });
    results.push({
      slug: it.slug,
      inputPath: it.inputPath,
      outputPath: it.outputPath,
      ok: true,
      size: FAKE_SIZE,
      error: null,
    });
  }
  return results;
}

export async function mockConvertFile(
  slug: string,
  inputPath: string,
  outputPath: string,
  onProgress?: (p: BatchProgress) => void,
): Promise<ConvertOutput> {
  let unlisten: UnlistenFn | undefined;
  if (onProgress) unlisten = mockOnConvertProgress(onProgress);
  try {
    const results = await mockConvertBatch([{ slug, inputPath, outputPath }]);
    const r = results[0];
    return { output_path: r?.outputPath ?? outputPath, size: r?.size ?? FAKE_SIZE };
  } finally {
    unlisten?.();
  }
}

export async function mockOpenInBrowser(url: string): Promise<void> {
  window.open(url, "_blank", "noopener,noreferrer");
}

/// No filesystem access from the browser — warn instead of failing silently.
function notSupported(action: string): void {
  console.warn(`[preview] ${action} requires the desktop app — run \`npm run tauri dev\`.`);
}

export function mockOpenFile(path: string): void {
  notSupported(`Opening ${path}`);
}

export function mockRevealFile(path: string): void {
  notSupported(`Revealing ${path}`);
}
