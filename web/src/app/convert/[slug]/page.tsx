import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, MonitorSmartphone, ArrowRight, Wrench } from "lucide-react";
import { CONVERT_GUIDES, getGuide } from "@/lib/convert-content";
import { getTool } from "@/lib/tools-data";
import { SITE } from "@/lib/site";
import { Share } from "@/components/Share";
import { DesktopCodeCard } from "@/components/DesktopCodeCard";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return CONVERT_GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return {};
  return {
    title: guide.title,
    description: guide.metaDescription,
    alternates: { canonical: `/convert/${guide.slug}` },
    robots: { index: true, follow: true },
    openGraph: { title: guide.title, description: guide.metaDescription },
  };
}

export default async function ConvertGuidePage({ params }: Params) {
  const { slug } = await params;
  const guide = getGuide(slug);
  const tool = getTool(slug);
  if (!guide || !tool) notFound();
  // Claim-consistency (SEO spec v1.3 §1.2): degraded tools have no web page CTA.
  const hasWebTool = tool.className !== "C" && tool.webStatus !== "desktop";

  //Schema: HowTo (real steps) + Article (author=Organization, not fictional real people) + BreadcrumbList
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: `How to Convert ${tool.sourceFormat} to ${tool.targetFormat}`,
      description: guide.metaDescription,
      // totalTime intentionally omitted: schema fields must be measured, not
      // guessed from file-size buckets (SEO spec v1.3 §1.3).
      step: guide.desktopSteps.map((s, i) => ({
        "@type": "HowToStep",
        position: i + 1,
        name: `Step ${i + 1}`,
        text: s,
      })),
      tool: [{ "@type": "HowToTool", name: "nichefiletools" }],
    },
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: `How to Convert ${tool.sourceFormat} to ${tool.targetFormat}: Complete Guide`,
      description: guide.metaDescription,
      dateModified: "2026-08-26",
      author: {
        "@type": "Organization",
        name: "nichefiletools",
        url: `${SITE}/about`,
      },
      publisher: {
        "@type": "Organization",
        name: "nichefiletools",
        url: SITE,
      },
      mainEntityOfPage: `${SITE}/convert/${guide.slug}`,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
        {
          "@type": "ListItem",
          position: 2,
          name: "Conversion Guides",
          item: `${SITE}/convert`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: `${tool.sourceFormat} to ${tool.targetFormat}`,
          item: `${SITE}/convert/${guide.slug}`,
        },
      ],
    },
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-10 xl:grid-cols-12">
        <article className="xl:col-span-8">
          {/*bread crumbs*/}
          <nav aria-label="Breadcrumb" className="mb-8">
            <ol className="flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              <li>
                <Link href="/" className="transition-colors hover:text-primary">
                  Home
                </Link>
              </li>
              <li aria-hidden className="text-border">/</li>
              <li>
                <Link
                  href="/convert"
                  className="transition-colors hover:text-primary"
                >
                  Guides
                </Link>
              </li>
              <li aria-hidden className="text-border">/</li>
              <li aria-current="page" className="font-semibold text-primary">
                {tool.sourceFormat} → {tool.targetFormat}
              </li>
            </ol>
          </nav>

          <header className="mb-10">
            <p className="mono-label">
              Complete guide · Updated Aug 2026 · {tool.sourceExt} → {tool.targetExt}
            </p>
            <h1 className="mt-3 text-balance text-4xl font-extrabold tracking-tighter text-foreground sm:text-5xl">
              How to Convert {tool.sourceFormat} to{" "}
              <span className="bg-gradient-to-r from-primary via-emerald-400 to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                {tool.targetFormat}
              </span>
            </h1>
          </header>

          <Share
            path={`/convert/${guide.slug}`}
            title={`How to Convert ${tool.sourceFormat} to ${tool.targetFormat}`}
            className="mb-8"
          />

          <div className="seo-prose">
            {/*Opening conclusion (AI Overview grab bit)*/}
            <p>
              <strong>Quick answer:</strong> {guide.quickAnswer}
            </p>

            {/*Method comparison*/}
            <h2>
              Ways to Convert {tool.sourceFormat} to {tool.targetFormat}
            </h2>
            <div className="-mx-2 overflow-x-auto px-2">
              <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border/60 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                    <th className="py-3 pr-4">Method</th>
                    <th className="px-3 py-3">Best for</th>
                    <th className="px-3 py-3">Price</th>
                    <th className="px-3 py-3">Limit</th>
                  </tr>
                </thead>
                <tbody>
                  {guide.methods.map((m) => (
                    <tr key={m.name} className="border-b border-border/40 align-top">
                      <td className="py-3 pr-4 font-semibold text-foreground">
                        {m.name}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">{m.bestFor}</td>
                      <td className="px-3 py-3 text-muted-foreground">{m.price}</td>
                      <td className="px-3 py-3 text-muted-foreground">{m.limit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {guide.methods.map((m) => (
              <p key={m.name}>
                <strong>{m.name}.</strong> {m.notes}
              </p>
            ))}

            {/*Online tool CTA (only category A/B has web tool)*/}
            {tool.className !== "C" && (
              <div className="glass my-8 flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="!mt-0 border-none !p-0 text-xl font-bold tracking-tight text-foreground">
                    Convert now — in your browser
                  </h2>
                  <p className="!mb-0 mt-1 text-sm text-muted-foreground">
                    {tool.h1}: free, no upload, files stay on your device.
                  </p>
                </div>
                <Link
                  href={`/tools/${tool.slug}`}
                  className="no-prose inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:shadow-[0_0_18px_rgba(74,222,128,0.3)]"
                >
                  <BookOpen className="h-4 w-4" />
                  Open the tool
                </Link>
              </div>
            )}

            {/*Desktop step-by-step tutorial*/}
            <h2>
              Step-by-Step: {tool.sourceFormat} to {tool.targetFormat} on
              Desktop
            </h2>
            <ol>
              {guide.desktopSteps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
            {guide.desktopNote && <p>{guide.desktopNote}</p>}
            <p>
              <Link href="/download">Download the free desktop app →</Link>{" "}
              <Link href="/free-trial">How the unlock code works →</Link>
            </p>

            {/*Troubleshooting*/}
            <h2>Common Problems &amp; Solutions</h2>
            {guide.troubleshooting.map((t) => (
              <div key={t.problem}>
                <h3>{t.problem}</h3>
                <p>{t.fix}</p>
              </div>
            ))}

            {/*in conclusion*/}
            <h2>Conclusion</h2>
            <p>{guide.conclusion}</p>
            <p>
              Ready to convert?{" "}
              {hasWebTool ? (
                <>
                  Try the free{" "}
                  <Link href={`/tools/${tool.slug}`}>{tool.h1}</Link>, or
                </>
              ) : null}{" "}
              <Link href="/download">download the desktop app</Link> for
              unlimited sizes and batch jobs.
            </p>
          </div>
        </article>

        {/*sidebar*/}
        <aside className="xl:col-span-4">
          <div className="space-y-6 xl:sticky xl:top-24">
            <DesktopCodeCard slug={tool.slug} toolName={tool.name} />
            <section className="glass-panel p-5">
              <div className="mb-3 flex items-center gap-2">
                <MonitorSmartphone className="h-5 w-5 text-primary" />
                <h2 className="font-mono text-sm font-bold uppercase tracking-widest text-foreground">
                  Online vs Desktop
                </h2>
              </div>
              <ul className="space-y-2.5 text-sm leading-relaxed text-muted-foreground">
                <li className="flex gap-2">
                  <span className="text-primary">▹</span>
                  {hasWebTool
                    ? `Web: up to ${Math.round(tool.webMaxFilePc / 1024 / 1024)} MB, instant, private.`
                    : `Desktop only — browsers cannot process ${tool.sourceFormat} files reliably.`}
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">▹</span>
                  Desktop: unlimited size, batch queue, offline.
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">▹</span>
                  Codes refresh on the hour — one code, one tool, one hour.
                </li>
              </ul>
              <Link
                href={tool.desktopUnlimited ? "/download" : "/tools/" + tool.slug}
                className="mono-label mt-4 inline-flex items-center gap-1.5 !text-primary"
              >
                {tool.desktopUnlimited ? "Get the desktop app" : "Open the free web tool"}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </section>

            <section className="glass-panel p-5">
              <div className="mb-3 flex items-center gap-2">
                <Wrench className="h-5 w-5 text-primary" />
                <h2 className="font-mono text-sm font-bold uppercase tracking-widest text-foreground">
                  Other Guides
                </h2>
              </div>
              <ul className="space-y-2.5">
                {CONVERT_GUIDES.filter((g) => g.slug !== guide.slug).map((g) => {
                  const t = getTool(g.slug)!;
                  return (
                    <li key={g.slug}>
                      <Link
                        href={`/convert/${g.slug}`}
                        className="group flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-background/40 p-3.5 text-sm transition-all hover:border-primary/50 hover:bg-background/60"
                      >
                        <span className="font-semibold text-foreground transition-colors group-hover:text-primary">
                          {t.sourceFormat} → {t.targetFormat}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-primary" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="glass-panel p-5">
              <h2 className="font-mono text-sm font-bold uppercase tracking-widest text-foreground">
                Tool Page FAQ
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Format-specific questions (limits, compatibility, quality) are
                answered in the FAQ on the{" "}
                <Link
                  href={`/tools/${tool.slug}`}
                  className="text-primary hover:opacity-80"
                >
                  {tool.h1}
                </Link>{" "}
                page.
              </p>
            </section>
          </div>
        </aside>
      </div>

      {jsonLd.map((s, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }}
        />
      ))}
    </main>
  );
}
