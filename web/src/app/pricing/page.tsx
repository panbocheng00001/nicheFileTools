import type { Metadata } from "next";
import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { DocPage } from "@/components/DocPage";
import { SITE, BRAND } from "@/lib/site";

export const metadata: Metadata = {
  title: "Pricing — Free vs Pro Desktop License",
  description:
    "Compare nichefiletools Free and Pro desktop license. One-time payment, lifetime updates. Web tools stay free forever.",
  alternates: { canonical: "/pricing" },
  robots: { index: true, follow: true },
};

// 全站规范 §2.16 示例价：$29 一次性买断（上线前与业务确认最终定价）
const LICENSE_PRICE = "29.00";

const productJsonLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: `${BRAND} Desktop License`,
  description:
    "One-time desktop license for nichefiletools: unlimited conversions, batch processing, desktop-only formats.",
  brand: { "@type": "Brand", name: BRAND },
  offers: {
    "@type": "Offer",
    price: LICENSE_PRICE,
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
    url: `${SITE}/pricing`,
  },
  // 红线：无真实用户评价前禁止 AggregateRating（对照表 #13）
};

const ROWS: { feature: string; free: boolean | string; pro: boolean | string }[] =
  [
    { feature: "Online web tools", free: "Free, unlimited", pro: "Free, unlimited" },
    { feature: "Desktop conversions", free: "2 free attempts per device", pro: "Unlimited" },
    { feature: "File size (desktop)", free: "Unlimited", pro: "Unlimited" },
    { feature: "Batch conversion", free: true, pro: true },
    { feature: "Desktop-only formats (RAW→ISO)", free: true, pro: true },
    { feature: "Priority support", free: false, pro: true },
    { feature: "Future updates", free: "Free tier updates", pro: "Lifetime" },
    { feature: "Price", free: "$0", pro: `$${LICENSE_PRICE} one-time` },
  ];

function Cell({ v }: { v: boolean | string }) {
  if (v === true)
    return (
      <span className="inline-grid h-5 w-5 place-items-center rounded-md bg-success/15 text-success">
        <Check className="h-3.5 w-3.5" />
      </span>
    );
  if (v === false)
    return (
      <span className="inline-grid h-5 w-5 place-items-center rounded-md bg-muted text-muted-foreground">
        <Minus className="h-3.5 w-3.5" />
      </span>
    );
  return <span className="text-sm text-foreground">{v}</span>;
}

export default function PricingPage() {
  return (
    <>
      <DocPage eyebrow="Pricing" title="Free vs Pro">
        <p>
          Everything in the browser is free, forever. The desktop app is free
          to try with a{" "}
          <Link href="/free-trial">one-time unlock of 2 conversions</Link>; a
          single one-time license unlocks unlimited desktop use. No
          subscription, no per-file fees.
        </p>

        <div className="not-prose -mx-2 mt-2 overflow-x-auto px-2">
          <table className="w-full min-w-[520px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border/60">
                <th className="py-3 pr-4 font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Feature
                </th>
                <th className="px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Free
                </th>
                <th className="px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-widest text-primary">
                  Pro — ${LICENSE_PRICE} once
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.feature} className="border-b border-border/40">
                  <td className="py-3 pr-4 text-sm font-medium text-foreground">
                    {r.feature}
                  </td>
                  <td className="px-4 py-3">
                    <Cell v={r.free} />
                  </td>
                  <td className="px-4 py-3">
                    <Cell v={r.pro} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/download"
            className="no-prose inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:shadow-[0_0_18px_rgba(74,222,128,0.3)]"
          >
            Download &amp; try free
          </Link>
          <Link
            href="/license"
            className="no-prose inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/40 px-5 py-2.5 text-sm font-semibold text-foreground backdrop-blur transition-colors hover:border-primary/50 hover:text-primary"
          >
            How licenses work
          </Link>
        </div>

        <h2>Refund policy</h2>
        <p>
          If the desktop app does not work as described on your machine,
          contact us within 14 days of purchase for a full refund. We only ask
          what went wrong, so we can fix it.
        </p>
      </DocPage>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
    </>
  );
}
