import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, Download } from "lucide-react";
import { TOOLS } from "@/lib/tools-data";
import { CATEGORIES, SITE } from "@/lib/site";
import { ToolsExplorer } from "@/components/ToolsExplorer";

export const metadata: Metadata = {
  title: `All ${TOOLS.length} File Converters — No Upload, 100% Browser | nichefiletools`,
  description:
    "Browse every free online file converter. eBook, 3D/CAD, image, audio, font and data tools — 100% browser-based, private, no upload. Compare and pick the right one for your file.",
  alternates: { canonical: "/tools" },
  robots: { index: true, follow: true },
};

export default function ToolsIndexPage() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "All File Converters",
      description:
        "Browse every free online file converter on nichefiletools — 100% browser-based, private, no upload.",
      url: `${SITE}/tools`,
      mainEntity: {
        "@type": "ItemList",
        itemListElement: TOOLS.map((t, i) => ({
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
        { "@type": "ListItem", position: 2, name: "Tools", item: `${SITE}/tools` },
      ],
    },
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      {/*bread crumbs*/}
      <nav aria-label="Breadcrumb" className="mb-8">
        <ol className="flex flex-wrap items-center gap-2 font-mono text-sm uppercase tracking-widest text-muted-foreground">
          <li>
            <Link href="/" className="transition-colors hover:text-primary">
              Home
            </Link>
          </li>
          <li aria-hidden className="text-border">
            /
          </li>
          <li aria-current="page" className="font-semibold text-primary">
            Tools
          </li>
        </ol>
      </nav>

      {/* Hero */}
      <header>
        <p className="mono-label">Search · No upload · 100% browser</p>
        <h1 className="mt-3 text-balance text-4xl font-extrabold tracking-tighter text-foreground sm:text-5xl lg:text-6xl">
          All{" "}
          <span className="bg-gradient-to-r from-primary via-emerald-400 to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
            file converters
          </span>{" "}
          in one place
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Every converter runs entirely in your browser with WebAssembly — your
          files are processed locally and never uploaded to a server. Search by
          name or format, or browse by category.
        </p>
      </header>

      {/*Search + group browsing (client interaction)*/}
      <Suspense fallback={null}>
        <ToolsExplorer tools={TOOLS} categories={CATEGORIES} />
      </Suspense>

      {/*Desktop CTA*/}
      <section className="mt-16">
        <div className="glass p-6 sm:p-8">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Need larger files or desktop-only formats?
              </h2>
              <p className="mt-2 max-w-xl leading-relaxed text-muted-foreground">
                The free desktop app handles unlimited file sizes, batch
                conversion, and formats the browser can&rsquo;t — like RAW to ISO.
              </p>
            </div>
            <Link
              href="/download"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:shadow-[0_0_18px_rgba(74,222,128,0.3)]"
            >
              <Download className="h-4 w-4" />
              Download Free App
            </Link>
          </div>
        </div>
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
