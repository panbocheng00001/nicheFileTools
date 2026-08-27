import { useEffect, useState } from "react";
import { TOOLS, type ToolDef } from "./lib/tools-data";
import { getQuota, type QuotaInfo } from "./lib/tauri";
import { ToolConverter } from "./components/ToolConverter";
import { KeyReflowModal } from "./components/KeyReflowModal";

export default function App() {
  const [selected, setSelected] = useState<ToolDef>(TOOLS[0]);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [showModal, setShowModal] = useState(false);

  function refreshQuota() {
    getQuota().then(setQuota).catch(() => {});
  }

  useEffect(() => {
    refreshQuota();
  }, []);

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1>nichefiletools</h1>
          <p className="muted">Free file converter — runs 100% on your PC.</p>
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
          {TOOLS.map((t) => (
            <button
              key={t.slug}
              className={`navitem ${t.slug === selected.slug ? "active" : ""}`}
              onClick={() => setSelected(t)}
            >
              {t.name} <span className="badge">{t.className}</span>
            </button>
          ))}
        </nav>
        <main className="content">
          <ToolConverter
            tool={selected}
            onQuotaExhausted={() => setShowModal(true)}
          />
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
