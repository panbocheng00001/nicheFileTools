import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound, Code2, Clock, ExternalLink } from "lucide-react";
import { REPO_ISSUES_URL, REPO_URL, SITE } from "@/lib/site";
import { TOOLS } from "@/lib/tools-data";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Desktop Unlock Code — How It Works",
  description:
    "The nichefiletools desktop app is unlocked with a free, hourly code copied from the matching tool page. The whole project is open source, the algorithm is public, and there is no account to sign up for.",
  alternates: {
    canonical: "https://nichefiletools.com/free-trial",
  },
  robots: { index: true, follow: true },
};

export default function FreeTrialPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <header>
        <p className="mono-label">Desktop unlock · open source</p>
        <h1 className="mt-3 text-balance text-4xl font-extrabold tracking-tighter text-foreground sm:text-5xl">
          One code, one tool, one hour.
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          Every desktop tool is locked until you paste the code shown on its
          page. The code is free, rotates on the hour, and the algorithm is
          public — because the whole project is open source, there is no
          secret for a server to keep.
        </p>
      </header>

      <section className="seo-prose mt-10">
        <h2>How to unlock a tool</h2>
        <ol>
          <li>
            Open the <Link href="/download/">nichefiletools desktop app</Link>{" "}
            and pick the tool you want to use. Its card will say
            <em> “This tool is locked.”</em>
          </li>
          <li>
            Open the same tool&apos;s page here on the site — for example,{" "}
            <Link href="/tools/kfx-to-epub">/tools/kfx-to-epub</Link>. In the
            sidebar you&apos;ll see a card with the current 8-character code and
            a countdown to the next refresh.
          </li>
          <li>
            Click <strong>Copy</strong>, paste the code into the desktop app,
            and the tool unlocks until the countdown hits zero. There is no
            sign-up, no payment, and nothing is uploaded.
          </li>
        </ol>

        <h2>Why the code rotates</h2>
        <p>
          The code is recomputed every hour from a tiny, public formula: a
          SHA-256 digest of the tool slug plus the current hour bucket, base32
          encoded. The desktop app recomputes the same digest and compares it
          against the one you pasted. Because both sides use the same formula,
          no server, no database, and no network call is needed for the
          desktop app to verify the code.
        </p>
        <p>
          Codes are per tool: a code shown on the KFX → EPUB page only unlocks
          KFX → EPUB. That keeps each tool page useful in its own right and
          keeps a leaky URL from unlocking everything.
        </p>

        <h2>What this is not</h2>
        <p>
          This is a <em>convenience gate</em>, not a security boundary. The
          code is fully derivable from the open-source algorithm, so anyone
          with a little patience could generate codes without visiting the
          site. The point is the opposite: every hour, the desktop app needs
          the user to look at a tool page — and a tool page is the most
          useful place on the internet to learn about a tool, see a working
          preview, and discover related converters.
        </p>

        <h2>The algorithm in 30 seconds</h2>
        <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 font-mono text-sm leading-relaxed text-foreground"><code>{`// payload = "nft1:{slug}:{utcHourBucket}"
// digest  = SHA-256(payload)
// value   = big-endian uint40 from digest[0..5]
// code    = base32(value), MSB first, "XXXX-XXXX"
//
// Web implementation:  web/src/lib/desktopCode.ts
// Desktop (Rust):      desktop/src-tauri/src/desktop_code.rs
// Shared test vectors live in the Rust tests and the web generator
// (./workbuddy/tmp/gen-code-vectors.mjs).`}</code></pre>
      </section>

      <section className="mt-10">
        <h2 className="font-mono text-sm font-bold uppercase tracking-widest text-foreground">
          Pick a tool to grab a code
        </h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {TOOLS.map((t) => (
            <li key={t.slug}>
              <Link
                href={`/tools/${t.slug}`}
                className="group flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-background/40 px-4 py-2.5 text-sm transition-all hover:border-primary/50 hover:bg-background/60"
              >
                <span className="font-medium text-foreground transition-colors group-hover:text-primary">
                  {t.name}
                </span>
                <span className="text-sm text-muted-foreground">
                  {t.sourceFormat} → {t.targetFormat}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="glass-panel mt-10 grid gap-4 border-primary/20 p-6 sm:grid-cols-3">
        <div className="flex items-start gap-3">
          <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <div className="font-mono text-sm font-bold uppercase tracking-widest text-foreground">
              1 code
            </div>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              8 characters, no account, no email.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Code2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <div className="font-mono text-sm font-bold uppercase tracking-widest text-foreground">
              1 tool
            </div>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Per tool — no global bypass.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <div className="font-mono text-sm font-bold uppercase tracking-widest text-foreground">
              1 hour
            </div>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Refreshes on the hour (UTC), unlimited uses in that window.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-10 flex flex-wrap items-center gap-3">
        <Link
          href="/download/"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:shadow-[0_0_18px_rgba(74,222,128,0.3)]"
        >
          Download the desktop app
        </Link>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/40 px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/50 hover:text-primary"
        >
          Read the source on GitHub
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <a
          href={REPO_ISSUES_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          Found a bug? Open an issue
        </a>
        <span className="text-sm text-muted-foreground">
          Hosted at{" "}
          <a href={SITE} className="text-primary hover:opacity-80">
            {SITE.replace("https://", "")}
          </a>
        </span>
      </section>
    </main>
  );
}
