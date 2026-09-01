import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import fs from "node:fs";
import path from "node:path";
import { BookOpen, MonitorSmartphone, ArrowRight, Wrench, ExternalLink } from "lucide-react";
import {
  CONVERT_GUIDES,
  getGuide,
  type GuideScreenshot,
} from "@/lib/convert-content";
import { getTool, hasWebConverter } from "@/lib/tools-data";
import { SITE, REPO_URL } from "@/lib/site";
import { Share } from "@/components/Share";
import { ZoomableImage, type LightboxImage } from "@/components/Lightbox";
import { DesktopCodeCard } from "@/components/DesktopCodeCard";

type Params = { params: Promise<{ slug: string }> };

/**
 * Spec §三.2/§四: screenshots render only when the file actually exists in
 * public/convert/[slug]/. WorkBuddy captures land there — spec v2.2 §三.2
 * relaxed: localhost captures ARE shipped (the in-browser converter UI
 * renders identically on a local production build and on the live domain,
 * and no localhost text appears in any captured frame), so the page lights
 * up progressively as the pipeline produces images.
 */
function existingShots(
  slug: string,
  shots: GuideScreenshot[] | undefined,
): GuideScreenshot[] {
  if (!shots?.length) return [];
  const dir = path.join(process.cwd(), "public", "convert", slug);
  return shots.filter((s) => fs.existsSync(path.join(dir, s.file)));
}

function updatedLabel(updated: string | undefined): string {
  if (!updated) return "Aug 2026";
  const d = new Date(`${updated}T00:00:00Z`);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

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
  const hasWebTool = hasWebConverter(tool);
  const shots = existingShots(guide.slug, guide.screenshots);
  const stepShots = (n: number) => shots.filter((s) => s.step === n);
  const sectionShots = shots.filter((s) => !s.step);
  // All shots on the page form one lightbox group so the viewer's arrow keys
  // can page through the whole walkthrough without closing it.
  const shotGroup: LightboxImage[] = shots.map((s) => ({
    src: `/convert/${guide.slug}/${s.file}`,
    alt: s.alt,
    caption: s.alt,
  }));

  //Schema: HowTo (real steps) + Article (author=Organization, not fictional real people)
  //+ FAQPage (page-level, matches visible FAQ section) + BreadcrumbList
  const jsonLd: Record<string, unknown>[] = [
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
      // §八.4: dateModified follows the guide's `updated` field, not a
      // hardcoded constant — refreshes must surface here + in sitemap lastmod.
      dateModified: guide.updated ?? "2026-08-26",
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
      // ImageObject: only key shots that actually exist on disk (spec: 重点图，
      // 非全量截图)
      ...(shots.length > 0 && {
        image: shots.slice(0, 2).map((s) => ({
          "@type": "ImageObject",
          contentUrl: `${SITE}/convert/${guide.slug}/${s.file}`,
          name: s.alt,
          caption: s.alt,
        })),
      }),
    },
    ...(guide.faqs?.length
      ? [
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: guide.faqs.map((f) => ({
              "@type": "Question",
              name: f.question,
              acceptedAnswer: { "@type": "Answer", text: f.answer },
            })),
          },
        ]
      : []),
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
            <ol className="flex flex-wrap items-center gap-2 font-mono text-sm uppercase tracking-widest text-muted-foreground">
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
              Complete guide · Updated {updatedLabel(guide.updated)} · {tool.sourceExt} → {tool.targetExt}
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
            {/*Self-contained AI-citable answer (spec §2.11/§9.5: 40-60
                words, quotable out of context for AI Overview / Copilot /
                ChatGPT) — visually distinct block so crawlers & users can
                isolate it as the page's TL;DR.*/}
            <p className="border-l-2 border-primary/60 pl-4 text-base leading-relaxed text-foreground">
              <strong>Quick answer:</strong> {guide.quickAnswer}
            </p>

            {/*Method comparison*/}
            <h2>
              Ways to Convert {tool.sourceFormat} to {tool.targetFormat}
            </h2>
            <div className="-mx-2 overflow-x-auto px-2">
              <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border/60 font-mono text-sm uppercase tracking-widest text-muted-foreground">
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
            {hasWebTool && (
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

            {/*Desktop step-by-step tutorial (stepsTitle overrides for online-tool guides)*/}
            <h2>
              {guide.stepsTitle ??
                `Step-by-Step: ${tool.sourceFormat} to ${tool.targetFormat} on Desktop`}
            </h2>
            <ol>
              {guide.desktopSteps.map((s, i) => {
                const stepImgs = stepShots(i + 1);
                return (
                  <li key={s} className="space-y-2">
                    <span>{s}</span>
                    {stepImgs.length > 0 && (
                      <div className="mt-2 space-y-3">
                        {stepImgs.map((sh) => (
                          <GuideShot
                            key={sh.file}
                            slug={guide.slug}
                            shot={sh}
                            group={shotGroup}
                          />
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
            {guide.desktopNote && <p>{guide.desktopNote}</p>}
            <p>
              <Link href="/download">Download the free desktop app →</Link>{" "}
              <Link href="/free-trial">How the unlock code works →</Link>
            </p>

            {/*Batch & large files (SEO spec §2.2)*/}
            <h2>Batch &amp; Large Files</h2>
            <p>{guide.batchLarge}</p>

            {/*Troubleshooting*/}
            <h2>Common Problems &amp; Solutions</h2>
            {guide.troubleshooting.map((t) => (
              <div key={t.problem}>
                <h3>{t.problem}</h3>
                <p>{t.fix}</p>
              </div>
            ))}

            {/*Page-level FAQ (visible content matches FAQPage schema; spec §3.2)*/}
            {guide.faqs?.length ? (
              <>
                <h2>Frequently Asked Questions</h2>
                {guide.faqs.map((f) => (
                  <div key={f.question}>
                    <h3>{f.question}</h3>
                    <p>{f.answer}</p>
                  </div>
                ))}
              </>
            ) : null}

            {/*Page-level overview / result shots (spec §四: 截图周边上下文
                与图片主题一致强化相关性). These are screenshots without a
                step number — results, batch overviews, side-by-side
                comparisons. They render only when the file exists on disk,
                same fs-guard as step shots.*/}
            {sectionShots.length > 0 && (
              <div className="space-y-3">
                {sectionShots.map((sh) => (
                  <GuideShot
                    key={sh.file}
                    slug={guide.slug}
                    shot={sh}
                    group={shotGroup}
                  />
                ))}
              </div>
            )}

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

            {/*References — entity SEO: real REPO_URL anchor link (spec v2.2,
                feeds Organization.sameAs citation density)*/}
            <h2>References</h2>
            <ul>
              <li>
                <a
                  href={REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  nichefiletools on GitHub
                  <ExternalLink className="ml-1 inline h-3.5 w-3.5" />
                </a>{" "}
                — open-source converter implementations, engine bindings, and
                the hourly unlock-code algorithm.
              </li>
            </ul>

            {/*Compliance footer trio (spec §3 通用要求 3): updated date +
                reviewer + screenshots provenance. The screenshots line only
                renders when shots actually exist on this page.*/}
            <footer className="mt-10 border-t border-border pt-5 text-sm leading-relaxed text-muted-foreground">
              <p>
                Last updated {updatedLabel(guide.updated)} · Reviewed by the
                nichefiletools engineering team.
              </p>
              {shots.length > 0 && (
                <p>
                  Screenshots from actual software operation on
                  nichefiletools.com and the nichefiletools desktop app.
                </p>
              )}
            </footer>
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
                href={hasWebTool ? `/tools/${tool.slug}` : "/download"}
                className="mono-label mt-4 inline-flex items-center gap-1.5 !text-primary"
              >
                {hasWebTool ? "Open the free web tool" : "Get the desktop app"}
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

/**
 * Annotated step screenshot (spec §四): lossless WebP, ~1200px wide, lazy
 * loaded so Core Web Vitals stay unaffected. Rendered only when the file
 * exists (see existingShots). Click opens the full-screen zoom viewer
 * (same Lightbox as the help page) with the page's shots as one group.
 */
function GuideShot({
  slug,
  shot,
  group,
}: {
  slug: string;
  shot: GuideScreenshot;
  group: LightboxImage[];
}) {
  const src = `/convert/${slug}/${shot.file}`;
  return (
    <figure className="my-4">
      <ZoomableImage
        image={{ src, alt: shot.alt, caption: shot.alt }}
        group={group}
        className="w-full rounded-xl border border-border"
      />
      <figcaption className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        {shot.alt}
      </figcaption>
    </figure>
  );
}
