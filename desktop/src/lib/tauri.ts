import { invoke } from "@tauri-apps/api/core";
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
): Promise<ConvertOutput> {
  return await invoke<ConvertOutput>("convert", { slug, inputPath, outputPath });
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
