import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

/**
* robots.txt — Site-wide specification §3.6
* - disable /api/ (defensive: the site currently ships no API routes at all,
*   but keeping the rule means any future endpoint stays out of the index)
* - Release CSS/JS/Images (required for Google rendering and image search)
* - declares sitemap
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
