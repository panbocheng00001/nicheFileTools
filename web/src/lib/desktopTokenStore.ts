// DEV STUB — replace with a real backend (DB-backed, server-generated tokens).
// 密钥回流 doc §4.1/§4.2 已落地的三条硬规则：
//   1) Token 服务端生成、24h 过期、一次性兑换
//   2) 设备终身仅可领取一次（device_id 哈希记录，不存原始隐私数据）
//   3) 同一 IP 高频请求限流，防批量刷 Token
// 仍为内存实现：重启即清空，仅用于端到端演示；生产须换 DB（表结构建议见文档 §4）。

type Entry = { key: string; expiresAt: number; redeemed: boolean };

interface StoreState {
  tokens: Map<string, Entry>;
  /** device_id(哈希) -> 已领取。终身一次。 */
  claimedDevices: Set<string>;
  /** ip -> 滚动窗口内请求数（限流）。 */
  rateWindow: Map<string, number[]>;
}

// dev 模式下 Next 会为每个 route 生成独立模块实例，内存 Map 必须挂到
// globalThis 单例，否则 desktop-token/desktop-validate/desktop-redeem 三路由互不可见。
const g = globalThis as typeof globalThis & { __nfTokenStore?: StoreState };
const state: StoreState =
  g.__nfTokenStore ??
  (g.__nfTokenStore = {
    tokens: new Map(),
    claimedDevices: new Set(),
    rateWindow: new Map(),
  });
const store = state.tokens;
const claimedDevices = state.claimedDevices;
const rateWindow = state.rateWindow;

/** 每个 IP 每小时最多发放 5 个 token（密钥回流 doc §4.2）。 */
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function rand(n: number): string {
  let s = "";
  for (let i = 0; i < n; i++) {
    s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return s;
}

function hashDevice(deviceId: string): string {
  // 简化哈希仅用于演示；生产环境用 SHA-256，且永不落盘原始 device_id
  let h = 0;
  for (let i = 0; i < deviceId.length; i++) {
    h = (Math.imul(31, h) + deviceId.charCodeAt(i)) | 0;
  }
  return `d${(h >>> 0).toString(36)}`;
}

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (rateWindow.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (hits.length >= RATE_LIMIT) {
    rateWindow.set(ip, hits);
    return true;
  }
  hits.push(now);
  rateWindow.set(ip, hits);
  return false;
}

export type IssueResult =
  | { ok: true; token: string; expiresAt: number }
  | { ok: false; error: "device_already_claimed" | "rate_limited" };

export function issueToken(
  deviceId: string,
  ip = "unknown",
): IssueResult {
  const dh = hashDevice(deviceId);
  // 设备终身一次：已领取过的设备直接拒绝（doc §4.2 防薅羊毛）
  if (claimedDevices.has(dh)) {
    return { ok: false, error: "device_already_claimed" };
  }
  if (rateLimited(ip)) {
    return { ok: false, error: "rate_limited" };
  }
  const token = rand(24);
  const key = `NF-${rand(4)}-${rand(4)}-${rand(4)}`;
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
  store.set(token, { key, expiresAt, redeemed: false });
  return { ok: true, token, expiresAt };
}

export function validateToken(token: string): { valid: boolean; key?: string } {
  const e = store.get(token);
  if (!e) return { valid: false };
  if (Date.now() > e.expiresAt) {
    store.delete(token);
    return { valid: false };
  }
  if (e.redeemed) return { valid: false }; // single-use: consumed tokens are invalid
  return { valid: true, key: e.key };
}

export function redeemToken(
  token: string,
  key: string,
  deviceId?: string,
): boolean {
  const e = store.get(token);
  if (!e) return false;
  if (Date.now() > e.expiresAt) return false; // expired
  if (e.redeemed) return false; // single-use
  if (e.key !== key) return false; // key must match token
  e.redeemed = true;
  store.set(token, e);
  // 核销即锁定设备资格：终身一次（doc §4.2/§4.3）
  if (deviceId) claimedDevices.add(hashDevice(deviceId));
  return true;
}
