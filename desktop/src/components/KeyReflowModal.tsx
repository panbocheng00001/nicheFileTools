import { useState } from "react";
import {
  requestToken,
  redeemKey,
  openInBrowser,
  type TokenResponse,
} from "../lib/tauri";

// 密钥回流开发文档 §3.2：弹窗文案以战略文档 §4.4 原文为准。
const BASE = "https://nichefiletools.com/free-trial";

export function KeyReflowModal({
  onClose,
  onUnlocked,
}: {
  onClose: () => void;
  onUnlocked: () => void;
}) {
  const [token, setToken] = useState("");
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function ensureToken(): Promise<string> {
    if (token) return token;
    setBusy(true);
    try {
      const tr: TokenResponse = await requestToken();
      setToken(tr.token);
      return tr.token;
    } catch (e: any) {
      const reason = String(e?.message ?? "");
      if (/device_already_claimed|already claimed|403/i.test(reason)) {
        setMsg(
          "This device has already claimed the free offer. A license key is required for more conversions.",
        );
      } else if (/rate_limited|429/i.test(reason)) {
        setMsg(
          "Too many key requests from your network. Please wait an hour and try again.",
        );
      } else {
        setMsg(
          "Could not reach the key server. Please check your internet connection and try again.",
        );
      }
      throw new Error("token request failed");
    } finally {
      setBusy(false);
    }
  }

  async function openDirect() {
    try {
      const t = await ensureToken();
      await openInBrowser(
        `${BASE}?token=${encodeURIComponent(t)}&utm_source=desktop_app_direct`,
      );
    } catch {
      /* msg set in ensureToken */
    }
  }

  async function copyLink() {
    try {
      const t = await ensureToken();
      const url = `${BASE}?token=${encodeURIComponent(t)}&utm_source=desktop_app_copy_link`;
      await navigator.clipboard.writeText(url);
      setMsg("Link copied — open it later or on another device to get your free key.");
    } catch {
      /* msg set in ensureToken */
    }
  }

  async function activate() {
    if (!token || !key) {
      setMsg("Get a token first, then paste the key from the website.");
      return;
    }
    setBusy(true);
    try {
      const q = await redeemKey(token, key);
      setMsg(`Unlocked! ${q.free_quota_remaining} free conversions remaining.`);
      onUnlocked();
    } catch (e: any) {
      setMsg(e?.message ?? "Key rejected.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {/* 标题与正文 — 战略文档 §4.4 */}
        <h2>Get Your Free Unlock Key (2 Conversion Attempts)</h2>
        <p className="muted">
          You can unlock 2 free conversion attempts for desktop-only features.
          After 2 uses, you will need to purchase a license for unlimited
          conversions.
        </p>

        <p className="option-title">Option 1: Quick Access (Recommended)</p>
        <div className="row">
          <button className="btn primary" onClick={openDirect} disabled={busy}>
            Open directly in browser
          </button>
        </div>
        <p className="muted small">
          Click to launch your browser and jump to the unlock page immediately.
        </p>

        <p className="option-title">Option 2: Copy link to open later</p>
        <div className="row">
          <button className="btn" onClick={copyLink} disabled={busy}>
            Copy link to clipboard
          </button>
        </div>
        <p className="muted small">
          Open it now in any browser, save it for later, or paste it on your
          phone or tablet. Then copy your unlock key from the page and paste it
          below.
        </p>

        <hr />

        {/* 输入区 — §4.4 Enter Unlock Key */}
        <label className="field">
          <span>Enter Unlock Key</span>
          <input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Paste the key from the website"
          />
        </label>
        <button
          className="btn primary"
          onClick={activate}
          disabled={busy || !key}
        >
          Apply Key
        </button>

        {msg && <p className="status">{msg}</p>}
        <p className="muted small">
          Token is valid for 24 hours, one-time use only. One device can only
          claim this free offer once.
        </p>
        <button className="link" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
