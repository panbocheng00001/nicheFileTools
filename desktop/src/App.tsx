import { useCallback, useEffect, useMemo, useState } from "react";
import {
  listTools,
  licenseStatus,
  licenseStatusAll,
  isTauri,
  type LicenseInfo,
  type ToolMeta,
} from "./lib/tauri";
import { toToolDef, type ToolDef } from "./lib/tools-data";
import { formatRemaining, IS_DEV_SITE, siteOrigin } from "./lib/site";
import { ToolConverter } from "./components/ToolConverter";
import {
  SearchIcon,
  ShieldIcon,
  SunIcon,
  MoonIcon,
  AlertIcon,
  CheckIcon,
  LockIcon,
} from "./components/icons";

const CATEGORY_LABELS: Record<string, string> = {
  archive: "Archives",
  audio: "Audio",
  font: "Fonts",
  "3d": "3D Models",
  image: "Images",
  ebook: "E-books",
  data: "Data",
  game: "Game Assets",
  video: "Video",
};

function categoryLabel(cat: string): string {
  return CATEGORY_LABELS[cat] ?? (cat.charAt(0).toUpperCase() + cat.slice(1));
}

type Theme = "light" | "dark";

export default function App() {
  const [tools, setTools] = useState<ToolDef[]>([]);
  const [selected, setSelected] = useState<ToolDef | null>(null);
  /// slug -> unlock state. Filled in one round trip after the manifest loads.
  const [licenses, setLicenses] = useState<Record<string, LicenseInfo>>({});
  const [now, setNow] = useState(() => Date.now());
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  // Browser preview: vite dev server without the Rust backend. The tool list and
  // conversions are mocked so the UI can be laid out / styled.
  const previewMode = !isTauri();
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem("niche_theme") as Theme) || "light",
  );

  const refreshLicenses = useCallback((slugs: string[]) => {
    if (slugs.length === 0) return;
    licenseStatusAll(slugs)
      .then((list) =>
        setLicenses((prev) => {
          const next = { ...prev };
          for (const l of list) next[l.slug] = l;
          return next;
        }),
      )
      .catch(() => {});
  }, []);

  const refreshOne = useCallback((slug: string) => {
    licenseStatus(slug)
      .then((info) => setLicenses((prev) => ({ ...prev, [slug]: info })))
      .catch(() => {});
  }, []);

  const onLicenseChange = useCallback((info: LicenseInfo) => {
    setLicenses((prev) => ({ ...prev, [info.slug]: info }));
  }, []);

  useEffect(() => {
    listTools()
      .then((metas: ToolMeta[]) => {
        const defs = metas.map(toToolDef);
        setTools(defs);
        setSelected(defs[0] ?? null);
        refreshLicenses(defs.map((d) => d.slug));
      })
      .catch((e) => setLoadError(String(e)));
  }, [refreshLicenses]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("niche_theme", theme);
  }, [theme]);

  /// Drive every countdown from one clock. Only tick while something is
  /// unlocked, and re-read the backend the instant an unlock lapses.
  useEffect(() => {
    const unlocked = Object.values(licenses).filter((l) => l.unlocked);
    if (unlocked.length === 0) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      for (const l of unlocked) {
        if (l.expires_at <= t) refreshOne(l.slug);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [licenses, refreshOne]);

  // Filter by search query (name / slug / format), then group the matches.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tools;
    return tools.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        t.sourceFormat.toLowerCase().includes(q) ||
        t.targetFormat.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q),
    );
  }, [tools, query]);

  // Group tools by category for the sidebar (preserve first-seen order).
  const grouped = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, ToolDef[]>();
    for (const t of filtered) {
      const k = t.category || "other";
      if (!map.has(k)) {
        map.set(k, []);
        order.push(k);
      }
      map.get(k)!.push(t);
    }
    return order.map((k) => [k, map.get(k)!] as [string, ToolDef[]]);
  }, [filtered]);

  const unlockedCount = Object.values(licenses).filter((l) => l.unlocked).length;
  const activeLicense = selected ? licenses[selected.slug] ?? null : null;
  const activeRemaining = activeLicense?.unlocked
    ? Math.max(0, activeLicense.expires_at - now)
    : 0;
  const activeLow = activeLicense?.unlocked && activeRemaining < 5 * 60_000;

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-brand">
          <div className="brand-logo">
            <ShieldIcon size={21} />
          </div>
          <div className="brand-text">
            <h1>nichefiletools</h1>
            <p className="brand-tagline">
              Free file converter · 100% on your PC, no upload
            </p>
          </div>
        </div>
        <div className="topbar-actions">
          <span
            className={`license-pill${activeLicense?.unlocked ? " unlocked" : ""}${
              activeLow ? " low" : ""
            }`}
            title={
              activeLicense?.unlocked
                ? "This tool is unlocked until the code rotates"
                : "This tool is locked — copy the code from its page"
            }
          >
            <span className="dot" />
            {activeLicense?.unlocked ? (
              <>
                <CheckIcon size={12} /> Unlocked · {formatRemaining(activeRemaining)}
              </>
            ) : (
              <>
                <LockIcon size={12} /> Locked
              </>
            )}
          </span>
          <span className="license-pill total" title="Tools unlocked right now">
            {unlockedCount}/{tools.length || "…"}
          </span>
          <button
            className="icon-btn"
            title={theme === "dark" ? "Switch to light" : "Switch to dark"}
            aria-label="Toggle theme"
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </header>

      {previewMode && (
        <div className="preview-banner" role="status">
          <AlertIcon size={15} />
          <span>
            <strong>Browser preview mode.</strong> No Rust backend — the tool list
            comes from a snapshot of <code>tools.json</code>, unlock codes accept
            anything, and conversions are simulated. Run{" "}
            <code>npm run tauri dev</code> for the real thing.
            {IS_DEV_SITE && (
              <>
                {" "}
                Unlock links point at <code>{siteOrigin()}</code> — start the web
                app with <code>cd web &amp;&amp; npm run dev</code> to test the
                full copy-a-code flow locally.
              </>
            )}
          </span>
        </div>
      )}

      <div className="layout">
        <nav className="sidebar">
          <div className="sidebar-search-wrap">
            <input
              className="sidebar-search"
              type="search"
              placeholder="Search tools…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="sidebar-scroll">
            {loadError && <div className="sidebar-error">{loadError}</div>}
            {grouped.length === 0 && (
              <div className="sidebar-empty">No tools match “{query}”.</div>
            )}
            {grouped.map(([cat, items]) => (
              <div className="navgroup" key={cat}>
                <div className="navgroup-title">
                  <span>{categoryLabel(cat)}</span>
                  <span className="navgroup-count">{items.length}</span>
                </div>
                {items.map((t) => (
                  <button
                    key={t.slug}
                    className={`navitem ${selected?.slug === t.slug ? "active" : ""}`}
                    onClick={() => setSelected(t)}
                  >
                    <span className="navitem-main">
                      <span className="navitem-name">
                        {licenses[t.slug]?.unlocked ? (
                          <CheckIcon
                            size={12}
                            className="navitem-lock unlocked"
                            aria-label="Unlocked"
                          />
                        ) : (
                          <LockIcon
                            size={12}
                            className="navitem-lock"
                            aria-label="Locked"
                          />
                        )}
                        {t.name}
                      </span>
                      <span className="navitem-fmt">
                        {t.sourceFormat} → {t.targetFormat}
                      </span>
                    </span>
                    <span className={`class-pill ${t.className}`}>{t.className}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
          <div className="sidebar-footer">
            <ShieldIcon size={13} />
            Private · offline
          </div>
        </nav>

        <main className="content">
          <div className="content-inner">
            {selected ? (
              <ToolConverter
                tool={selected}
                license={activeLicense}
                now={now}
                onLicenseChange={onLicenseChange}
              />
            ) : (
              <div className="empty-state">
                {loadError ? "Failed to load tools." : "Loading tools…"}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
