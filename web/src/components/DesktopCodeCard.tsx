"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, Copy, KeyRound, Download, ExternalLink } from "lucide-react";
import {
  currentCodeInfo,
  formatRemaining,
  HOUR_MS,
  type CurrentCode,
} from "@/lib/desktopCode";

/**
 * The card that shows the current unlock code for a tool. Rendered on every
 * `/tools/[slug]` and `/convert/[slug]` page so a user with the desktop app
 * open in another window can copy the code straight from the page.
 *
 * The code is computed client-side from a public, deterministic algorithm —
 * the desktop app verifies it offline, so there is no server round trip and
 * no account to sign in to. Because the project is open source, the algorithm
 * is documented at `/free-trial` and the desktop app computes the same answer.
 */
export function DesktopCodeCard({ slug, toolName }: { slug: string; toolName: string }) {
  const [info, setInfo] = useState<CurrentCode | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const [copied, setCopied] = useState(false);
  // Avoid re-rendering the card if the user opens multiple tabs in the same
  // minute — the code is the same until the top of the hour.
  const lastBucket = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;
    currentCodeInfo(slug).then((c) => {
      if (!alive) return;
      lastBucket.current = c.bucket;
      setInfo(c);
    });
    return () => {
      alive = false;
    };
  }, [slug]);

  // Tick the countdown every second; recompute the code when the hour rolls
  // over (one timer handles both, so we wake up at most once a second).
  useEffect(() => {
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      const bucket = Math.floor(t / HOUR_MS);
      if (lastBucket.current !== null && bucket !== lastBucket.current) {
        lastBucket.current = bucket;
        currentCodeInfo(slug).then((c) => setInfo(c));
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [slug]);

  const remaining = useMemo(
    () => (info ? Math.max(0, info.expiresAt - now) : 0),
    [info, now],
  );
  const low = remaining > 0 && remaining < 5 * 60_000;

  async function copy() {
    if (!info) return;
    try {
      await navigator.clipboard.writeText(info.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* user can still select the text manually */
    }
  }

  return (
    <aside className="glass-panel border-primary/20 p-5 sm:p-6">
      <div className="mb-3 flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-primary" />
        <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-foreground">
          Desktop unlock code
        </h2>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Use this code inside the <strong className="text-foreground">nichefiletools</strong>{" "}
        desktop app to unlock <strong className="text-foreground">{toolName}</strong> for
        the rest of the hour. Open the desktop app, pick {toolName}, and paste the
        code — no account, no upload, no payment.
      </p>

      <div className="mt-4 flex items-stretch gap-2">
        <code
          className="flex-1 select-all truncate rounded-lg border border-border bg-muted/40 px-4 py-3 text-center font-mono text-xl font-semibold tracking-[0.25em] text-foreground"
          aria-live="polite"
        >
          {info?.code ?? "••••-••••"}
        </code>
        <button
          type="button"
          onClick={copy}
          disabled={!info}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-all hover:shadow-[0_0_18px_rgba(74,222,128,0.3)] disabled:opacity-60"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        <span title="Codes rotate on the hour (UTC) and are per tool.">
          {remaining > 0 ? (
            <>
              Refreshes in <strong className={low ? "text-warning" : "text-foreground"}>{formatRemaining(remaining)}</strong>
            </>
          ) : (
            "Refreshing…"
          )}
        </span>
        <span>Per tool · 1 hour</span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/60 pt-4 text-sm">
        <Link
          href="/download/"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/40 px-3.5 py-2 font-semibold text-foreground transition-colors hover:border-primary/50 hover:text-primary"
        >
          <Download className="h-4 w-4" />
          Get the desktop app
        </Link>
        <Link
          href="/free-trial"
          className="inline-flex items-center gap-1.5 px-2 py-2 text-muted-foreground transition-colors hover:text-primary"
        >
          How it works
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
    </aside>
  );
}
