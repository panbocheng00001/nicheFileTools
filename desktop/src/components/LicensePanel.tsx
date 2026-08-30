import { useEffect, useRef, useState } from "react";
import type { ToolDef } from "../lib/tools-data";
import type { LicenseInfo } from "../lib/tauri";
import { activateTool, openInBrowser } from "../lib/tauri";
import { formatRemaining, siteOrigin, toolPageUrl } from "../lib/site";
import { CheckIcon, AlertIcon, ExternalLinkIcon, LockIcon } from "./icons";

/// Per-tool activation panel.
///
/// Every desktop tool is locked until the user pastes the code shown on that
/// tool's page on nichefiletools.com. The code rotates on the hour, so the panel
/// shows a live countdown and a shortcut back to the page that issued it.
export function LicensePanel({
  tool,
  license,
  now,
  onChange,
}: {
  tool: ToolDef;
  license: LicenseInfo | null;
  /** Ticking clock (ms) supplied by the parent so countdowns stay in sync. */
  now: number;
  onChange: (info: LicenseInfo) => void;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showInput, setShowInput] = useState(false);

  // Switching tools must not carry the previous tool's typed code over.
  const slugRef = useRef(tool.slug);
  if (slugRef.current !== tool.slug) {
    slugRef.current = tool.slug;
    setCode("");
    setError("");
    setShowInput(false);
  }

  const unlocked = !!license?.unlocked;
  const remaining = unlocked && license ? Math.max(0, license.expires_at - now) : 0;

  // Auto-open the input again the moment the unlock lapses.
  useEffect(() => {
    if (!unlocked) setShowInput(true);
  }, [unlocked]);

  async function submit() {
    if (!code.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const info = await activateTool(tool.slug, code);
      onChange(info);
      setCode("");
      setShowInput(false);
    } catch (e: any) {
      setError(String(e?.message ?? "That code was rejected."));
    } finally {
      setBusy(false);
    }
  }

  const pageUrl = toolPageUrl(tool.webSlug);
  const opensHint = `Opens ${siteOrigin()}/tools/${tool.webSlug}`;

  function openToolPage() {
    openInBrowser(pageUrl).catch(() => {});
  }

  if (unlocked) {
    const low = remaining > 0 && remaining < 5 * 60_000;
    return (
      <div className={`license-panel unlocked${low ? " low" : ""}`}>
        <div className="license-head">
          <span className="license-icon">
            <CheckIcon size={16} />
          </span>
          <div className="license-text">
            <div className="license-title">Unlocked</div>
            <div className="license-sub">
              {remaining > 0 ? (
                <>
                  Valid for <strong className="license-clock">{formatRemaining(remaining)}</strong>{" "}
                  — then this tool locks again.
                </>
              ) : (
                "This code just expired. Copy the current one to keep going."
              )}
            </div>
          </div>
          <div className="license-actions">
            <button className="btn tiny" onClick={openToolPage} title={opensHint}>
              <ExternalLinkIcon size={13} /> Get next code
            </button>
            <button
              className="btn tiny ghost"
              onClick={() => setShowInput((v) => !v)}
            >
              {showInput ? "Cancel" : "Enter a code"}
            </button>
          </div>
        </div>

        {showInput && (
          <div className="license-form">
            <input
              className="license-input"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="XXXX-XXXX"
              autoFocus
              spellCheck={false}
            />
            <button
              className="btn primary tiny"
              onClick={submit}
              disabled={busy || !code.trim()}
            >
              {busy ? "Checking…" : "Apply code"}
            </button>
          </div>
        )}
        {error && <p className="license-error">{error}</p>}
      </div>
    );
  }

  return (
    <div className="license-panel locked">
      <div className="license-head">
        <span className="license-icon">
          <LockIcon size={16} />
        </span>
        <div className="license-text">
          <div className="license-title">This tool is locked</div>
          <div className="license-sub">
            Copy the code from the {tool.sourceFormat} → {tool.targetFormat} page
            on <strong>{siteOrigin()}</strong>. It is free, changes every hour,
            and unlocks this one tool.
          </div>
        </div>
        <div className="license-actions">
          <button
            className="btn primary tiny"
            onClick={openToolPage}
            title={opensHint}
          >
            <ExternalLinkIcon size={13} /> Get the code
          </button>
        </div>
      </div>

      <div className="license-form">
        <input
          className="license-input"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Paste the code here"
          spellCheck={false}
        />
        <button
          className="btn primary tiny"
          onClick={submit}
          disabled={busy || !code.trim()}
        >
          {busy ? "Checking…" : "Unlock"}
        </button>
      </div>

      {error && (
        <p className="license-error">
          <AlertIcon size={13} /> {error}
        </p>
      )}
      <p className="license-note">
        Codes refresh on the hour and work for one tool only. Nothing is uploaded
        — the code is checked on your PC. The button opens{" "}
        <strong>{pageUrl}</strong>.
      </p>
    </div>
  );
}
