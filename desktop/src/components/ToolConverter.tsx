import { useEffect, useRef, useState } from "react";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import type { ToolDef } from "../lib/tools-data";
import {
  convertBatch,
  onConvertProgress,
  engineStatus,
  openInBrowser,
  openFile,
  revealFile,
  pickOutputFolder,
  collectFiles,
  type EngineStatus as EngineStatusT,
} from "../lib/tauri";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import type { UnlistenFn } from "@tauri-apps/api/event";

type ItemStatus = "queued" | "running" | "done" | "error";

interface QueueItem {
  id: number;
  input: string;
  output: string;
  status: ItemStatus;
  size: number;
  error: string | null;
}

const LS_MODE = "niche_out_mode";
const LS_FOLDER = "niche_out_folder";

export function ToolConverter({
  tool,
  onQuotaExhausted,
}: {
  tool: ToolDef;
  onQuotaExhausted: () => void;
}) {
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [engine, setEngine] = useState<EngineStatusT | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [dragOver, setDragOver] = useState(false);

  // Output destination: "same" (next to source) or "folder" (user-chosen dir).
  const [outMode, setOutMode] = useState<"same" | "folder">(
    () => (localStorage.getItem(LS_MODE) as "same" | "folder") || "same",
  );
  const [outFolder, setOutFolder] = useState<string>(
    () => localStorage.getItem(LS_FOLDER) || "",
  );

  // RAW→WAV optional transcoding parameters (applied to the whole batch).
  const [sampleRate, setSampleRate] = useState(44100);
  const [bits, setBits] = useState(16);
  const [channels, setChannels] = useState(1);

  const idRef = useRef(0);
  const toolRef = useRef(tool);
  toolRef.current = tool;

  useEffect(() => {
    setQueue([]);
    setError("");
    setStatus("");
    engineStatus(tool.slug)
      .then(setEngine)
      .catch(() => setEngine(null));
  }, [tool.slug]);

  // Persist output preferences.
  useEffect(() => {
    localStorage.setItem(LS_MODE, outMode);
  }, [outMode]);
  useEffect(() => {
    localStorage.setItem(LS_FOLDER, outFolder);
  }, [outFolder]);

  // Drag & drop real file paths via the Tauri webview API.
  useEffect(() => {
    let unlisten: UnlistenFn | undefined;
    getCurrentWebview()
      .onDragDropEvent((event) => {
        if (event.payload.type === "enter" || event.payload.type === "over") {
          setDragOver(true);
        } else if (event.payload.type === "leave") {
          setDragOver(false);
        } else if (event.payload.type === "drop") {
          setDragOver(false);
          addFiles(event.payload.paths);
        }
      })
      .then((u) => (unlisten = u))
      .catch(() => {});
    return () => {
      unlisten?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const baseName = (p: string) => p.split(/[\\/]/).pop() || p;

  /// Resolve the output path for `input` given the current output mode.
  const resolveOutput = (input: string): string => {
    const t = toolRef.current;
    const stem = input.replace(/\.[^.]+$/, "");
    if (outMode === "folder" && outFolder) {
      const base = baseName(input);
      const clean = outFolder.replace(/[\\/]+$/, "");
      if (t.outputKind === "dir") {
        return `${clean}/${base.replace(/\.[^.]+$/, "")}`;
      }
      return `${clean}/${base.replace(/\.[^.]+$/, t.targetExt)}`;
    }
    if (t.outputKind === "dir") return stem;
    return input.replace(/\.[^.]+$/, t.targetExt);
  };

  function addFiles(paths: string[]) {
    const t = toolRef.current;
    const accepted = t.sourceExts.map((e) => e.toLowerCase());
    const filtered = paths.filter((p) =>
      accepted.some((ext) => p.toLowerCase().endsWith(ext)),
    );
    if (filtered.length === 0) return;
    setQueue((q) => [
      ...q,
      ...filtered.map((input) => ({
        id: idRef.current++,
        input,
        output: "",
        status: "queued" as ItemStatus,
        size: 0,
        error: null as string | null,
      })),
    ]);
  }

  async function pickFiles() {
    const t = toolRef.current;
    const filters = t.sourceExts.map((ext) => ({
      name: ext.replace(".", "").toUpperCase(),
      extensions: [ext.replace(".", "")],
    }));
    const res = await openDialog({ multiple: true, filters });
    const paths = Array.isArray(res) ? res : res ? [res] : [];
    if (paths.length) addFiles(paths);
  }

  // "Add folder": recursively pull every matching file from a directory.
  async function pickFolder() {
    const t = toolRef.current;
    const res = await openDialog({ directory: true, multiple: false });
    const dir = typeof res === "string" ? res : null;
    if (!dir) return;
    const found = await collectFiles(dir, t.sourceExts);
    if (found.length) addFiles(found);
    else setError(`No ${t.sourceExt} files found in that folder.`);
  }

  async function chooseOutFolder() {
    const dir = await pickOutputFolder();
    if (dir) {
      setOutFolder(dir);
      setOutMode("folder");
    }
  }

  function removeItem(id: number) {
    setQueue((q) => q.filter((it) => it.id !== id));
  }

  function clearQueue() {
    setQueue([]);
    setError("");
    setStatus("");
  }

  function recheckEngine() {
    setEngine(null);
    engineStatus(toolRef.current.slug)
      .then(setEngine)
      .catch(() => setEngine(null));
  }

  async function runBatch() {
    if (queue.length === 0 || busy) return;
    setError("");
    setBusy(true);
    setStatus(`Converting ${queue.length} file(s)…`);
    setQueue((q) =>
      q.map((it) => ({ ...it, status: "queued", error: null, size: 0 })),
    );

    const t = toolRef.current;
    const opts =
      t.slug === "raw-to-wav"
        ? { sample_rate: sampleRate, bits, channels }
        : undefined;
    const items = queue.map((it) => ({
      slug: t.slug,
      inputPath: it.input,
      outputPath: resolveOutput(it.input),
      options: opts,
    }));

    let unlisten: UnlistenFn | undefined;
    try {
      unlisten = await onConvertProgress((p) => {
        setQueue((q) =>
          q.map((it, idx) =>
            idx === p.index
              ? {
                  ...it,
                  output: items[idx]?.outputPath ?? it.output,
                  status: p.status as ItemStatus,
                  size: p.size,
                  error: p.error,
                }
              : it,
          ),
        );
      });
      const results = await convertBatch(items);
      // Reconcile final state from results (authoritative ok/size/error/output).
      setQueue((q) =>
        q.map((it, idx) => {
          const r = results[idx];
          if (!r) return it;
          return {
            ...it,
            output: r.outputPath,
            status: r.ok ? "done" : "error",
            size: r.size,
            error: r.error,
          };
        }),
      );
      setStatus("");
    } catch (e: any) {
      const msg: string = e?.message ?? (typeof e === "string" ? e : JSON.stringify(e));
      if (/quota exhausted/i.test(String(msg))) {
        onQuotaExhausted();
      }
      setError(msg);
      setStatus("");
    } finally {
      unlisten?.();
      setBusy(false);
    }
  }

  const engineMissing = engine ? !engine.available : false;
  const done = queue.filter((i) => i.status === "done").length;
  const failed = queue.filter((i) => i.status === "error").length;
  const completed = done + failed;
  const pct = queue.length ? Math.round((completed / queue.length) * 100) : 0;
  const firstOutput = queue.find((i) => i.output)?.output ?? "";
  const openTarget =
    outMode === "folder" && outFolder ? outFolder : firstOutput;

  return (
    <section className="card">
      <div className="card-head">
        <h2>{tool.name}</h2>
        <span className={`badge badge-${tool.className}`}>{tool.className}</span>
      </div>
      <p className="muted">
        {tool.sourceFormat} → {tool.targetFormat}
      </p>
      <p className="desc">{tool.description}</p>

      {engineMissing && (
        <div className="engine-warn">
          <div className="engine-warn-title">
            This tool needs an external engine
          </div>
          <ul className="engine-list">
            {engine!.missing.map((m) => (
              <li key={m.engine}>
                <span>{m.label}</span>
                <button className="btn tiny" onClick={() => openInBrowser(m.url)}>
                  Install
                </button>
              </li>
            ))}
          </ul>
          {engine!.guide && <p className="engine-guide">{engine!.guide}</p>}
          <button className="btn tiny ghost" onClick={recheckEngine}>
            Re-check after installing
          </button>
        </div>
      )}

      {tool.slug === "raw-to-wav" && (
        <div className="opts">
          <label>
            Sample rate
            <input
              type="number"
              value={sampleRate}
              onChange={(e) => setSampleRate(Number(e.target.value) || 44100)}
            />
          </label>
          <label>
            Bits
            <select value={bits} onChange={(e) => setBits(Number(e.target.value))}>
              <option value={8}>8</option>
              <option value={16}>16</option>
              <option value={24}>24</option>
              <option value={32}>32</option>
            </select>
          </label>
          <label>
            Channels
            <input
              type="number"
              min={1}
              value={channels}
              onChange={(e) => setChannels(Math.max(1, Number(e.target.value) || 1))}
            />
          </label>
        </div>
      )}

      {/* Output destination control */}
      <div className="output-control">
        <div className="output-control-title">Output</div>
        <label className="radio">
          <input
            type="radio"
            name="outmode"
            checked={outMode === "same"}
            onChange={() => setOutMode("same")}
          />
          Same folder as source
        </label>
        <label className="radio">
          <input
            type="radio"
            name="outmode"
            checked={outMode === "folder"}
            onChange={() => setOutMode("folder")}
          />
          Save to folder
        </label>
        {outMode === "folder" && (
          <div className="output-folder">
            <button className="btn tiny" onClick={chooseOutFolder}>
              Choose…
            </button>
            <span className="output-folder-path" title={outFolder}>
              {outFolder || "No folder chosen yet"}
            </span>
          </div>
        )}
      </div>

      {/* Dropzone + multi-select + add folder */}
      <div
        className={`dropzone ${dragOver ? "drag-over" : ""}`}
        onClick={pickFiles}
        onDragOver={(e) => e.preventDefault()}
      >
        <div className="dropzone-title">Drop {tool.sourceExt} files here</div>
        <div className="dropzone-sub">
          or click to choose (multiple supported)
        </div>
        <div className="dropzone-actions">
          <button
            className="btn tiny"
            onClick={(e) => {
              e.stopPropagation();
              pickFiles();
            }}
          >
            Choose files
          </button>
          <button
            className="btn tiny"
            onClick={(e) => {
              e.stopPropagation();
              pickFolder();
            }}
          >
            Add whole folder
          </button>
        </div>
      </div>

      {queue.length > 0 && (
        <div className="queue">
          <div className="queue-head">
            <span>{queue.length} file(s) queued</span>
            <div className="queue-head-actions">
              {!busy && (
                <button className="link" onClick={clearQueue}>
                  Clear all
                </button>
              )}
              {busy && (
                <span className="queue-pct">
                  {completed}/{queue.length} · {pct}%
                </span>
              )}
            </div>
          </div>
          <div className="progress">
            <div className="progress-bar" style={{ width: `${pct}%` }} />
          </div>
          <ul className="queue-list">
            {queue.map((it) => (
              <li key={it.id} className={`queue-item status-${it.status}`}>
                <span className={`q-badge q-${it.status}`}>{it.status}</span>
                <span className="q-name" title={it.input}>
                  {baseName(it.input)}
                </span>
                <span className="q-meta">
                  {it.status === "done" && `${(it.size / 1024).toFixed(1)} KB`}
                  {it.status === "error" && (
                    <span className="q-err" title={it.error ?? ""}>
                      {it.error}
                    </span>
                  )}
                </span>
                {it.status === "done" && it.output && (
                  <span className="q-actions">
                    {tool.outputKind !== "dir" && (
                      <button
                        className="btn tiny ghost"
                        title="Open output"
                        onClick={() => openFile(it.output)}
                      >
                        Open
                      </button>
                    )}
                    <button
                      className="btn tiny ghost"
                      title="Reveal in folder"
                      onClick={() => revealFile(it.output)}
                    >
                      Reveal
                    </button>
                  </span>
                )}
                {!busy && (
                  <button
                    className="q-remove"
                    title="Remove"
                    onClick={() => removeItem(it.id)}
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="row">
        <button
          className="btn primary"
          onClick={runBatch}
          disabled={busy || engineMissing || queue.length === 0}
          title={
            engineMissing
              ? "Install the required engine first"
              : queue.length === 0
                ? "Add files first"
                : ""
          }
        >
          {busy ? "Converting…" : `Convert ${queue.length || ""} file(s)`.trim()}
        </button>
        {!busy && completed > 0 && openTarget && (
          <button className="btn" onClick={() => revealFile(openTarget)}>
            Open output folder
          </button>
        )}
      </div>

      {status && <p className="status">{status}</p>}
      {error && <p className="error">{error}</p>}
      {!busy && completed > 0 && (
        <div className="banner success-banner">
          <span>
            Batch complete — <strong>{done}</strong> done
            {failed > 0 && (
              <>
                , <strong>{failed}</strong> failed
              </>
            )}
          </span>
          {openTarget && (
            <button className="btn tiny" onClick={() => revealFile(openTarget)}>
              Open output folder
            </button>
          )}
        </div>
      )}
    </section>
  );
}
