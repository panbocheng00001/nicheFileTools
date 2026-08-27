"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { KeyRound, Copy, Check, AlertTriangle } from "lucide-react";

type State = "loading" | "valid" | "invalid";

export default function FreeTrialClient() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [state, setState] = useState<State>("loading");
  const [key, setKey] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    fetch(`/api/desktop-validate?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d: { valid: boolean; key?: string }) => {
        if (d.valid && d.key) {
          setKey(d.key);
          setState("valid");
        } else {
          setState("invalid");
        }
      })
      .catch(() => setState("invalid"));
  }, [token]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may be unavailable; user can select manually */
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <header>
        <span className="mono-label">Free desktop unlock</span>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tighter text-foreground sm:text-4xl">
          Your free desktop unlock key
        </h1>
      </header>

      {state === "loading" && (
        <p className="mt-8 text-muted-foreground">Verifying your link…</p>
      )}

      {state === "invalid" && (
        <div className="glass mt-8 border-destructive/30 p-6">
          <div className="mb-3 flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-mono text-xs font-bold uppercase tracking-widest">
              Invalid link
            </span>
          </div>
          <p className="text-destructive">This link is invalid or expired.</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Free keys are single-use and valid for 24 hours. Please request a new
            key from the desktop app.
          </p>
          <Link
            href="/download"
            className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:shadow-[0_0_18px_rgba(74,222,128,0.3)]"
          >
            Download the desktop app
          </Link>
        </div>
      )}

      {state === "valid" && (
        <div className="glass mt-8 p-6">
          <div className="mb-3 flex items-center gap-2 text-primary">
            <KeyRound className="h-5 w-5" />
            <span className="font-mono text-xs font-bold uppercase tracking-widest">
              Key ready
            </span>
          </div>
          <p className="leading-relaxed text-muted-foreground">
            Copy this key and paste it back into the nichefiletools desktop app
            to unlock <strong className="text-foreground">2 free conversions</strong>.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <code className="flex-1 truncate rounded-lg border border-border bg-muted/40 px-4 py-2.5 font-mono text-lg text-foreground">
              {key}
            </code>
            <button
              onClick={copy}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:shadow-[0_0_18px_rgba(74,222,128,0.3)]"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied!" : "Copy key"}
            </button>
          </div>
          <p className="mono-label mt-3">
            One free key per device. After 2 conversions, a paid license is
            required.
          </p>
        </div>
      )}

      {/* 站内导流模块 — 战略文档 §4.6（提升多页浏览、降低跳出率） */}
      <div className="mt-12 grid gap-3 sm:grid-cols-2">
        <Link
          href="/tools/"
          className="rounded-lg border border-border/60 bg-background/40 px-4 py-3 text-center text-sm font-medium text-foreground backdrop-blur transition-colors hover:border-primary/50 hover:text-primary"
        >
          Try our online converters
        </Link>
        <Link
          href="/convert/"
          className="rounded-lg border border-border/60 bg-background/40 px-4 py-3 text-center text-sm font-medium text-foreground backdrop-blur transition-colors hover:border-primary/50 hover:text-primary"
        >
          Read conversion guides
        </Link>
        <Link
          href="/support/"
          className="rounded-lg border border-border/60 bg-background/40 px-4 py-3 text-center text-sm font-medium text-foreground backdrop-blur transition-colors hover:border-primary/50 hover:text-primary"
        >
          Troubleshooting &amp; help
        </Link>
        <Link
          href="/pricing/"
          className="rounded-lg border border-border/60 bg-background/40 px-4 py-3 text-center text-sm font-medium text-foreground backdrop-blur transition-colors hover:border-primary/50 hover:text-primary"
        >
          Buy full-feature license
        </Link>
      </div>

      {/* 底部合规说明 — 战略文档 §4.6 */}
      <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
        Free limited offer. For unlimited batch processing,{" "}
        <Link href="/pricing/" className="text-primary hover:opacity-80">
          purchase our software license
        </Link>
        .
      </p>
    </main>
  );
}
