import Link from "next/link";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { TOOLS } from "@/lib/tools-data";
import { BRAND, REPO_ISSUES_URL, REPO_URL } from "@/lib/site";

/**
* Footer — Sitewide Specification §2.16 Key Compliance Requirements:
* Privacy / Terms / Cookie / Contact must appear in the footer of every page.
 */
const TOOLS_PREVIEW = 6;

interface FooterLink {
  href: string;
  label: string;
  /** Set for off-site links so they open in a new tab with `rel="noopener"`. */
  external?: boolean;
}

const COLS: { title: string; links: FooterLink[]; more?: FooterLink }[] = [
  {
    title: "Tools",
    links: TOOLS.slice(0, TOOLS_PREVIEW).map((t) => ({
      href: `/tools/${t.slug}`,
      label: `${t.sourceFormat} → ${t.targetFormat}`,
    })),
    more: TOOLS.length > TOOLS_PREVIEW
      ? { href: "/tools", label: `View all ${TOOLS.length} tools` }
      : undefined,
  },
  {
    title: "Desktop",
    links: [
      { href: "/download", label: "Download App" },
      { href: "/free-trial", label: "Unlock Code" },
      { href: "/pricing", label: "Pricing" },
      { href: "/license", label: "License & Activation" },
    ],
  },
  {
    title: "Learn",
    links: [
      { href: "/convert", label: "Conversion Guides" },
      { href: "/support", label: "Support Center" },
      { href: "/about", label: "About Us" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Open Source",
    links: [
      // `external: true` links open in a new tab — see the render block below.
      { href: REPO_URL, label: "Source Code on GitHub", external: true },
      { href: `${REPO_URL}/releases`, label: "Releases & Changelog", external: true },
      { href: REPO_ISSUES_URL, label: "Report a Bug", external: true },
      { href: "/license", label: "License & Activation" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Service" },
      { href: "/cookie", label: "Cookie Policy" },
      { href: "/sitemap.xml", label: "Sitemap" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative mt-24 border-t border-white/5 bg-background/60 backdrop-blur-xl">
            <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-6">
          {/*Column 1: Brand + Mission + Edition Badge*/}
          <div>
            <Link href="/" className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 font-mono text-sm font-bold text-primary">
                n
              </span>
              <span className="font-mono text-lg font-bold tracking-tighter text-foreground">
                niche<span className="text-primary">file</span>tools
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Free, browser-based file converters. Your files are processed
              locally and never uploaded to a server.
            </p>
            <span className="mt-4 inline-flex rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 font-mono text-[10px] font-medium text-primary">
              v1.0.0
            </span>
          </div>

          {/*Columns 2-6: Navigation*/}
          {COLS.map((col) => (
            <div key={col.title}>
              <h3 className="font-mono text-sm font-bold uppercase tracking-widest text-foreground">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href + l.label}>
                    {l.external ? (
                      // Off-site links keep real anchor text ("Source Code on
                      // GitHub") rather than an icon — anchor text is what
                      // carries the entity signal for crawlers.
                      <a
                        href={l.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-muted-foreground transition-colors hover:text-primary"
                      >
                        {l.label}
                      </a>
                    ) : (
                      <Link
                        href={l.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-primary"
                      >
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
                {col.more && (
                  <li className="pt-1">
                    <Link
                      href={col.more.href}
                      className="mono-label inline-flex items-center gap-1 !text-primary hover:opacity-80"
                    >
                      {col.more.label}
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>

        {/*Disclaimer*/}
        <div className="mt-12 flex items-start gap-2 rounded-xl border border-border/50 bg-muted/30 p-4 text-xs leading-relaxed text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>
            nichefiletools is provided &ldquo;as is&rdquo; without warranty.
            Always keep a backup of your original files. Conversions run entirely
            on your device.
          </p>
        </div>

        {/*Bottom copyright*/}
        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-white/5 pt-6 sm:flex-row">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            © {new Date().getFullYear()} nichefiletools
          </p>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="nichefiletools on GitHub"
            title={`${BRAND} on GitHub — ${REPO_URL}`}
            className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-primary"
          >
            <span className="font-mono text-xs uppercase tracking-widest">
              Open source
            </span>
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M12 .5C5.73.5.5 5.73.5 12.02c0 5.1 3.29 9.42 7.86 10.95.58.11.79-.25.79-.56v-2c-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.3-1.7-1.3-1.7-1.06-.72.08-.71.08-.71 1.17.08 1.79 1.2 1.79 1.2 1.04 1.79 2.73 1.27 3.4.97.1-.76.41-1.27.74-1.56-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.07 11.07 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.7 5.39-5.27 5.68.42.36.79 1.08.79 2.18v3.23c0 .31.21.68.8.56A11.53 11.53 0 0 0 23.5 12.02C23.5 5.73 18.27.5 12 .5z" />
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
}
