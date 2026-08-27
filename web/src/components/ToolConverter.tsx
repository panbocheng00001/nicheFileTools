"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Upload, RotateCcw, AlertTriangle } from "lucide-react";
import type { ToolContent } from "@/lib/tools-data";
import { getConverter } from "@/lib/converters/registry";
import { DesktopRequiredError } from "@/lib/converters/interfaces";
import { cn } from "@/lib/utils";

interface Result {
  url: string;
  filename: string;
  size: number;
}

export default function ToolConverter({ tool }: { tool: ToolContent }) {
  const converter = getConverter(tool.slug);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [desktopMessage, setDesktopMessage] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [params, setParams] = useState<Record<string, string>>(() =>
    Object.fromEntries((tool.webOptions ?? []).map((o) => [o.key, o.default])),
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const accept = [tool.sourceExt, ...(tool.extraSourceExts ?? [])].join(",");

  useEffect(() => {
    return () => {
      if (result) URL.revokeObjectURL(result.url);
    };
  }, [result]);

  function reset() {
    if (result) URL.revokeObjectURL(result.url);
    setResult(null);
    setError(null);
    setDesktopMessage(null);
    setFile(null);
  }

  function handleFile(f: File | undefined) {
    if (!f) return;
    if (result) URL.revokeObjectURL(result.url);
    setResult(null);
    setError(null);
    setDesktopMessage(null);

    if (!converter) {
      setError("This tool is desktop-only.");
      setFile(f);
      return;
    }
    const v = converter.validate(f);
    if (!v.valid) {
      if (v.error && /desktop app/i.test(v.error)) {
        setDesktopMessage(v.error);
        setFile(f);
      } else {
        setError(v.error ?? "Unsupported file.");
        setFile(null);
      }
      return;
    }
    setFile(f);
  }

  async function runConversion() {
    if (!file || !converter) return;
    setConverting(true);
    setError(null);
    setDesktopMessage(null);
    try {
      const res = await converter.convert({
        inputFile: file,
        outputFormat: tool.targetExt,
        params,
      });
      const url = URL.createObjectURL(res.data);
      setResult({ url, filename: res.filename, size: res.size });
    } catch (e) {
      if (e instanceof DesktopRequiredError) {
        setDesktopMessage(e.message);
      } else {
        setError(
          e instanceof Error ? e.message : "Conversion failed. Please retry.",
        );
      }
    } finally {
      setConverting(false);
    }
  }

  const overLimitMb = Math.round(tool.webMaxFilePc / (1024 * 1024));

  return (
    <section
      aria-label="Conversion tool"
      className="relative overflow-hidden rounded-2xl border border-border/50 bg-background/60 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-md sm:p-6 lg:p-8"
    >
      {/* 描边光晕 */}
      <div className="pointer-events-none absolute -inset-0.5 -z-10 rounded-2xl bg-gradient-to-b from-primary/20 to-transparent opacity-20 blur" />

      {/* 拖拽区 */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFile(e.dataTransfer.files?.[0]);
        }}
        className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/70 px-6 py-10 text-center transition-colors hover:border-primary/50"
      >
        <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
          <Upload className="h-6 w-6" />
        </div>
        <p className="text-muted-foreground">
          Drag &amp; drop your{" "}
          <span className="font-semibold text-foreground">
            {tool.sourceExt}
          </span>{" "}
          file here, or
        </p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-4 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:shadow-[0_0_18px_rgba(74,222,128,0.3)]"
        >
          Select File
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <p className="mono-label mt-4">
          Supports {[tool.sourceExt, ...(tool.extraSourceExts ?? [])].join(" /")} · up to {overLimitMb} MB on web
          {tool.className === "B" && " · larger files use the desktop app"}
        </p>
      </div>

      {/* 选项面板（如 RAW→WAV 的采样率/位深/声道） */}
      {tool.webOptions && file && !error && !desktopMessage && !result && (
        <div className="mt-4 grid gap-3 rounded-xl border border-border/50 bg-muted/20 p-4 sm:grid-cols-3">
          {tool.webOptions.map((opt) => (
            <label key={opt.key} className="block">
              <span className="mono-label mb-1 block">{opt.label}</span>
              <select
                value={params[opt.key]}
                onChange={(e) =>
                  setParams((p) => ({ ...p, [opt.key]: e.target.value }))
                }
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                {opt.choices.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      )}

      {/* 已选文件 + 转换按钮 */}
      {file && !desktopMessage && !error && (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="truncate font-mono text-sm text-foreground">
            {file.name}{" "}
            <span className="text-muted-foreground">
              ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </span>
          </span>
          <button
            type="button"
            disabled={converting}
            onClick={runConversion}
            className="shrink-0 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:shadow-[0_0_18px_rgba(74,222,128,0.3)] disabled:opacity-60"
          >
            {converting ? "Converting…" : "Convert"}
          </button>
        </div>
      )}

      {/* 进度条 */}
      {converting && (
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
        </div>
      )}

      {/* 错误（危险色） */}
      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 桌面端引导 */}
      {desktopMessage && (
        <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-5">
          <p className="leading-relaxed text-foreground">{desktopMessage}</p>
          <Link
            href="/download"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:shadow-[0_0_18px_rgba(74,222,128,0.3)]"
          >
            Download Free Desktop App
          </Link>
        </div>
      )}

      {/* 结果（成功色） */}
      {result && (
        <div className="mt-4 rounded-xl border border-success/30 bg-success/10 p-5">
          <p className="text-sm text-foreground">
            Done —{" "}
            <span className="font-mono font-bold">{result.filename}</span>{" "}
            <span className="text-muted-foreground">
              ({(result.size / 1024).toFixed(1)} KB)
            </span>
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <a
              href={result.url}
              download={result.filename}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:shadow-[0_0_18px_rgba(74,222,128,0.3)]"
            >
              Download {tool.targetExt}
            </a>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
            >
              <RotateCcw className="h-4 w-4" />
              Convert another file
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
