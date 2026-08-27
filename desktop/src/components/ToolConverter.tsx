import { useState } from "react";
import type { ToolDef } from "../lib/tools-data";
import { pickInput, pickOutput, convertFile, type ConvertOutput } from "../lib/tauri";

export function ToolConverter({
  tool,
  onQuotaExhausted,
}: {
  tool: ToolDef;
  onQuotaExhausted: () => void;
}) {
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<ConvertOutput | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setError("");
    setResult(null);
    setStatus("");

    const input = await pickInput(tool.sourceExt);
    if (!input) return;
    const outName = input.replace(/\.[^.]+$/, tool.targetExt);
    const output = await pickOutput(outName);
    if (!output) return;

    setBusy(true);
    setStatus("Converting…");
    try {
      const out = await convertFile(tool.slug, input, output);
      setResult(out);
      setStatus("");
    } catch (e: any) {
      const msg: string = e?.message ?? (typeof e === "string" ? e : JSON.stringify(e));
      const code: string = e?.code ?? "";
      if (code === "quota_exhausted" || /quota exhausted/i.test(String(msg))) {
        onQuotaExhausted();
      }
      setError(msg);
      setStatus("");
    } finally {
      setBusy(false);
    }
  }

  const fileName = result ? result.output_path.split(/[\\/]/).pop() : "";

  return (
    <section className="card">
      <h2>{tool.name}</h2>
      <p className="muted">{tool.description}</p>
      <button className="btn primary" onClick={run} disabled={busy}>
        {busy ? "Converting…" : `Select ${tool.sourceExt} file`}
      </button>
      {status && <p className="status">{status}</p>}
      {error && <p className="error">{error}</p>}
      {result && (
        <p className="success">
          Done — {fileName} ({(result.size / 1024).toFixed(1)} KB)
        </p>
      )}
    </section>
  );
}
