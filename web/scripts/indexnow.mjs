#!/usr/bin/env node
/**
 * IndexNow ping (SEO spec §9.3 / release checklist appendix A).
 *
 * Prerequisite (one-time): the key file web/public/<KEY>.txt must be
 * deployed, so https://<host>/<KEY>.txt returns the key — engines verify
 * ownership against it. The key is read from that file; nothing is
 * hard-coded here.
 *
 * Usage:
 *   node scripts/indexnow.mjs https://nichefiletools.com/convert/kfx-to-epub [more urls...]
 *   node scripts/indexnow.mjs --sitemap            # submit every URL from the live sitemap.xml
 *   node scripts/indexnow.mjs --sitemap --host https://staging.example.com
 *
 * IndexNow covers Bing / Yandex / Naver / Seznam (one endpoint fans out to
 * all participating engines). Google is NOT part of IndexNow — for Google,
 * rely on sitemap <lastmod> + internal links, per spec.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(webRoot, "public");

// Key file is the single source of truth (public/<key>.txt).
const keyFile = readdirSync(publicDir).find(
  (f) => /^[0-9a-f]{32}\.txt$/i.test(f),
);
if (!keyFile) {
  console.error(
    "No IndexNow key file found in web/public/ (expected <32-hex>.txt). Generate one first.",
  );
  process.exit(1);
}
const key = keyFile.replace(/\.txt$/i, "");

const args = process.argv.slice(2);
let host = "https://nichefiletools.com";
const sitemapMode = args.includes("--sitemap");
const hostIdx = args.indexOf("--host");
if (hostIdx !== -1 && args[hostIdx + 1]) host = args[hostIdx + 1].replace(/\/$/, "");
const urls = args.filter((a) => !a.startsWith("--") && a !== (args[hostIdx + 1] ?? ""));

async function urlsFromSitemap() {
  const res = await fetch(`${host}/sitemap.xml`);
  if (!res.ok) throw new Error(`sitemap.xml fetch failed: ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

async function main() {
  const list = sitemapMode ? await urlsFromSitemap() : urls;
  if (!list.length) {
    console.error("No URLs to submit (pass URLs or --sitemap).");
    process.exit(1);
  }
  // IndexNow accepts up to 10,000 URLs per request; keep batches small.
  const BATCH = 500;
  for (let i = 0; i < list.length; i += BATCH) {
    const batch = list.slice(i, i + BATCH);
    const body = JSON.stringify({ host: host.replace(/^https?:\/\//, ""), key, keyLocation: `${host}/${key}.txt`, urlList: batch });
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body,
    });
    // 200 = OK, 202 = accepted (key check pending), 422 = key not valid yet.
    console.log(`IndexNow batch ${i / BATCH + 1}: ${batch.length} URLs → HTTP ${res.status}`);
    if (res.status >= 400) console.error(await res.text());
  }
  console.log(`Done — key ${key}, ${list.length} URL(s) submitted.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
