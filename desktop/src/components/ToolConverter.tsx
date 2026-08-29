import { useEffect, useRef, useState } from "react";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import type { ToolDef } from "../lib/tools-data";
import { baseName, resolveOutputPath } from "../lib/paths";
import {
  convertBatch,
  onConvertProgress,
  engineStatus,
  openInBrowser,
  openFile,
  revealFile,
  pickOutputFolder,
  collectFiles,
  pauseBatch,
  resumeBatch,
  cancelBatch,
  type EngineStatus as EngineStatusT,
} from "../lib/tauri";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import type { UnlistenFn } from "@tauri-apps/api/event";
import {
  UploadCloudIcon,
  PlayIcon,
  PauseIcon,
  CheckIcon,
  AlertIcon,
  BanIcon,
  SpinnerIcon,
  FileIcon,
  ArrowRightIcon,
  FolderOpenIcon,
  TrashIcon,
  XIcon,
} from "./icons";

type ItemStatus = "queued" | "running" | "done" | "error" | "cancelled";

interface QueueItem {
  id: number;
  input: string;
  output: string;
  status: ItemStatus;
  size: number;
  bytesProcessed: number;
  bytesTotal: number;
  phase: string;
  error: string | null;
}

const fmtMB = (b: number) => `${(b / 1048576).toFixed(1)} MB`;
const fmtKB = (b: number) => `${(b / 1024).toFixed(1)} KB`;
const phaseLabel = (p: string) =>
  p ? p.charAt(0).toUpperCase() + p.slice(1) : "";

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
  const [paused, setPaused] = useState(false);
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
          addDroppedPaths(event.payload.paths);
        }
      })
      .then((u) => (unlisten = u))
      .catch(() => {});
    return () => {
      unlisten?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /// Resolve the output path for `input` given the current output mode.
  /// Delegates to the pure, unit-tested helper in `lib/paths.ts`.
  const resolveOutput = (input: string): string =>
    resolveOutputPath(input, toolRef.current, outMode, outFolder);

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
        bytesProcessed: 0,
        bytesTotal: 0,
        phase: "",
        error: null as string | null,
      })),
    ]);
  }

  /// Drag-drop entry point: a dropped path may be a directory. Ask the backend to
  /// recursively collect matching files (it handles both dirs and loose files).
  async function addDroppedPaths(paths: string[]) {
    if (!paths.length) return;
    const t = toolRef.current;
    const found = await collectFiles(paths, t.sourceExts);
    if (found.length) {
      addFiles(found);
    } else {
      setError(`No ${t.sourceExt} files found in the dropped item(s).`);
    }
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
    const found = await collectFiles([dir], t.sourceExts);
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

  // Pause / resume / cancel the in-flight batch. These call backend commands
  // that toggle shared atomic flags; the running batch loop observes them.
  async function pauseConversion() {
    try {
      await pauseBatch();
      setPaused(true);
    } catch {
      /* backend controls missing — ignore */
    }
  }
  async function resumeConversion() {
    try {
      await resumeBatch();
      setPaused(false);
    } catch {
      /* backend controls missing — ignore */
    }
  }
  async function cancelConversion() {
    try {
      await cancelBatch();
    } catch {
      /* backend controls missing — ignore */
    }
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
                  bytesProcessed: p.bytesProcessed,
                  bytesTotal: p.bytesTotal,
                  phase: p.phase,
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
          const status: ItemStatus = r.ok
            ? "done"
            : r.error === "Cancelled"
            ? "cancelled"
            : "error";
          return {
            ...it,
            output: r.outputPath,
            status,
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
      setPaused(false);
    }
  }

  const engineMissing = engine ? !engine.available : false;
  const done = queue.filter((i) => i.status === "done").length;
  const failed = queue.filter((i) => i.status === "error").length;
  const cancelled = queue.filter((i) => i.status === "cancelled").length;
  const completed = done + failed + cancelled;
  const pct = queue.length ? Math.round((completed / queue.length) * 100) : 0;
  const firstOutput = queue.find((i) => i.output)?.output ?? "";
  const openTarget = outMode === "folder" && outFolder ? outFolder : firstOutput;

  return (
    <section className="tool-card">
      <div className="tool-head">
        <div className="tool-title-row">
          <h1 className="tool-name">{tool.name}</h1>
          <span className={`class-badge ${tool.className}`}>Class {tool.className}</span>
        </div>
        <div className="format-flow">
          <span className="fmt-chip">{tool.sourceFormat}</span>
          <span className="arrow">
            <ArrowRightIcon size={16} />
          </span>
          <span className="fmt-chip target">{tool.targetFormat}</span>
        </div>
      </div>
      <p className="tool-desc">{tool.description}</p>

      {engineMissing && (
        <div className="engine-warn">
          <div className="engine-warn-title">
            <AlertIcon size={16} />
            This tool needs an external engine
          </div>
          <ul className="engine-list">
            {engine!.missing.map((m) => (
              <li className="engine-item" key={m.engine}>
                <span>{m.label}</span>
                <button className="btn tiny" onClick={() => openInBrowser(m.url)}>
                  Install
                </button>
              </li>
            ))}
          </ul>
          {engine!.guide && <p className="engine-guide">{engine!.guide}</p>}
          <button className="btn tiny ghost recheck-btn" onClick={recheckEngine}>
            Re-check after installing
          </button>
        </div>
      )}

      {tool.slug === "raw-to-wav" && (
        <div className="opts">
          <label className="opt-field">
            <span className="opt-label">Sample rate</span>
            <input
              type="number"
              value={sampleRate}
              onChange={(e) => setSampleRate(Number(e.target.value) || 44100)}
            />
          </label>
          <label className="opt-field">
            <span className="opt-label">Bits</span>
            <select value={bits} onChange={(e) => setBits(Number(e.target.value))}>
              <option value={8}>8</option>
              <option value={16}>16</option>
              <option value={24}>24</option>
              <option value={32}>32</option>
            </select>
          </label>
          <label className="opt-field">
            <span className="opt-label">Channels</span>
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
        <div className="output-control-title">Output destination</div>
        <div className="output-options">
          <label className={`radio-card ${outMode === "same" ? "active" : ""}`}>
            <input
              type="radio"
              name="outmode"
              checked={outMode === "same"}
              onChange={() => setOutMode("same")}
            />
            <span className="radio-dot" />
            <span className="radio-card-text">
              <span className="r-title">Same folder as source</span>
              <span className="r-sub">Each file next to its original</span>
            </span>
          </label>
          <label className={`radio-card ${outMode === "folder" ? "active" : ""}`}>
            <input
              type="radio"
              name="outmode"
              checked={outMode === "folder"}
              onChange={() => setOutMode("folder")}
            />
            <span className="radio-dot" />
            <span className="radio-card-text">
              <span className="r-title">Save to a folder</span>
              <span className="r-sub">Collect all outputs in one place</span>
            </span>
          </label>
        </div>
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
        tabIndex={0}
        role="button"
        aria-label="Add files to convert"
      >
        <div className="dropzone-icon">
          <UploadCloudIcon size={24} />
        </div>
        <div className="dropzone-title">Drop {tool.sourceExt} files here</div>
        <div className="dropzone-sub">
          or click to choose · drop a whole folder to batch it
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
            <span className="queue-count">
              {queue.length} file{queue.length > 1 ? "s" : ""} queued
            </span>
            <div className="queue-head-actions">
            {busy && (
              <>
                <span className="queue-pct">
                  {completed}/{queue.length} · {pct}%
                  {paused && <span className="queue-paused-tag">Paused</span>}
                </span>
                {!paused ? (
                  <button
                    className="btn tiny ghost"
                    onClick={pauseConversion}
                    title="Pause batch"
                  >
                    <PauseIcon size={13} /> Pause
                  </button>
                ) : (
                  <button
                    className="btn tiny ghost"
                    onClick={resumeConversion}
                    title="Resume batch"
                  >
                    <PlayIcon size={13} /> Resume
                  </button>
                )}
                <button
                  className="btn tiny danger"
                  onClick={cancelConversion}
                  title="Cancel batch"
                >
                  <XIcon size={13} /> Cancel
                </button>
              </>
            )}
            {!busy && (
              <button className="link" onClick={clearQueue}>
                <TrashIcon size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} />
                Clear all
              </button>
            )}
          </div>
          </div>
          <div className="progress">
            <div className="progress-bar" style={{ width: `${pct}%` }} />
          </div>
          <ul className="queue-list">
            {queue.map((it) => (
              <li key={it.id} className={`queue-item status-${it.status}`}>
                <span className="q-icon">
                  {it.status === "running" ? (
                    <SpinnerIcon size={15} className="q-spin" />
                  ) : it.status === "done" ? (
                    <CheckIcon size={15} />
                  ) : it.status === "error" ? (
                    <AlertIcon size={15} />
                  ) : it.status === "cancelled" ? (
                    <BanIcon size={15} />
                  ) : (
                    <FileIcon size={15} />
                  )}
                </span>
                <span className="q-info">
                  <span className="q-name" title={it.input}>
                    {baseName(it.input)}
                  </span>
                  {it.status === "queued" && <span className="q-sub">Queued</span>}
                  {it.status === "running" && (
                    <span className="q-sub">
                      {it.bytesTotal > 0
                        ? `${fmtMB(it.bytesProcessed)} / ${fmtMB(it.bytesTotal)}`
                        : phaseLabel(it.phase) || "Working…"}
                    </span>
                  )}
                  {it.status === "done" && (
                    <span className="q-sub">{fmtKB(it.size)} · Done</span>
                  )}
                  {it.status === "error" && (
                    <span className="q-sub error" title={it.error ?? ""}>
                      {it.error}
                    </span>
                  )}
                  {it.status === "cancelled" && (
                    <span className="q-sub cancelled">Cancelled</span>
                  )}
                </span>
                {it.status === "running" && (
                  <span
                    className="q-progress"
                    title={
                      it.bytesTotal > 0
                        ? `${fmtMB(it.bytesProcessed)} / ${fmtMB(it.bytesTotal)}`
                        : "Working…"
                    }
                  >
                    <span
                      className={`q-progress-bar${it.bytesTotal > 0 ? "" : " indeterminate"}`}
                      style={
                        it.bytesTotal > 0
                          ? {
                              width: `${Math.min(
                                100,
                                Math.round((it.bytesProcessed / it.bytesTotal) * 100),
                              )}%`,
                            }
                          : undefined
                      }
                    />
                  </span>
                )}
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
                    <XIcon size={15} />
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
          <PlayIcon size={15} />
          {busy ? "Converting…" : `Convert ${queue.length || ""} file(s)`.trim()}
        </button>
        {!busy && completed > 0 && openTarget && (
          <button className="btn" onClick={() => revealFile(openTarget)}>
            <FolderOpenIcon size={15} />
            Open output folder
          </button>
        )}
      </div>

      {status && <p className="status">{status}</p>}
      {error && <p className="error">{error}</p>}
      {!busy && completed > 0 && (
        cancelled > 0 ? (
          <div className="banner cancel-banner">
            <span>
              <BanIcon size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />
              Batch cancelled — <strong>{done}</strong> done
              {cancelled > 0 && (
                <>
                  , <strong>{cancelled}</strong> cancelled
                </>
              )}
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
        ) : (
          <div className="banner success-banner">
            <span>
              <CheckIcon size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />
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
        )
      )}
    </section>
  );
}
