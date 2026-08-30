import type { Metadata } from "next";
import Link from "next/link";
import { Mail, BookOpen, Wrench, Download } from "lucide-react";
import { DocPage } from "@/components/DocPage";
import { REPO_ISSUES_URL, SUPPORT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Support Center",
  description:
    "Get help with nichefiletools: email support, conversion guides, desktop download. Response times included.",
  alternates: { canonical: "/support" },
  robots: { index: true, follow: true },
};

const contactJsonLd = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  name: "nichefiletools Support Center",
  url: "https://nichefiletools.com/support",
};

interface SupportOption {
  icon: typeof Mail;
  title: string;
  body: string;
  /** Small print under the body (e.g. response times). */
  note?: string;
  href?: string;
  cta?: string;
  /** Off-site links (GitHub) open in a new tab. */
  external?: boolean;
}

const options: SupportOption[] = [
  {
    icon: Mail,
    title: "Email support",
    body: SUPPORT_EMAIL,
    note: "Typical response: within 48 hours",
  },
  {
    icon: BookOpen,
    title: "Conversion guides",
    body: "Step-by-step guides for every supported format, including desktop-only conversions.",
    href: "/convert",
    cta: "Browse guides",
  },
  {
    icon: Wrench,
    title: "Desktop unlock issues",
    body: "Code not accepted? Each code is per tool and rotates on the hour — copy the current one from that tool's page.",
    href: "/license",
    cta: "License help",
  },
  {
    icon: Download,
    title: "Desktop app",
    body: "Larger files, batch conversion, and desktop-only formats.",
    href: "/download",
    cta: "Download app",
  },
  {
    icon: Wrench,
    title: "Report a bug",
    body: "The project is open source — file an issue with a small sample file and we'll look at the format directly.",
    href: REPO_ISSUES_URL,
    cta: "Open a GitHub issue",
    external: true,
  },
];

export default function SupportPage() {
  return (
    <>
      <DocPage eyebrow="Help" title="Support Center">
        <p>
          Most questions are answered by the resources below. If you still
          need help, email us — a real person reads every message.
        </p>

        <div className="mt-2 grid gap-4 not-prose">
          {options.map((o) => {
            const Icon = o.icon;
            const inner = (
              <div className="glass flex gap-4 p-5">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-bold tracking-tight text-foreground">
                    {o.title}
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {o.body}
                  </p>
                  {o.note && (
                    <p className="mono-label mt-1.5">{o.note}</p>
                  )}
                  {o.cta && (
                    <span className="mono-label mt-1.5 inline-block text-primary">
                      {o.cta} →
                    </span>
                  )}
                </div>
              </div>
            );
            if (!o.href) return <div key={o.title}>{inner}</div>;
            return o.external ? (
              <a
                key={o.title}
                href={o.href}
                target="_blank"
                rel="noopener noreferrer"
                className="no-prose block"
              >
                {inner}
              </a>
            ) : (
              <Link key={o.title} href={o.href} className="no-prose block">
                {inner}
              </Link>
            );
          })}
        </div>

        <h2>Before you write</h2>
        <p>
          To resolve conversion issues fastest, include: the tool page you
          used, your file&rsquo;s size, your browser and OS, and the exact
          error message (if any).
        </p>
      </DocPage>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactJsonLd) }}
      />
    </>
  );
}
