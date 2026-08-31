"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Check,
  Copy,
  KeyRound,
  Download,
  ExternalLink,
  Lightbulb,
  ArrowRight,
} from "lucide-react";
import {
  currentCodeInfo,
  formatRemaining,
  HOUR_MS,
  type CurrentCode,
} from "@/lib/desktopCode";
import { getCodeTip } from "@/lib/code-tips";

/**
 * The card that shows the current unlock code for a tool. Rendered on every
 * `/tools/[slug]` and `/convert/[slug]` page so a user with the desktop app
 * open in another window can copy the code straight from the page.
 *
 * The code is computed client-side from a public, deterministic algorithm —
 * the desktop app verifies it offline, so there is no server round trip and
 * no account to sign in to. Because the project is open source, the algorithm
 * is documented at `/free-trial` and the desktop app computes the same answer.
 *
 * Beyond the code itself, the card carries a "tip of the hour" that rotates
 * with the same UTC bucket as the code (new hour → new code AND new tip).
 * This turns a 5-second code-grab visit into a ~30-second read — the
 * highest-leverage engagement change for the hourly-return mechanism — and
 * deep-links into the /convert/ tutorial, feeding internal PageRank to the
 * long-form guides. The grab counter is localStorage-only (never leaves the
 * browser; see /privacy).
 */
export function DesktopCodeCard({ slug, toolName }: { slug: string; toolName: string }) {
  const [info, setInfo] = useState<CurrentCode | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const [copied, setCopied] = useState(false);
  const [tip, setTip] = useState<string | null>(null);
  const [grabs, setGrabs] = useState(0);
  // Avoid re-rendering the card if the user opens multiple tabs in the same
  // minute — the code is the same until the top of the hour.
  const lastBucket = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;
    currentCodeInfo(slug).then((c) => {
      if (!alive) return;
      lastBucket.current = c.bucket;
      setInfo(c);
      setTip(getCodeTip(slug, c.bucket));
    });
    return () => {
      alive = false;
    };
  }, [slug]);

  // Local-only grab counter (per browser; nothing is ever uploaded).
  useEffect(() => {
    try {
      const n = parseInt(window.localStorage.getItem(`nft_code_grabs:${slug}`) ?? "0", 10);
      if (Number.isFinite(n) && n > 0) setGrabs(n);
    } catch {
      /* private browsing — the counter simply stays at zero */
    }
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
        currentCodeInfo(slug).then((c) => {
          setInfo(c);
          setTip(getCodeTip(slug, c.bucket));
        });
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
      // Local-only counter (never sent anywhere — see /privacy).
      try {
        const n = grabs + 1;
        window.localStorage.setItem(`nft_code_grabs:${slug}`, String(n));
        setGrabs(n);
      } catch {
        /* ignore quota/private-mode errors */
      }
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

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
        <span title="Codes rotate on the hour (UTC) and are per tool.">
          {remaining > 0 ? (
            <>
              Refreshes in <strong className={low ? "text-warning" : "text-foreground"}>{formatRemaining(remaining)}</strong>
            </>
          ) : (
            "Refreshing…"
          )}
        </span>
        <span title="Counted in this browser only — never uploaded.">
          Per tool · 1 hour{grabs > 0 ? ` · ${grabs} grab${grabs > 1 ? "s" : ""} here` : ""}
        </span>
      </div>

      {/* Tip of the hour — rotates with the same UTC bucket as the code. */}
      {tip && (
        <div className="mt-4 rounded-lg border border-border/60 bg-muted/30 p-3.5">
          <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-widest text-primary">
            <Lightbulb className="h-3.5 w-3.5" />
            Tip of the hour
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {tip}
          </p>
          <Link
            href={`/convert/${slug}`}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary transition-opacity hover:opacity-80"
          >
            Read the full guide
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}

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
