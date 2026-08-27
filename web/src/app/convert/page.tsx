import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { CONVERT_GUIDES } from "@/lib/convert-content";
import { getTool } from "@/lib/tools-data";

export const metadata: Metadata = {
  title: "File Conversion Guides — Step-by-Step Tutorials",
  description:
    "Complete conversion guides for every nichefiletools format: method comparisons, desktop step-by-step tutorials, and fixes for common errors.",
  alternates: { canonical: "/convert" },
  robots: { index: true, follow: true },
};

export default function ConvertIndexPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <header>
        <p className="mono-label">Knowledge base</p>
        <h1 className="mt-3 text-balance text-4xl font-extrabold tracking-tighter text-foreground sm:text-5xl">
          Conversion{" "}
          <span className="bg-gradient-to-r from-primary via-emerald-400 to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
            guides
          </span>
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
          Every guide compares the honest options — online tool, desktop app,
          and native or third-party alternatives — then walks through the
          desktop steps and fixes the errors people actually hit.
        </p>
      </header>

      <ul className="mt-12 grid gap-5 sm:grid-cols-2">
        {CONVERT_GUIDES.map((g) => {
          const tool = getTool(g.slug)!;
          return (
            <li key={g.slug}>
              <Link
                href={`/convert/${g.slug}`}
                className="group flex h-full flex-col rounded-2xl border border-border/40 bg-background/40 p-6 backdrop-blur-sm transition-all hover:border-primary/50 hover:bg-background/60"
              >
                <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl border border-border/50 bg-muted/40 text-primary transition-transform duration-300 group-hover:scale-110">
                  <BookOpen className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
                  How to Convert {tool.sourceFormat} to {tool.targetFormat}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {g.methods.length} methods compared · desktop tutorial ·{" "}
                  {g.troubleshooting.length} common fixes
                </p>
                <span className="mono-label mt-auto flex items-center gap-1.5 pt-4 !text-primary">
                  Read the guide
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
