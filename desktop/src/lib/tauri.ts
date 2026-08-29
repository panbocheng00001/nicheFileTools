import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { open, save } from "@tauri-apps/plugin-dialog";
import { open as openUrl } from "@tauri-apps/plugin-shell";

export interface ConvertOutput {
  output_path: string;
  size: number;
}

export interface QuotaInfo {
  free_quota_remaining: number;
  unlocked: boolean;
  paid: boolean;
}

export interface TokenResponse {
  token: string;
  expires_at: string;
}

/// Tool descriptor mirrored from the Rust `tools.json` manifest.
export interface ToolMeta {
  slug: string;
  name: string;
  class: string;
  engines: string[];
  source: string[];
  target: string;
  outputKind: string;
  guide: string | null;
  category: string | null;
}

/// Per-tool engine availability (Rust `EngineStatus`).
export interface EngineInfo {
  engine: string;
  label: string;
  url: string;
}

export interface EngineStatus {
  slug: string;
  available: boolean;
  missing: EngineInfo[];
  guide: string | null;
}

export async function pickInput(ext?: string): Promise<string | null> {
  const filters = ext
    ? [{ name: ext.replace(".", "").toUpperCase(), extensions: [ext.replace(".", "")] }]
    : [];
  const res = await open({ multiple: false, filters });
  return typeof res === "string" ? res : null;
}

export async function pickOutput(defaultPath: string): Promise<string | null> {
  const res = await save({ defaultPath });
  return typeof res === "string" ? res : null;
}

export async function convertFile(
  slug: string,
  inputPath: string,
  outputPath: string,
  options?: object,
  onProgress?: (p: BatchProgress) => void,
): Promise<ConvertOutput> {
  let rid: string | undefined;
  let unlisten: UnlistenFn | undefined;
  // When a progress callback is supplied, correlate the emitted events via a
  // caller-generated `rid` so they don't collide with batch progress.
  if (onProgress) {
    rid = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    unlisten = await listen<BatchProgress>("convert-progress", (e) => {
      if (e.payload.rid === rid) onProgress(e.payload);
    });
  }
  try {
    return await invoke<ConvertOutput>("convert", {
      slug,
      inputPath,
      outputPath,
      options: options ? JSON.stringify(options) : null,
      rid: rid ?? null,
    });
  } finally {
    unlisten?.();
  }
}

/// One item of a batch conversion.
export interface BatchItem {
  slug: string;
  inputPath: string;
  outputPath: string;
  options?: object;
}

/// Result of a single batch item.
export interface BatchResult {
  slug: string;
  inputPath: string;
  outputPath: string;
  ok: boolean;
  size: number;
  error: string | null;
}

/// Live progress for a single batch item (or single-file conversion, when `rid` is set).
export interface BatchProgress {
  index: number;
  total: number;
  slug: string;
  inputPath: string;
  status: string; // "running" | "done" | "error" | "cancelled"
  bytesProcessed: number; // bytes written so far (this phase)
  bytesTotal: number; // total bytes for this phase; 0 = unknown (indeterminate)
  phase: string; // reading | converting | writing | done
  size: number; // final output size (on done)
  error: string | null;
  rid: string | null; // correlation id for single-file calls; null for batch
}

/// Convert many files in one call (P3 批量队列). Returns a per-item summary;
/// live progress is delivered via the `convert-progress` event — subscribe with
/// `onConvertProgress`.
export async function convertBatch(items: BatchItem[]): Promise<BatchResult[]> {
  return await invoke<BatchResult[]>("convert_batch", {
    items: items.map((it) => ({
      slug: it.slug,
      input_path: it.inputPath,
      output_path: it.outputPath,
      options: it.options ? JSON.stringify(it.options) : null,
    })),
  });
}

/// Subscribe to per-item batch progress. Returns an unlisten function.
export async function onConvertProgress(
  cb: (p: BatchProgress) => void,
): Promise<UnlistenFn> {
  return await listen<BatchProgress>("convert-progress", (e) => cb(e.payload));
}

export async function listTools(): Promise<ToolMeta[]> {
  return await invoke<ToolMeta[]>("list_tools");
}

export async function engineStatus(slug: string): Promise<EngineStatus> {
  return await invoke<EngineStatus>("engine_status", { slug });
}

export async function getQuota(): Promise<QuotaInfo> {
  return await invoke<QuotaInfo>("get_quota");
}

export async function requestToken(apiBase?: string): Promise<TokenResponse> {
  return await invoke<TokenResponse>("request_token", { apiBase: apiBase ?? null });
}

export async function redeemKey(
  token: string,
  key: string,
  apiBase?: string,
): Promise<QuotaInfo> {
  return await invoke<QuotaInfo>("redeem_key", { token, key, apiBase: apiBase ?? null });
}

export async function openInBrowser(url: string): Promise<void> {
  await openUrl(url);
}

/// Open a converted file with the OS default application (play .wav, view .png…).
export async function openFile(path: string): Promise<void> {
  await invoke("open_file", { path });
}

/// Reveal a file (or its folder) in the system file manager, selecting it.
export async function revealFile(path: string): Promise<void> {
  await invoke("reveal_file", { path });
}

/// Pick an output folder (directory picker). Returns the chosen path or null.
export async function pickOutputFolder(): Promise<string | null> {
  const res = await open({ directory: true, multiple: false });
  return typeof res === "string" ? res : null;
}

/// Recursively collect files matching `exts` from a set of `roots` (mixed files
/// and directories). Powers "Add folder" and drag-drop of whole directories.
export async function collectFiles(roots: string[], exts: string[]): Promise<string[]> {
  return await invoke<string[]>("collect_files", { roots, exts });
}

/// Pause an in-flight batch between items (the current item finishes first).
export async function pauseBatch(): Promise<void> {
  await invoke("pause_batch");
}

/// Resume a paused batch.
export async function resumeBatch(): Promise<void> {
  await invoke("resume_batch");
}

/// Cancel an in-flight batch before the next item; unstarted items become "cancelled".
export async function cancelBatch(): Promise<void> {
  await invoke("cancel_batch");
}
