import { useEffect, useMemo, useState } from "react";
import { listTools, getQuota, type QuotaInfo, type ToolMeta } from "./lib/tauri";
import { toToolDef, type ToolDef } from "./lib/tools-data";
import { ToolConverter } from "./components/ToolConverter";
import { KeyReflowModal } from "./components/KeyReflowModal";

export default function App() {
  const [tools, setTools] = useState<ToolDef[]>([]);
  const [selected, setSelected] = useState<ToolDef | null>(null);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");

  function refreshQuota() {
    getQuota().then(setQuota).catch(() => {});
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

  // Filter by search query (name / slug / format), then group the matches.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tools;
    return tools.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        t.sourceFormat.toLowerCase().includes(q) ||
        t.targetFormat.toLowerCase().includes(q),
    );
  }, [tools, query]);

  // Group tools by category for the sidebar.
  const grouped = useMemo(() => {
    const map = new Map<string, ToolDef[]>();
    for (const t of filtered) {
      const k = t.category || "other";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(t);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1>nichefiletools</h1>
          <p className="muted">Free file converter — runs 100% on your PC. Private, no upload.</p>
        </div>
        <div className="quota">
          <span>
            {quota
              ? quota.paid
                ? "Paid license"
                : `${quota.free_quota_remaining} free conversions left`
              : "—"}
          </span>
          <button className="btn small" onClick={() => setShowModal(true)}>
            Free unlock
          </button>
        </div>
      </header>

      <div className="layout">
        <nav className="sidebar">
          <input
            className="sidebar-search"
            type="search"
            placeholder="Search tools…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {loadError && <div className="sidebar-error">{loadError}</div>}
          {grouped.length === 0 && (
            <div className="sidebar-empty">No tools match “{query}”.</div>
          )}
          {grouped.map(([cat, items]) => (
            <div className="navgroup" key={cat}>
              <div className="navgroup-title">{cat}</div>
              {items.map((t) => (
                <button
                  key={t.slug}
                  className={`navitem ${selected?.slug === t.slug ? "active" : ""}`}
                  onClick={() => setSelected(t)}
                >
                  <span className="navitem-name">{t.name}</span>
                  <span className="badge">{t.className}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>
        <main className="content">
          {selected ? (
            <ToolConverter tool={selected} onQuotaExhausted={() => setShowModal(true)} />
          ) : (
            <div className="card">
              <p className="muted">Loading tools…</p>
            </div>
          )}
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
