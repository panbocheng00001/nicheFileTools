import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

/**
 * robots.txt — 全站规范 §3.6
 * - 禁止 /api/（密钥回流接口，无 SEO 价值）
 * - 放行 CSS/JS/图片（Google 渲染与图片搜索必需）
 * - 声明 sitemap
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
