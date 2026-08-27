import type { MetadataRoute } from "next";
import { SITE, CATEGORIES } from "@/lib/site";
import { TOOLS } from "@/lib/tools-data";

/**
 * sitemap.xml — 战略文档 §5.5 / 密钥回流 doc §6.3
 * 只收录静态页面，绝不收录 token/utm 参数 URL。
 * lastmod 随内容更新（后续可接 git 日期或 CMS 字段）。
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
    // 首页
    entry("/", 1.0),
    // 工具页（流量主力）
    ...TOOLS.map((t) => entry(`/tools/${t.slug}`, 0.9)),
    // 教程页
    entry("/convert", 0.8),
    ...TOOLS.map((t) => entry(`/convert/${t.slug}`, 0.8)),
    // 分类 Hub
    ...CATEGORIES.map((c) => entry(`/category/${c.slug}`, 0.7)),
    // 转化收口
    entry("/download", 0.8),
    entry("/free-trial", 0.6),
    entry("/pricing", 0.7),
    entry("/license", 0.6),
    // EEAT / 合规
    entry("/about", 0.5),
    entry("/support", 0.5),
    entry("/contact", 0.4),
    entry("/privacy", 0.3),
    entry("/terms", 0.3),
    entry("/cookie", 0.3),
  ];
}
