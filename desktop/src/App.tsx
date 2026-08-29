import { useEffect, useMemo, useState } from "react";
import { listTools, getQuota, type QuotaInfo, type ToolMeta } from "./lib/tauri";
import { toToolDef, type ToolDef } from "./lib/tools-data";
import { ToolConverter } from "./components/ToolConverter";
import { KeyReflowModal } from "./components/KeyReflowModal";
import { SearchIcon, ShieldIcon, SunIcon, MoonIcon } from "./components/icons";

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
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem("niche_theme") as Theme) || "light",
  );

  function refreshQuota() {
    getQuota()
      .then(setQuota)
      .catch(() => {});
  }

  useEffect(() => {
    refreshQuota();
    listTools()
      .then((metas: ToolMeta[]) => {
        const defs = metas.map(toToolDef);
        setTools(defs);
        setSelected(defs[0] ?? null);
      })
      .catch((e) => setLoadError(String(e)));
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("niche_theme", theme);
  }, [theme]);

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

  const quotaClass = quota
    ? quota.paid
      ? "paid"
      : quota.free_quota_remaining <= 0
        ? "low"
        : quota.free_quota_remaining <= 2
          ? "low"
          : ""
    : "";
  const quotaText = quota
    ? quota.paid
      ? "Paid license"
      : `${quota.free_quota_remaining} free left`
    : "—";

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
          <span className={`quota-pill ${quotaClass}`}>
            <span className="dot" />
            {quotaText}
          </span>
          <button className="btn small" onClick={() => setShowModal(true)}>
            Free unlock
          </button>
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
                      <span className="navitem-name">{t.name}</span>
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
                onQuotaExhausted={() => setShowModal(true)}
              />
            ) : (
              <div className="empty-state">
                {loadError ? "Failed to load tools." : "Loading tools…"}
              </div>
            )}
          </div>
        </main>
      </div>

      {showModal && (
        <KeyReflowModal
          onClose={() => {
            setShowModal(false);
            refreshQuota();
          }}
          onUnlocked={() => {
            setShowModal(false);
            refreshQuota();
          }}
        />
      )}
    </div>
  );
}
