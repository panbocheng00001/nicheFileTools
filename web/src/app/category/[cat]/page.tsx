import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { CATEGORIES, getCategory, SITE } from "@/lib/site";
import { TOOLS, isDesktopLanding } from "@/lib/tools-data";

type Params = { params: Promise<{ cat: string }> };

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ cat: c.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { cat } = await params;
  const c = getCategory(cat);
  if (!c) return {};
  const n = TOOLS.filter((t) => t.category === cat).length;
  return {
    title: `${c.headline} — ${n} Tool${n > 1 ? "s" : ""} | No Upload`,
    description: `${n} free ${c.label.toLowerCase()} converter${n > 1 ? "s" : ""}. No upload required. 100% browser-based. Compare and choose the right tool for your files.`,
    alternates: { canonical: `/category/${c.slug}` },
    robots: { index: true, follow: true },
  };
}

export default async function CategoryPage({ params }: Params) {
  const { cat } = await params;
  const meta = getCategory(cat);
  if (!meta) notFound();

  const tools = TOOLS.filter((t) => t.category === cat);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: meta.headline,
      description: meta.intro,
      url: `${SITE}/category/${meta.slug}`,
      mainEntity: {
        "@type": "ItemList",
        itemListElement: tools.map((t, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `${SITE}/tools/${t.slug}`,
          name: t.h1,
        })),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
        {
          "@type": "ListItem",
          position: 2,
          name: meta.label,
          item: `${SITE}/category/${meta.slug}`,
        },
      ],
    },
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      {/*bread crumbs*/}
      <nav aria-label="Breadcrumb" className="mb-8">
        <ol className="flex flex-wrap items-center gap-2 font-mono text-sm uppercase tracking-widest text-muted-foreground">
          <li>
            <Link href="/" className="transition-colors hover:text-primary">
              Home
            </Link>
          </li>
          <li aria-hidden className="text-border">/</li>
          <li aria-current="page" className="font-semibold text-primary">
            {meta.label}
          </li>
        </ol>
      </nav>

      <header>
        <p className="mono-label">
          {tools.length} tool{tools.length > 1 ? "s" : ""} · No upload · 100%
          browser
        </p>
        <h1 className="mt-3 text-balance text-4xl font-extrabold tracking-tighter text-foreground sm:text-5xl">
          {meta.headline.split(" ").slice(0, -1).join(" ")}{" "}
          <span className="bg-gradient-to-r from-primary via-emerald-400 to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
            {meta.headline.split(" ").slice(-1)}
          </span>
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          {meta.intro}
        </p>
      </header>

      {/*tool grid*/}
      <section aria-label={`${meta.label} converters`} className="mt-12">
        <h2 className="font-mono text-sm font-bold uppercase tracking-widest text-foreground">
          All {meta.label} Converters
        </h2>
        <ul className="mt-5 grid gap-5 sm:grid-cols-2">
          {tools.map((t) => (
            <li key={t.slug}>
              <Link
                href={`/tools/${t.slug}`}
                className="group flex h-full flex-col rounded-2xl border border-border/40 bg-background/40 p-6 backdrop-blur-sm transition-all hover:border-primary/50 hover:bg-background/60"
              >
                <h3 className="text-xl font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
                  {t.h1}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {t.metaDescription.split(".")[1]?.trim() ||
                    `Convert ${t.sourceFormat} to ${t.targetFormat} free.`}
                </p>
                <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-xs font-bold uppercase tracking-wider text-primary">
                    Class {t.className}
                  </span>
                  <span className="mono-label">
                    {isDesktopLanding(t)
                      ? "Desktop only"
                      : `≤ ${Math.round(t.webMaxFilePc / 1024 / 1024)} MB web`}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/*Selection suggestions*/}
      <section className="glass mt-10 p-6 sm:p-8">
        <h2 className="font-mono text-sm font-bold uppercase tracking-widest text-foreground">
          Which {meta.label} converter do you need?
        </h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          {meta.pickHint}{" "}
          Files beyond the web limits — or desktop-only formats — belong in the{" "}
          <Link
            href="/download"
            className="font-medium text-primary hover:opacity-80"
          >
            free desktop app
          </Link>
          .
        </p>
        <Link
          href="/convert"
          className="mono-label mt-4 inline-flex items-center gap-1.5 !text-primary"
        >
          Browse all conversion guides
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </section>

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
