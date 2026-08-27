"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label="Toggle color theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative grid h-9 w-9 place-items-center rounded-lg border border-border/60 bg-background/60 text-foreground transition-colors hover:border-primary/50 hover:text-primary"
    >
      {/* 避免水合闪烁：挂载前渲染占位 */}
      {!mounted ? (
        <span className="h-4 w-4" />
      ) : isDark ? (
        <Sun className="h-4 w-4 transition-transform duration-300 hover:rotate-90" />
      ) : (
        <Moon className="h-4 w-4 transition-transform duration-300 hover:rotate-90" />
      )}
    </button>
  );
}
