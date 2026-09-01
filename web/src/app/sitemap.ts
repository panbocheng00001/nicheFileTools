import type { MetadataRoute } from "next";
import { SITE, CATEGORIES } from "@/lib/site";
import { TOOLS } from "@/lib/tools-data";
import { CONVERT_GUIDES } from "@/lib/convert-content";

/**
* sitemap.xml — strategy doc §5.5 / desktop unlock doc §6.4
* Only clean static URLs are included; the site never emits parameterised
* links (no utm_*, no ?token=), so there is nothing to exclude.
*
* lastmod (release checklist appendix A / site spec §9.3):
*  - RELEASE date marks everything touched by the current release.
*  - /convert/[slug] entries take the guide's `updated` field, so content
*    refreshes (site spec §六 decay model) surface without touching this
*    file again.
*  - Pages that did not change keep their previous date — never bump
*    lastmod on unchanged URLs.
*/
const LASTMOD = new Date("2026-09-01");
const PREVIOUS = new Date("2026-08-26");

function entry(
  path: string,
  priority: number,
  lastModified: Date = LASTMOD,
): MetadataRoute.Sitemap[number] {
  return {
    url: `${SITE}${path}`,
    lastModified,
    changeFrequency: "weekly",
    priority,
  };
}

function guideLastmod(slug: string): Date {
  const g = CONVERT_GUIDES.find((x) => x.slug === slug);
  return g?.updated ? new Date(`${g.updated}T00:00:00Z`) : LASTMOD;
}

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    //front page
    entry("/", 1.0),
    //Tool page (main source of traffic; TDK/content updated this release)
    ...TOOLS.map((t) => entry(`/tools/${t.slug}`, 0.9)),
    //tutorial page (lastmod follows each guide's `updated` field)
    entry("/convert", 0.8),
    ...TOOLS.map((t) => entry(`/convert/${t.slug}`, 0.8, guideLastmod(t.slug))),
    //Classification Hub (unchanged this release)
    ...CATEGORIES.map((c) => entry(`/category/${c.slug}`, 0.7, PREVIOUS)),
    //Conversion closing
    entry("/download", 0.8),
    entry("/free-trial", 0.6, PREVIOUS),
    entry("/pricing", 0.7, PREVIOUS),
    entry("/license", 0.6),
    //EEAT/Compliance
    entry("/help", 0.6),
    entry("/help/engines", 0.6),
    entry("/about", 0.5, PREVIOUS),
    entry("/support", 0.5, PREVIOUS),
    entry("/contact", 0.4, PREVIOUS),
    entry("/privacy", 0.3, PREVIOUS),
    entry("/terms", 0.3, PREVIOUS),
    entry("/cookie", 0.3, PREVIOUS),
    entry("/copyright", 0.3, PREVIOUS),
  ];
}
