import Link from "next/link";
import {
  BookOpen,
  Box,
  Image as ImageIcon,
  Disc,
  Download,
  ArrowRight,
  Music,
  Type,
  Table,
  type LucideIcon,
} from "lucide-react";
import { TOOLS } from "@/lib/tools-data";
import { CATEGORIES } from "@/lib/site";

const CATEGORY: Record<
  string,
  { icon: LucideIcon; accent: string; label: string }
> = {
  ebook: { icon: BookOpen, accent: "emerald", label: "eBook" },
  "3d": { icon: Box, accent: "cyan", label: "3D / CAD" },
  image: { icon: ImageIcon, accent: "blue", label: "Image" },
  archive: { icon: Disc, accent: "purple", label: "Disc Image" },
  audio: { icon: Music, accent: "green", label: "Audio" },
  font: { icon: Type, accent: "yellow", label: "Font" },
  data: { icon: Table, accent: "red", label: "Data" },
};

export default function Home() {
  const tools = TOOLS;

  return (
    <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      {/* ===== Hero ===== */}
      <section className="relative text-center">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 backdrop-blur">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          <span className="mono-label">All {tools.length} tools live · 100% local</span>
        </div>

        <h1 className="mx-auto max-w-4xl text-balance text-5xl font-extrabold tracking-tighter text-foreground sm:text-6xl lg:text-7xl">
          Free{" "}
          <span className="bg-gradient-to-r from-primary via-emerald-400 to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient drop-shadow-[0_0_20px_rgba(74,222,128,0.25)]">
            file converters
          </span>{" "}
          that run in your browser
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-balance text-lg leading-relaxed text-muted-foreground">
          100% browser-based, private, and secure — your files are converted
          locally with WebAssembly and never uploaded to a server.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="#tools"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:shadow-[0_0_18px_rgba(74,222,128,0.3)]"
          >
            Browse tools
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/download"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/60 px-5 py-2.5 text-sm font-semibold text-foreground backdrop-blur transition-colors hover:border-primary/50 hover:text-primary"
          >
            <Download className="h-4 w-4" />
            Desktop app
          </Link>
        </div>
      </section>

      {/*===== Tool Matrix =====*/}
      <section id="tools" className="mt-20 scroll-mt-24">
        <div className="mb-8 flex items-center gap-4 border-b border-border/50 pb-4">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
            <Box className="h-5 w-5" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Conversion Tools
          </h2>
        </div>

        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((t) => {
            const cat = CATEGORY[t.category] ?? CATEGORY.ebook;
            const Icon = cat.icon;
            return (
              <li key={t.slug}>
                <Link
                  href={`/tools/${t.slug}`}
                  className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/40 bg-background/40 p-6 backdrop-blur-sm transition-all hover:border-primary/50 hover:bg-background/60"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  <div className="relative z-10 flex h-full flex-col">
                    <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl border border-border/50 bg-muted/40 text-primary transition-transform duration-300 group-hover:scale-110">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mb-1 text-xl font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
                      {t.h1}
                    </h3>
                    <p className="mt-auto pt-4 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                      {cat.label} · {t.sourceExt} → {t.targetExt} · class {t.className}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/*===== Category Navigation (Home Page → Category Hub → Tool Page, Internal Link Matrix §3.2.4) =====*/}
      <section aria-label="Browse by category" className="mt-10">
        <ul className="flex flex-wrap gap-2.5">
          {CATEGORIES.map((c) => {
            const cat = CATEGORY[c.slug] ?? CATEGORY.ebook;
            const Icon = cat.icon;
            return (
              <li key={c.slug}>
                <Link
                  href={`/category/${c.slug}`}
                  className="group inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/40 px-4 py-2 text-sm font-medium text-muted-foreground backdrop-blur transition-all hover:border-primary/50 hover:text-primary"
                >
                  <Icon className="h-4 w-4 text-primary" />
                  {c.label} converters
                  <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/*===== Desktop CTA =====*/}
      <section className="mt-12">
        <div className="glass p-6 sm:p-8">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Need larger files or desktop-only formats?
              </h2>
              <p className="mt-2 max-w-xl leading-relaxed text-muted-foreground">
                The free desktop app handles unlimited file sizes, batch
                conversion, and formats the browser can&rsquo;t — like RAW to ISO.
              </p>
            </div>
            <Link
              href="/download"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:shadow-[0_0_18px_rgba(74,222,128,0.3)]"
            >
              <Download className="h-4 w-4" />
              Download Free App
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
