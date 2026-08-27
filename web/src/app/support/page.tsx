import type { Metadata } from "next";
import Link from "next/link";
import { Mail, BookOpen, Wrench, Download } from "lucide-react";
import { DocPage } from "@/components/DocPage";
import { SUPPORT_EMAIL } from "@/lib/site";

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

const options = [
  {
    icon: Mail,
    title: "Email support",
    body: SUPPORT_EMAIL,
    note: "Free users: within 48 hours · Paid licenses: within 12 hours",
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
    body: "Key invalid or expired? Keys are single-use and valid for 24 hours — request a new one from the app.",
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
            return o.href ? (
              <Link key={o.title} href={o.href} className="no-prose block">
                {inner}
              </Link>
            ) : (
              <div key={o.title}>{inner}</div>
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
