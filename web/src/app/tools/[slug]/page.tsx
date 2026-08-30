import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TOOLS, getTool } from "@/lib/tools-data";
const allSlugs = () => TOOLS.map((t) => t.slug);
const getToolContent = (slug: string) => getTool(slug);
import { softwareAppSchema, breadcrumbSchema, faqSchema } from "@/lib/schema";
import {
  Breadcrumbs,
  ToolHero,
  SeoContent,
  DesktopOnlyCta,
  RelatedTools,
  TrustCard,
  GuideCard,
} from "@/components/content";
import ToolConverter from "@/components/ToolConverter";
import { Share } from "@/components/Share";
import { DesktopCodeCard } from "@/components/DesktopCodeCard";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return allSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: Params): Promise<Metadata> {
  const { slug } = await params;
  const tool = getToolContent(slug);
  if (!tool) return {};
  return {
    title: tool.title,
    description: tool.metaDescription,
    alternates: { canonical: `/tools/${tool.slug}` },
    robots: { index: true, follow: true },
  };
}

export default async function ToolPage({ params }: Params) {
  const { slug } = await params;
  const tool = getToolContent(slug);
  if (!tool) notFound();

  const isDesktopOnly = tool.className === "C";

  const jsonLd: Record<string, unknown>[] = [
    breadcrumbSchema(tool),
    faqSchema(tool),
  ];
  if (!isDesktopOnly) jsonLd.unshift(softwareAppSchema(tool));

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-10 xl:grid-cols-12">
        {/*Left: 8 columns — Hero + Tools + SEO Long Article*/}
        <div className="xl:col-span-8">
          <Breadcrumbs tool={tool} />
          <ToolHero tool={tool} />
          <Share path={`/tools/${tool.slug}`} title={tool.h1} className="mt-5" />
          {isDesktopOnly ? (
            <DesktopOnlyCta tool={tool} />
          ) : (
            <ToolConverter tool={tool} />
          )}
          <SeoContent tool={tool} />
        </div>

        {/*Right: 4 columns — sticky sidebar*/}
        <aside className="xl:col-span-4">
          <div className="space-y-6 xl:sticky xl:top-24">
            <DesktopCodeCard slug={tool.slug} toolName={tool.name} />
            <GuideCard slug={tool.slug} />
            {/* Privacy card claims in-browser conversion — only show it for
                tools that actually convert in the browser (spec v1.3 §1.2). */}
            {!isDesktopOnly && <TrustCard />}
            <RelatedTools tool={tool} />
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
