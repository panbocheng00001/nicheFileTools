/**
 * Audit tool pages against SEO spec v1.3 (inferred from codebase + comments).
 * Run: node web/scripts/audit-tools-seo.mjs
 */
import { TOOLS } from "../src/lib/tools-data.ts";
import { getConverter } from "../src/lib/converters/registry.ts";
import { getGuide } from "../src/lib/convert-content.ts";

const issues = [];

function wc(s) {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

for (const t of TOOLS) {
  const conv = getConverter(t.slug);
  const guide = getGuide(t.slug);
  const webOnline = t.className !== "C" && t.webStatus !== "desktop";

  for (const f of ["title", "metaDescription", "h1", "whatIs", "whyConvert", "howTo"]) {
    if (!t[f]?.trim()) issues.push({ slug: t.slug, issue: `missing ${f}` });
  }

  if (!t.faqs || t.faqs.length < 4) {
    issues.push({ slug: t.slug, issue: `FAQ count ${t.faqs?.length ?? 0} (need ≥4)` });
  }

  if (!t.vs?.trim()) issues.push({ slug: t.slug, issue: "missing vs section" });

  if (!t.relatedTools || t.relatedTools.length < 3) {
    issues.push({ slug: t.slug, issue: `relatedTools ${t.relatedTools?.length ?? 0} (need ≥3)` });
  }

  if (t.title.length > 70) {
    issues.push({ slug: t.slug, issue: `title too long (${t.title.length} chars)` });
  }
  if (t.metaDescription.length > 160) {
    issues.push({ slug: t.slug, issue: `metaDescription too long (${t.metaDescription.length})` });
  }

  for (const [f, min] of [
    ["whatIs", 80],
    ["whyConvert", 60],
    ["howTo", 40],
  ]) {
    const w = wc(t[f]);
    if (w < min) issues.push({ slug: t.slug, issue: `${f} too short (${w} words, need ≥${min})` });
  }

  if (t.className === "C") {
    for (const f of ["desktopOnlyIntro", "whyDesktopOnly"]) {
      if (!t[f]?.trim()) issues.push({ slug: t.slug, issue: `C-class missing ${f}` });
    }
  }

  if (t.webStatus === "desktop") {
    if (t.webMaxFilePc !== 0) {
      issues.push({ slug: t.slug, issue: "webStatus=desktop but webMaxFilePc ≠ 0" });
    }
    if (/online tool|100% browser|drag it into the conversion area above|runs locally in your browser/i.test(`${t.howTo} ${t.metaDescription}`)) {
      issues.push({ slug: t.slug, issue: "webStatus=desktop but copy claims online conversion" });
    }
    if (/online/i.test(t.title)) {
      issues.push({ slug: t.slug, issue: "webStatus=desktop but title contains 'Online'" });
    }
  }

  if (webOnline && conv && !/Step 1|step 1/i.test(t.howTo)) {
    issues.push({ slug: t.slug, issue: "online tool howTo missing Step 1 format" });
  }

  if (!guide) issues.push({ slug: t.slug, issue: "missing /convert guide" });

  // Page render claim (tools/[slug]/page.tsx only checks className C, not webStatus)
  if (t.webStatus === "desktop" && t.className !== "C") {
    issues.push({ slug: t.slug, issue: "PAGE: still renders ToolConverter (should be desktop landing per §1.2)" });
  }

  // Stale FAQ copy
  if (t.slug === "prt-to-stl") {
    const bad = t.faqs.find((f) => /20\s*MB|web version/i.test(`${f.question} ${f.answer}`));
    if (bad) issues.push({ slug: t.slug, issue: `stale FAQ: "${bad.question}"` });
  }
  if (t.slug === "blend-to-glb") {
    const bad = t.faqs.find((f) => /30\s*MB|web version/i.test(`${f.question} ${f.answer}`));
    if (bad) issues.push({ slug: t.slug, issue: `stale FAQ: "${bad.question}"` });
  }
  if (t.slug === "kfx-to-epub" && guide?.methods?.some((m) => /online converter/i.test(m.name))) {
    issues.push({ slug: t.slug, issue: "guide methods still list 'online converter' (§1.2)" });
  }
}

const bySlug = {};
for (const i of issues) {
  (bySlug[i.slug] ??= []).push(i.issue);
}

console.log(`Tools: ${TOOLS.length}`);
console.log(`Issues: ${issues.length}\n`);
for (const t of TOOLS) {
  const list = bySlug[t.slug];
  const status = list ? "FAIL" : "PASS";
  console.log(`${status}  ${t.slug}  [${t.className}${t.webStatus === "desktop" ? ", desktop-landing" : ""}]`);
  if (list) list.forEach((x) => console.log(`       - ${x}`));
}

process.exit(issues.length ? 1 : 0);
