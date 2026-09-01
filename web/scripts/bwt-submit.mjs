#!/usr/bin/env node
/**
 * Bing Webmaster Tools URL Submission (SEO spec §9.3 / appendix A).
 * BWT free quota ≈ 10 URLs/day — use ONLY for key new or refreshed pages,
 * never batch-blast the sitemap (that's what IndexNow is for).
 *
 * Usage:
 *   set BWT_API_KEY=...   (BWT → Settings → API access → API key)
 *   node scripts/bwt-submit.mjs https://nichefiletools.com/convert/kfx-to-epub
 *
 * Note: submitting via BWT also feeds Yahoo. Verify indexing afterwards in
 * BWT → URL Inspection (spec §9.2 dual-engine schema/indexing check).
 */
const API = "https://api.bing.com/webmaster/urlSubmission";

async function main() {
  const apiKey = process.env.BWT_API_KEY;
  const urls = process.argv.slice(2).filter((a) => /^https?:\/\//.test(a));
  if (!apiKey) {
    console.error("BWT_API_KEY env var is required (BWT → Settings → API access).");
    process.exit(1);
  }
  if (!urls.length) {
    console.error("Pass one or more absolute URLs to submit.");
    process.exit(1);
  }
  if (urls.length > 10) {
    console.warn("More than 10 URLs — BWT free quota is ~10/day; submitting the first 10 only.");
    urls.length = 10;
  }
  const res = await fetch(`${API}?apikey=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ siteUrl: new URL(urls[0]).origin, urlList: urls }),
  });
  console.log(`BWT submission → HTTP ${res.status}`);
  console.log(await res.text());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
