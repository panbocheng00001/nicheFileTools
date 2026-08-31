import Link from "next/link";
import { ShieldCheck, FileQuestion, ArrowRight, MonitorSmartphone } from "lucide-react";
import type { ToolContent } from "@/lib/tools-data";
import { getTool, isDesktopLanding } from "@/lib/tools-data";
import { getGuide } from "@/lib/convert-content";
import { cn } from "@/lib/utils";

const card = "glass p-6 sm:p-8";

/*===== Breadcrumbs: mono uppercase =====*/
export function Breadcrumbs({ tool }: { tool: ToolContent }) {
  return (
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
        <li>{tool.categoryLabel}</li>
        <li aria-hidden className="text-border">
          /
        </li>
        <li aria-current="page" className="font-semibold text-primary">
          {tool.h1}
        </li>
      </ol>
    </nav>
  );
}

/*===== Tools Hero: gradient subject + mono badge =====*/
function ClassBadge({ tool }: { tool: ToolContent }) {
  if (isDesktopLanding(tool)) {
    return (
      <span className="inline-flex items-center rounded bg-destructive/20 px-1.5 py-0.5 font-mono text-xs font-bold uppercase tracking-wider text-destructive">
        Desktop app
      </span>
    );
  }
  const map: Record<string, { label: string; cls: string }> = {
    A: { label: "Online only", cls: "bg-primary/20 text-primary" },
    B: { label: "Online + Desktop", cls: "bg-cyan-500/20 text-cyan-400" },
    C: { label: "Desktop only", cls: "bg-destructive/20 text-destructive" },
  };
  const b = map[tool.className] ?? map.A;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 font-mono text-xs font-bold uppercase tracking-wider",
        b.cls,
      )}
    >
      {b.label}
    </span>
  );
}

export function ToolHero({ tool }: { tool: ToolContent }) {
  const desktopLanding = isDesktopLanding(tool);
  const parts = tool.h1.split(" ");
  const last = parts.pop() ?? "";
  const head = parts.join(" ");

  return (
    <header className="mb-8">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <ClassBadge tool={tool} />
        <span className="mono-label">{tool.sourceExt} → {tool.targetExt}</span>
      </div>
      <h1 className="text-balance text-3xl font-extrabold tracking-tighter text-foreground sm:text-4xl lg:text-5xl">
        {head}{" "}
        <span className="bg-gradient-to-r from-primary via-emerald-400 to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
          {last}
        </span>
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
        {desktopLanding
          ? (tool.desktopOnlyIntro ??
            "Free desktop application — this conversion is not available in the browser.")
          : "Free online tool. No upload — your files never leave your device."}
      </p>
      {!desktopLanding && (
        <p className="mono-label mt-2">
          {tool.className === "B"
            ? "Online & desktop available"
            : "100% browser-based · secure & private"}
        </p>
      )}
    </header>
  );
}

/*===== SEO Long Article Block =====*/
function Section({ title, body }: { title: string; body: string }) {
  return (
    <section>
      <h2>{title}</h2>
      <p>{body}</p>
    </section>
  );
}

export function SeoContent({ tool }: { tool: ToolContent }) {
  return (
    <div className="glass mt-12 p-6 sm:p-8">
      <div className="seo-prose">
        <Section
          title={`What Is a ${tool.sourceFormat} File?`}
          body={tool.whatIs}
        />
        <Section
          title={`Why Convert ${tool.sourceFormat} to ${tool.targetFormat}?`}
          body={tool.whyConvert}
        />
        <Section
          title={`How to Convert ${tool.sourceFormat} to ${tool.targetFormat}${
            isDesktopLanding(tool) ? " (Desktop)" : " Online Free"
          }`}
          body={tool.howTo}
        />
        {tool.vs && (
          <Section
            title={`${tool.sourceFormat} vs ${tool.targetFormat}: Key Differences`}
            body={tool.vs}
          />
        )}
        <FaqSection tool={tool} />
      </div>
    </div>
  );
}

export function FaqSection({ tool }: { tool: ToolContent }) {
  return (
    <section aria-labelledby="faq-heading" className="mt-10">
      <h2
        id="faq-heading"
        className="mb-4 flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground"
      >
        <FileQuestion className="h-5 w-5 text-primary" />
        Frequently Asked Questions
      </h2>
      <dl className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/50">
        {tool.faqs.map((f, i) => (
          <div key={i} className="grid grid-cols-[auto_1fr] gap-3 p-5">
            <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-primary/10 font-mono text-sm font-bold text-primary">
              Q
            </span>
            <div>
              <dt className="font-semibold text-foreground">{f.question}</dt>
              <dd className="mt-1.5 leading-relaxed text-muted-foreground">
                {f.answer}
              </dd>
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}

/*===== Tutorial entry card (sidebar, /tools ↔ /convert two-way interlinking) =====*/
export function GuideCard({ slug }: { slug: string }) {
  const guide = getGuide(slug);
  const tool = getTool(slug);
  if (!guide || !tool) return null;
  return (
    <Link
      href={`/convert/${slug}`}
      className="glass-panel group block p-5 transition-all hover:border-primary/50"
    >
      <span className="mono-label !text-primary">Complete guide</span>
      <p className="mt-2 font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
        How to convert {tool.sourceFormat} to {tool.targetFormat}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        Methods compared, {isDesktopLanding(tool) ? "desktop steps" : "step-by-step"},
        and fixes for common errors.
      </p>
      <span className="mt-3 inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-widest text-primary">
        Read guide
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
      </span>
    </Link>
  );
}

/*===== Related Tools (Sidebar) — varied anchor text (SEO spec §2.11) =====*/
function relatedAnchor(r: ToolContent, index: number): string {
  const variants = [
    r.h1,
    `${r.sourceFormat} to ${r.targetFormat}`,
    `Convert ${r.sourceExt} to ${r.targetExt}`,
  ];
  return variants[index % variants.length];
}

export function RelatedTools({ tool }: { tool: ToolContent }) {
  const related = tool.relatedTools
    .map((s) => getTool(s))
    .filter((t): t is ToolContent => Boolean(t));
  return (
    <section aria-labelledby="related-heading">
      <h2
        id="related-heading"
        className="mb-4 font-mono text-sm font-bold uppercase tracking-widest text-foreground"
      >
        Related Tools
      </h2>
      <ul className="space-y-3">
        {related.map((r, i) => (
          <li key={r.slug}>
            <Link
              href={`/tools/${r.slug}`}
              className="group flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-background/40 p-4 backdrop-blur-sm transition-all hover:border-primary/50 hover:bg-background/60"
            >
              <span>
                <span className="block font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
                  {relatedAnchor(r, i)}
                </span>
                <span className="mono-label mt-1 block">
                  {r.sourceExt} → {r.targetExt}
                </span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-primary" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/*===== Desktop-exclusive CTA (C-type tool) =====*/
export function DesktopOnlyCta({ tool }: { tool: ToolContent }) {
  return (
    <section className={`${card} border-primary/30`}>
      <div className="mb-3 inline-flex items-center gap-2">
        <MonitorSmartphone className="h-5 w-5 text-primary" />
        <span className="mono-label text-primary">Desktop required</span>
      </div>
      <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
        Download the Desktop App
      </h2>
      <p className="mt-2 leading-relaxed text-muted-foreground">
        {tool.whyDesktopOnly}
      </p>
      <Link
        href="/download"
        className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:shadow-[0_0_18px_rgba(74,222,128,0.3)]"
      >
        Download Free Desktop App
      </Link>
      <p className="mono-label mt-3">
        This {tool.sourceFormat} → {tool.targetFormat} conversion is not
        available as an online tool.
      </p>
    </section>
  );
}

/*===== Trust Card (Sidebar EEAT) =====*/
export function TrustCard() {
  return (
    <section className="glass-panel p-5">
      <div className="mb-3 flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <h2 className="font-mono text-sm font-bold uppercase tracking-widest text-foreground">
          100% Private
        </h2>
      </div>
      <ul className="space-y-2.5 text-sm leading-relaxed text-muted-foreground">
        <li className="flex gap-2">
          <span className="text-primary">▹</span> Files convert locally in your
          browser — never uploaded.
        </li>
        <li className="flex gap-2">
          <span className="text-primary">▹</span> No account, no tracking, no
          file retention.
        </li>
        <li className="flex gap-2">
          <span className="text-primary">▹</span> Open-source converters powered
          by WebAssembly.
        </li>
      </ul>
    </section>
  );
}
