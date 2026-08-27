import Link from "next/link";
import { Compass } from "lucide-react";
import { TOOLS } from "@/lib/tools-data";

/**
 * 自定义 404 — 全站规范 §2.15
 * Next.js 自动返回真实 404 状态码（非 soft 404），轻量、带导航出口。
 */
export default function NotFound() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
      <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-2xl border border-border/50 bg-muted/40 text-primary">
        <Compass className="h-7 w-7" />
      </div>
      <p className="mono-label">Error 404</p>
      <h1 className="mt-3 text-4xl font-extrabold tracking-tighter text-foreground">
        Page not found
      </h1>
      <p className="mt-4 leading-relaxed text-muted-foreground">
        Oops — this page doesn&rsquo;t exist. It may have been moved, or the
        link is out of date. Try one of these instead:
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Link
          href="/"
          className="rounded-lg border border-border/60 bg-background/40 px-4 py-3 text-sm font-medium text-foreground backdrop-blur transition-colors hover:border-primary/50 hover:text-primary"
        >
          Home
        </Link>
        <Link
          href="/convert"
          className="rounded-lg border border-border/60 bg-background/40 px-4 py-3 text-sm font-medium text-foreground backdrop-blur transition-colors hover:border-primary/50 hover:text-primary"
        >
          All conversion guides
        </Link>
        <Link
          href="/download"
          className="rounded-lg border border-border/60 bg-background/40 px-4 py-3 text-sm font-medium text-foreground backdrop-blur transition-colors hover:border-primary/50 hover:text-primary"
        >
          Download desktop app
        </Link>
        <Link
          href="/support"
          className="rounded-lg border border-border/60 bg-background/40 px-4 py-3 text-sm font-medium text-foreground backdrop-blur transition-colors hover:border-primary/50 hover:text-primary"
        >
          Support center
        </Link>
      </div>

      <div className="glass mt-12 p-6 text-left">
        <h2 className="font-mono text-sm font-bold uppercase tracking-widest text-foreground">
          Popular tools
        </h2>
        <ul className="mt-4 space-y-2">
          {TOOLS.slice(0, 5).map((t) => (
            <li key={t.slug}>
              <Link
                href={`/tools/${t.slug}`}
                className="text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                {t.h1}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
