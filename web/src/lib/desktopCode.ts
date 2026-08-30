/**
 * Desktop unlock code — public, deterministic, server-free.
 *
 * WHY THIS EXISTS
 * ---------------
 * The desktop app is gated per tool: a code copied from a tool page unlocks
 * that one tool for the rest of the hour, then a new code is needed. The whole
 * project is open source, so there is no secret to hide here — the algorithm is
 * deliberately public (see `docs` note below). It is a rotating convenience
 * gate that sends people back to the site, not a security boundary.
 *
 * THE CONTRACT (must stay byte-identical to the Rust twin)
 * --------------------------------------------------------
 * Rust implementation: `desktop/src-tauri/src/desktop_code.rs`.
 * Both sides are covered by the same hard-coded test vectors; if you change
 * anything here, update the vectors in BOTH places.
 *
 *   HOUR_MS   = 3_600_000
 *   bucket    = floor(nowMs / HOUR_MS)            (UTC epoch hour index)
 *   payload   = "nft1:{slug}:{bucket}"            (ASCII, UTF-8 encoded)
 *   digest    = SHA-256(payload)                  (32 bytes)
 *   value     = big-endian uint40 from digest[0..5]
 *   chars     = 8 x base32(value), MSB first
 *   code      = "XXXX-XXXX"
 *
 * The alphabet drops I, O, 0 and 1 so a hand-copied code cannot be
 * mis-transcribed.
 *
 * VALIDITY
 * --------
 * A code is valid only for the hour bucket it was generated in, i.e. it
 * refreshes on the hour (UTC). There is no grace for the previous bucket: the
 * page shows a live countdown so users know exactly when to re-copy.
 */

export const CODE_VERSION = "nft1";
export const HOUR_MS = 3_600_000;

/** Crockford-style alphabet: no I, O, 0, 1. Exactly 32 characters. */
const BASE32 = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Index of the UTC hour bucket `nowMs` falls in. */
export function bucketIndex(nowMs: number): number {
  return Math.floor(nowMs / HOUR_MS);
}

export function bucketStartMs(bucket: number): number {
  return bucket * HOUR_MS;
}

/** Exclusive: the code dies exactly at this instant. */
export function bucketEndMs(bucket: number): number {
  return (bucket + 1) * HOUR_MS;
}

/** Uppercase and drop separators, so "abcd-efgh" and "ABCDEFGH" match. */
export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function toBase32Chars(digest: Uint8Array): string {
  // digest[0..5] as a big-endian 40-bit unsigned integer. Kept under 2^40 so
  // plain number arithmetic stays exact (Number is exact to 2^53).
  let n =
    digest[0] * 2 ** 32 +
    digest[1] * 2 ** 24 +
    digest[2] * 2 ** 16 +
    digest[3] * 2 ** 8 +
    digest[4];
  const chars: string[] = [];
  for (let i = 0; i < 8; i++) {
    chars.unshift(BASE32[n % 32]);
    n = Math.floor(n / 32);
  }
  return chars.join("");
}

export function formatCode(raw8: string): string {
  return `${raw8.slice(0, 4)}-${raw8.slice(4)}`;
}

async function sha256(payload: string): Promise<Uint8Array> {
  const data = new TextEncoder().encode(payload);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(buf);
}

/** The code for `slug` in hour bucket `bucket`. */
export async function codeForBucket(slug: string, bucket: number): Promise<string> {
  const digest = await sha256(`${CODE_VERSION}:${slug}:${bucket}`);
  return formatCode(toBase32Chars(digest));
}

/** The code that is valid right now. */
export async function currentCode(slug: string, nowMs = Date.now()): Promise<string> {
  return codeForBucket(slug, bucketIndex(nowMs));
}

export interface CurrentCode {
  code: string;
  bucket: number;
  /** Epoch ms at which this code stops working. */
  expiresAt: number;
}

export async function currentCodeInfo(
  slug: string,
  nowMs = Date.now(),
): Promise<CurrentCode> {
  const bucket = bucketIndex(nowMs);
  return {
    code: await codeForBucket(slug, bucket),
    bucket,
    expiresAt: bucketEndMs(bucket),
  };
}

/** "12:34" style mm:ss / hh:mm:ss remaining label. */
export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
