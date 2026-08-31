import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { DocPage } from "@/components/DocPage";

export const metadata: Metadata = {
  title: "Pricing — 100% Free, No Paid Tiers",
  description:
    "Everything on nichefiletools is free. Web converters are unlimited; the desktop app unlocks with a free hourly code. No accounts, no payments.",
  alternates: { canonical: "/pricing" },
  robots: { index: true, follow: true },
};

const INCLUDED: { feature: string; detail: string }[] = [
  {
    feature: "Online web tools",
    detail: "Free and unlimited — every format, every file within the browser limits, no signup.",
  },
  {
    feature: "Desktop app",
    detail: "Free. Each tool unlocks for an hour with a code copied from that tool's page.",
  },
  {
    feature: "File size (desktop)",
    detail: "Unlimited — the desktop app has no per-file cap.",
  },
  { feature: "Batch conversion (desktop)", detail: "Included." },
  { feature: "Desktop-only formats (RAW→ISO, WAD)", detail: "Included." },
  { feature: "Updates", detail: "Included — the project is open source, every release is free." },
  { feature: "Price", detail: "$0. There is no paid tier." },
];

// 红线（SEO 规范 §2.16 / 附录 A）：当前无真实 Offer，禁止 Product/Offer schema。
// 将来引入付费层时再恢复 Product schema 并同步本页内容。

export default function PricingPage() {
  return (
    <DocPage eyebrow="Pricing" title="Everything is free">
      <p>
        nichefiletools has no paid tier. Everything in the browser is free and
        unlimited, and the desktop app is unlocked with a{" "}
        <Link href="/free-trial">free hourly code</Link> copied from each
        tool&rsquo;s page. No subscription, no license key, no per-file fees,
        and no account — there is nothing to buy.
      </p>

      <div className="not-prose -mx-2 mt-2 overflow-x-auto px-2">
        <table className="w-full min-w-[520px] border-collapse text-left">
          <thead>
            <tr className="border-b border-border/60">
              <th className="py-3 pr-4 font-mono text-sm font-bold uppercase tracking-widest text-muted-foreground">
                What&rsquo;s included
              </th>
              <th className="px-4 py-3 font-mono text-sm font-bold uppercase tracking-widest text-primary">
                Free
              </th>
            </tr>
          </thead>
          <tbody>
            {INCLUDED.map((r) => (
              <tr key={r.feature} className="border-b border-border/40">
                <td className="py-3 pr-4 text-sm font-medium text-foreground">
                  {r.feature}
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-0.5 inline-grid h-5 w-5 shrink-0 place-items-center rounded-md bg-success/15 text-success">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    {r.detail}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Why is it free?</h2>
      <p>
        The whole stack — the web app, the desktop app, and every conversion
        kernel — is{" "}
        <Link href="/about">open source</Link>. The hourly code is not a sales
        funnel: it is a transparent, public-algorithm gate that points desktop
        users back at the page that documents each format. If a paid tier is
        ever introduced, this page will say so first.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/download"
          className="no-prose inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:shadow-[0_0_18px_rgba(74,222,128,0.3)]"
        >
          Download the free desktop app
        </Link>
        <Link
          href="/license"
          className="no-prose inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/40 px-5 py-2.5 text-sm font-semibold text-foreground backdrop-blur transition-colors hover:border-primary/50 hover:text-primary"
        >
          How unlock codes work
        </Link>
      </div>
    </DocPage>
  );
}
