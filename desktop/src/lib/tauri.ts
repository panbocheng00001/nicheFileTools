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
): Promise<ConvertOutput> {
  return await invoke<ConvertOutput>("convert", {
    slug,
    inputPath,
    outputPath,
    options: options ? JSON.stringify(options) : null,
  });
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

/// Live progress for a single batch item.
export interface BatchProgress {
  index: number;
  total: number;
  slug: string;
  inputPath: string;
  status: string; // "start" | "done" | "error"
  size: number;
  error: string | null;
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

/// Recursively collect files matching `exts` under `root` (the "Add folder" batch flow).
export async function collectFiles(root: string, exts: string[]): Promise<string[]> {
  return await invoke<string[]>("collect_files", { root, exts });
}
