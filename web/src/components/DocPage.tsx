import Link from "next/link";

/**
 * 文档/合规页通用骨架 — 全站规范 §2.16
 * 统一 H1、更新日期（EEAT 时效信号）与正文排版。
 */
export function DocPage({
  eyebrow,
  title,
  updated = "2026-08-26",
  children,
}: {
  eyebrow: string;
  title: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <header className="mb-10">
        <p className="mono-label">{eyebrow}</p>
        <h1 className="mt-3 text-balance text-4xl font-extrabold tracking-tighter text-foreground">
          {title}
        </h1>
        <p className="mono-label mt-3">Last updated: {updated}</p>
      </header>
      <div className="seo-prose">{children}</div>
      <p className="mono-label mt-14">
        Questions?{" "}
        <Link href="/contact" className="text-primary hover:opacity-80">
          Contact us
        </Link>
      </p>
    </main>
  );
}
