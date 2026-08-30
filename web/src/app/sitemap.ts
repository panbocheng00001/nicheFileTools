import type { MetadataRoute } from "next";
import { SITE, CATEGORIES } from "@/lib/site";
import { TOOLS } from "@/lib/tools-data";

/**
* sitemap.xml — strategy doc §5.5 / desktop unlock doc §6.4
* Only clean static URLs are included; the site never emits parameterised
* links (no utm_*, no ?token=), so there is nothing to exclude.
* lastmod is updated with the content (the git date or CMS field can be connected later).
 */
const LASTMOD = new Date("2026-08-26");

function entry(path: string, priority: number): MetadataRoute.Sitemap[number] {
  return {
    url: `${SITE}${path}`,
    lastModified: LASTMOD,
    changeFrequency: "weekly",
    priority,
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    //front page
    entry("/", 1.0),
    //Tool page (main source of traffic)
    ...TOOLS.map((t) => entry(`/tools/${t.slug}`, 0.9)),
    //tutorial page
    entry("/convert", 0.8),
    ...TOOLS.map((t) => entry(`/convert/${t.slug}`, 0.8)),
    //Classification Hub
    ...CATEGORIES.map((c) => entry(`/category/${c.slug}`, 0.7)),
    //Conversion closing
    entry("/download", 0.8),
    entry("/free-trial", 0.6),
    entry("/pricing", 0.7),
    entry("/license", 0.6),
    //EEAT/Compliance
    entry("/about", 0.5),
    entry("/support", 0.5),
    entry("/contact", 0.4),
    entry("/privacy", 0.3),
    entry("/terms", 0.3),
    entry("/cookie", 0.3),
    entry("/copyright", 0.3),
  ];
}
