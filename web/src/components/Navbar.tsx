"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, Download } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/tools", label: "Tools" },
  { href: "/convert", label: "Guides" },
  { href: "/download", label: "Desktop" },
  { href: "/free-trial", label: "Free Key" },
  { href: "/about", label: "About" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-2xl">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* 左：Logo */}
        <Link href="/" className="group flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 font-mono text-sm font-bold text-primary">
            n
          </span>
          <span className="font-mono text-lg font-bold tracking-tighter text-foreground">
            niche<span className="text-primary">file</span>tools
          </span>
        </Link>

        {/* 中：桌面导航 */}
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
          open ? "max-h-64" : "max-h-0",
          "transition-[max-height] duration-300 ease-in-out",
        )}
      >
        <ul className="space-y-1 px-4 py-3">
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
          <li>
            <Link
              href="/download"
              onClick={() => setOpen(false)}
              className="mt-1 block rounded-lg bg-primary px-3 py-2 text-center text-sm font-semibold text-primary-foreground"
            >
              Download Desktop
            </Link>
          </li>
        </ul>
      </div>
    </header>
  );
}
