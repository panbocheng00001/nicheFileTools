"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  X,
  ArrowRight,
  CornerDownLeft,
  LayoutGrid,
  List,
  BookOpen,
} from "lucide-react";
import type { ToolContent } from "@/lib/tools-data";
import { getGuide } from "@/lib/convert-content";
import type { CategoryMeta } from "@/lib/site";
import { cn } from "@/lib/utils";

interface Props {
  tools: ToolContent[];
  categories: CategoryMeta[];
}

// Documentation link for a tool: prefer the illustrated guide page when one
// exists, otherwise fall back to the tool page (which carries the FAQ).
function docHref(slug: string): string {
  return getGuide(slug) ? `/convert/${slug}` : `/tools/${slug}`;
}

type ViewMode = "cards" | "list";

export function ToolsExplorer({ tools, categories }: Props) {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<ViewMode>("cards");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [showAll, setShowAll] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  //Search from URL ?q= prefill (jump from navigation bar search box)
  useEffect(() => {
    const q = searchParams.get("q");
    if (q !== null) {
      setQuery(q);
      if (q) inputRef.current?.focus();
    }
  }, [searchParams]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      } else if (e.key === "Escape" && document.activeElement === inputRef.current) {
        setQuery("");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const normalized = query.trim().toLowerCase();
  const isSearching = normalized.length > 0;

  const filtered = useMemo(() => {
    if (!isSearching) return tools;
    return tools.filter((t) =>
      [t.name, t.h1, t.slug, t.sourceFormat, t.targetFormat, t.sourceExt, t.targetExt, t.categoryLabel, t.metaDescription, t.title]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [tools, normalized, isSearching]);

  const grouped = useMemo(() => {
    const map = new Map<string, ToolContent[]>();
    for (const c of categories) map.set(c.slug, []);
    for (const t of filtered) map.get(t.category)?.push(t);
    return categories.map((c) => ({ cat: c, items: map.get(c.slug) ?? [] })).filter((g) => g.items.length > 0);
  }, [filtered, categories]);

  const total = filtered.length;

  //Browsing state: Tool list filtered by category (default maximum 12 = 2 rows × 6 columns)
  const browseTools = useMemo(() => {
    if (catFilter === "all") return filtered;
    return filtered.filter((t) => t.category === catFilter);
  }, [filtered, catFilter]);
  const PREVIEW_LIMIT = 12;
  const browseVisible = showAll ? browseTools : browseTools.slice(0, PREVIEW_LIMIT);
  const browseHidden = browseTools.length - browseVisible.length;

  const flatRanked = useMemo(() => {
    if (!isSearching) return [];
    return [...filtered].sort((a, b) => {
      const an = a.name.toLowerCase().includes(normalized) ? 0 : 1;
      const bn = b.name.toLowerCase().includes(normalized) ? 0 : 1;
      return an - bn;
    });
  }, [filtered, isSearching, normalized]);

  function toggleCat(slug: string) {
    setCatFilter((v) => (v === slug ? "all" : slug));
    setShowAll(false);
  }

  return (
    <>
      {/*Search bar + view switch*/}
      <div className="mt-10">
        <div className="glass relative flex items-center gap-3 px-4 py-3">
          <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && flatRanked[0]) router.push(`/tools/${flatRanked[0].slug}`);
            }}
            placeholder={`Search ${tools.length} tools by name, format, or category…`}
            aria-label="Search tools"
            className="h-auto flex-1 border-0 bg-transparent px-0 py-0 text-base shadow-none focus-visible:ring-0 focus-visible:shadow-none"
          />
          {query ? (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          ) : (
            <kbd className="hidden shrink-0 items-center gap-0.5 rounded border border-border/60 bg-muted/50 px-1.5 py-1 font-mono text-[11px] font-semibold text-muted-foreground sm:inline-flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          )}
          {!isSearching && (
            <div role="group" aria-label="View mode" className="hidden shrink-0 items-center gap-1 rounded-lg border border-border/60 bg-muted/40 p-0.5 sm:flex">
              <button type="button" onClick={() => setView("cards")} aria-pressed={view === "cards"} aria-label="Card view" className={cn("grid h-7 w-7 place-items-center rounded-md transition-colors", view === "cards" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setView("list")} aria-pressed={view === "list"} aria-label="List view" className={cn("grid h-7 w-7 place-items-center rounded-md transition-colors", view === "list" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                <List className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
        <p className="mono-label mt-3">
          {isSearching ? `${total} match${total === 1 ? "" : "es"} for “${query}”` : `${total} tools · No upload · 100% browser`}
        </p>
      </div>

      {/*Empty state*/}
      {total === 0 && (
        <div className="glass mt-10 p-10 text-center">
          <p className="text-lg font-semibold text-foreground">No tools found</p>
          <p className="mt-2 text-sm text-muted-foreground">Try a different keyword, or browse by category.</p>
          <button type="button" onClick={() => setQuery("")} className="mono-label mt-5 inline-flex items-center gap-1.5 !text-primary">
            Clear search <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/*Search state: Flat result list*/}
      {isSearching && total > 0 && (
        <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {flatRanked.map((t) => (
            <li key={t.slug} className="relative">
              <Link href={`/tools/${t.slug}`} className="group flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-background/40 px-4 py-3 pr-9 backdrop-blur-sm transition-all hover:border-primary/50 hover:bg-background/60">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-foreground transition-colors group-hover:text-primary">{t.h1}</span>
                  <span className="mono-label mt-0.5 block">{t.categoryLabel} · {t.sourceExt} → {t.targetExt}</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
              <Link
                href={docHref(t.slug)}
                aria-label={`Guide for ${t.h1}`}
                title="View guide"
                className="absolute right-2 top-1/2 z-20 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md border border-border/50 bg-background/70 text-muted-foreground backdrop-blur transition-all hover:border-primary/50 hover:text-primary"
              >
                <BookOpen className="h-3.5 w-3.5" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/*Browsing state: Classification filter chips + 6 columns compact grid (default 12 in 2 rows)*/}
      {!isSearching && total > 0 && (
        <div className="mt-10">
          {/*Classification filter*/}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setCatFilter("all");
                setShowAll(false);
              }}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all",
                catFilter === "all"
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border/50 bg-background/40 text-muted-foreground hover:border-primary/50 hover:text-primary",
              )}
            >
              All
              <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground/70">{total}</span>
            </button>
            {grouped.map(({ cat, items }) => (
              <button
                key={cat.slug}
                type="button"
                onClick={() => toggleCat(cat.slug)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all",
                  catFilter === cat.slug
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border/50 bg-background/40 text-muted-foreground hover:border-primary/50 hover:text-primary",
                )}
              >
                {cat.label}
                <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground/70">{items.length}</span>
              </button>
            ))}
          </div>

          {/*tool grid*/}
          {view === "cards" ? (
            <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {browseVisible.map((t) => (
                <li key={t.slug} className="relative">
                  <Link
                    href={`/tools/${t.slug}`}
                    className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border/40 bg-background/40 p-4 backdrop-blur-sm transition-all hover:border-primary/50 hover:bg-background/60"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                    <div className="relative z-10 flex h-full flex-col">
                      <h3 className="pr-7 text-sm font-bold leading-tight tracking-tight text-foreground transition-colors group-hover:text-primary">
                        {t.h1}
                      </h3>
                      <p className="mono-label mt-2 block">{t.sourceExt} → {t.targetExt}</p>
                      <span className="mt-auto inline-flex w-fit items-center gap-1 pt-3">
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-primary">
                          {t.className}
                        </span>
                      </span>
                    </div>
                  </Link>
                  <Link
                    href={docHref(t.slug)}
                    aria-label={`Guide for ${t.h1}`}
                    title="View guide"
                    className="absolute right-2 top-2 z-20 grid h-7 w-7 place-items-center rounded-md border border-border/50 bg-background/70 text-muted-foreground/70 opacity-100 backdrop-blur transition-all hover:border-primary/50 hover:text-primary hover:opacity-100 focus-visible:opacity-100 group-hover:border-primary/50 group-hover:text-primary"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="mt-6 overflow-hidden rounded-xl border border-border/40">
              {browseVisible.map((t, i) => (
                <li key={t.slug} className={cn("relative border-b border-border/40 last:border-b-0", i % 2 === 1 && "bg-muted/20")}>
                  <Link href={`/tools/${t.slug}`} className="group grid grid-cols-12 items-center gap-2 px-4 py-2.5 pr-9 transition-colors hover:bg-primary/5">
                    <span className="col-span-12 truncate text-sm font-semibold text-foreground transition-colors group-hover:text-primary sm:col-span-5">{t.h1}</span>
                    <span className="mono-label col-span-6 sm:col-span-3">{t.sourceExt} → {t.targetExt}</span>
                    <span className="mono-label col-span-4 hidden sm:col-span-2 sm:block">{t.categoryLabel}</span>
                    <span className="col-span-2 justify-self-end">
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider text-primary">{t.className}</span>
                    </span>
                  </Link>
                  <Link
                    href={docHref(t.slug)}
                    aria-label={`Guide for ${t.h1}`}
                    title="View guide"
                    className="absolute right-2 top-1/2 z-20 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md border border-border/50 bg-background/70 text-muted-foreground backdrop-blur transition-all hover:border-primary/50 hover:text-primary"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {/*Expand more / Category hub entrance*/}
          {browseHidden > 0 ? (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="mono-label mt-5 inline-flex items-center gap-1.5 !text-primary"
            >
              {showAll ? "Show less" : `Show all ${browseTools.length} (${browseHidden} more)`}
              <ArrowRight className={cn("h-3.5 w-3.5 transition-transform", showAll && "rotate-90")} />
            </button>
          ) : (
            catFilter !== "all" && (
              <Link href={`/category/${catFilter}`} className="mono-label mt-5 inline-flex items-center gap-1.5 !text-primary">
                View {categories.find((c) => c.slug === catFilter)?.label} hub <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )
          )}
        </div>
      )}

      {isSearching && total > 0 && (
        <p className="mono-label mt-8 flex items-center gap-1.5">
          <CornerDownLeft className="h-3.5 w-3.5" /> Press Enter to open the first result
        </p>
      )}
    </>
  );
}
