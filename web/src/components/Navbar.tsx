"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Menu, X, Download, Search } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/tools", label: "Tools" },
  { href: "/convert", label: "Guides" },
  { href: "/download", label: "Desktop" },
  { href: "/free-trial", label: "Free Key" },
  { href: "/about", label: "About" },
];

function SearchBox({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");

  // 同步 URL 中的 q（从 /tools 页返回时保持一致）
  useEffect(() => {
    if (pathname === "/tools") {
      setValue(searchParams.get("q") ?? "");
    }
  }, [pathname, searchParams]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    onNavigate?.();
    if (q) {
      router.push(`/tools?q=${encodeURIComponent(q)}`);
      inputRef.current?.blur();
    } else {
      router.push("/tools");
    }
  }

  return (
    <form onSubmit={submit} role="search" className="relative flex-1 max-w-xs">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search tools…"
        aria-label="Search tools"
        className="h-9 w-full rounded-lg border border-border/60 bg-background/40 pl-9 pr-12 text-sm shadow-none backdrop-blur transition-colors focus-visible:border-primary/50 focus-visible:ring-0"
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded border border-border/60 bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground sm:inline-flex">
        <span className="text-[11px]">⌘</span>K
      </kbd>
    </form>
  );
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl+K 聚焦导航栏搜索框
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const el = document.querySelector<HTMLInputElement>(
          'form[role="search"] input[type="search"]',
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
        {/* 左：Logo */}
        <Link href="/" className="group flex shrink-0 items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 font-mono text-sm font-bold text-primary">
            n
          </span>
          <span className="font-mono text-lg font-bold tracking-tighter text-foreground">
            niche<span className="text-primary">file</span>tools
          </span>
        </Link>

        {/* 中：搜索框（桌面） */}
        <div className="hidden flex-1 justify-center md:flex">
          <SearchBox />
        </div>

        {/* 桌面导航 */}
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

        {/* 右：CTA + 主题切换 + 汉堡 */}
        <div className="flex items-center gap-2">
          <Link
            href="/download"
            className="hidden items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground transition-all hover:shadow-[0_0_18px_rgba(74,222,128,0.3)] sm:inline-flex"
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

      {/* 移动端抽屉 */}
      <div
        className={cn(
          "overflow-hidden border-t border-white/5 md:hidden",
          open ? "max-h-96" : "max-h-0",
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
