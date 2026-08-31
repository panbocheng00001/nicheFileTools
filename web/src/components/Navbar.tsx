"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, X, Download, Search, CornerDownLeft, ArrowUp, ArrowDown } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "@/lib/utils";
import { TOOLS } from "@/lib/tools-data";

const NAV = [
  { href: "/tools", label: "Tools" },
  { href: "/convert", label: "Guides" },
  { href: "/free-trial", label: "Unlock Code" },
  { href: "/help", label: "Help" },
  { href: "/about", label: "About" },
];

const MAX_RESULTS = 8;

function matchTool(t: (typeof TOOLS)[number], q: string) {
  const hay = [t.name, t.h1, t.slug, t.sourceFormat, t.targetFormat, t.sourceExt, t.targetExt, t.categoryLabel]
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

function SearchBox({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const q = value.trim().toLowerCase();

  const results = useMemo(() => {
    if (!q) return TOOLS.slice(0, MAX_RESULTS);
    return TOOLS.filter((t) => matchTool(t, q)).slice(0, MAX_RESULTS);
  }, [q]);

  //Click outside to close
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  //Reset highlighting when results change
  useEffect(() => {
    setActive(0);
  }, [value]);

  function go(slug: string) {
    onNavigate?.();
    setOpen(false);
    inputRef.current?.blur();
    router.push(`/tools/${slug}`);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[active]) go(results[active].slug);
      else if (q) router.push(`/tools?q=${encodeURIComponent(value.trim())}`);
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  return (
    <div ref={wrapRef} className="relative w-full max-w-xs">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search tools…"
        aria-label="Search tools"
        aria-expanded={open}
        aria-controls="search-results"
        className="h-9 w-full rounded-lg border border-border/60 bg-background/40 pl-9 pr-12 text-sm shadow-none backdrop-blur transition-colors focus-visible:border-primary/50 focus-visible:ring-0"
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded border border-border/60 bg-muted/50 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-muted-foreground sm:inline-flex">
        <span className="text-xs">⌘</span>K
      </kbd>

      {/*drop down results*/}
      {open && (
        <div
          id="search-results"
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-border/60 bg-background/95 shadow-xl backdrop-blur-xl"
        >
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No tools match “{value}”.
              <button
                type="button"
                onClick={() => {
                  onNavigate?.();
                  setOpen(false);
                  router.push(`/tools?q=${encodeURIComponent(value.trim())}`);
                }}
                className="mono-label mt-2 block !text-primary"
              >
                Browse all tools →
              </button>
            </div>
          ) : (
            <>
              <ul className="max-h-80 overflow-y-auto py-1">
                {results.map((t, i) => (
                  <li key={t.slug} role="option" aria-selected={i === active}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(t.slug)}
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors",
                        i === active ? "bg-primary/10" : "hover:bg-muted/60",
                      )}
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-border/50 bg-muted/40 font-mono text-[11px] font-bold uppercase text-primary">
                        {t.className}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-foreground">{t.h1}</span>
                        <span className="mono-label mt-0.5 block">
                          {t.categoryLabel} · {t.sourceExt} → {t.targetExt}
                        </span>
                      </span>
                      {i === active && (
                        <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between border-t border-border/50 px-3 py-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-2">
                  <span className="flex items-center gap-0.5">
                    <ArrowUp className="h-3 w-3" />
                    <ArrowDown className="h-3 w-3" />
                  </span>
                  navigate
                </span>
                <span className="flex items-center gap-1">
                  <CornerDownLeft className="h-3 w-3" /> open
                </span>
                <span className="flex items-center gap-1">
                  <span className="rounded border border-border/60 px-1 font-mono">esc</span> close
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function Navbar() {
  const [open, setOpen] = useState(false);

  //⌘K / Ctrl+K focuses the navigation bar search box
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const el = document.querySelector<HTMLInputElement>(
          'input[aria-label="Search tools"]',
        );
        el?.focus();
        el?.select();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-2xl">
      <nav className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        {/*Left: Logo*/}
        <Link href="/" className="group flex shrink-0 items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 font-mono text-sm font-bold text-primary">
            n
          </span>
          <span className="font-mono text-lg font-bold tracking-tighter text-foreground">
            niche<span className="text-primary">file</span>tools
          </span>
        </Link>

        {/*Center: Search box (desktop)*/}
        <div className="hidden flex-1 justify-center md:flex">
          <SearchBox />
        </div>

        {/*Desktop navigation*/}
        <ul className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <li key={n.href}>
              <Link
                href={n.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                {n.label}
              </Link>
            </li>
          ))}
        </ul>

        {/*Right: CTA + theme switch + burger*/}
        <div className="flex items-center gap-2">
          <Link
            href="/download"
            className="hidden items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground transition-all hover:shadow-[0_0_18px_rgba(74,222,128,0.3)] md:inline-flex"
          >
            <Download className="h-4 w-4" />
            Download
          </Link>
          <ThemeToggle />
          <button
            type="button"
            aria-label="Toggle menu"
            onClick={() => setOpen((v) => !v)}
            className="grid h-9 w-9 place-items-center rounded-lg border border-border/60 bg-background/60 text-foreground transition-colors hover:border-primary/50 hover:text-primary md:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </nav>

      {/*Mobile drawer*/}
      <div
        className={cn(
          "overflow-hidden border-t border-white/5 md:hidden",
          open ? "max-h-[28rem]" : "max-h-0",
          "transition-[max-height] duration-300 ease-in-out",
        )}
      >
        <div className="space-y-3 px-4 py-3">
          <SearchBox onNavigate={() => setOpen(false)} />
          <ul className="space-y-1">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
                >
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/download"
            onClick={() => setOpen(false)}
            className="block rounded-lg bg-primary px-3 py-2 text-center text-sm font-semibold text-primary-foreground"
          >
            Download Desktop
          </Link>
        </div>
      </div>
    </header>
  );
}
