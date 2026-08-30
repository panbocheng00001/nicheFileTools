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
  const [companionFile, setCompanionFile] = useState<File | null>(null);
  const [siblingFiles, setSiblingFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [desktopMessage, setDesktopMessage] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [params, setParams] = useState<Record<string, string>>(() =>
    Object.fromEntries((tool.webOptions ?? []).map((o) => [o.key, o.default])),
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const inputRef2 = useRef<HTMLInputElement>(null);
  const accept = [tool.sourceExt, ...(tool.extraSourceExts ?? [])].join(",");
  const needsCompanion = tool.slug === "pfm-to-ttf";
  /**
   * An .opf is only a manifest — it always points at sibling resources
   * (XHTML/NCX), so it must be picked together with them, never alone.
   */
  const needsSiblings = tool.slug === "opf-to-epub";

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
    setCompanionFile(null);
    setSiblingFiles([]);
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
        pfbCompanion: companionFile ?? undefined,
        siblingFiles: siblingFiles.length ? siblingFiles : undefined,
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
      {/*stroke glow*/}
      <div className="pointer-events-none absolute -inset-0.5 -z-10 rounded-2xl bg-gradient-to-b from-primary/20 to-transparent opacity-20 blur" />

      {/*drag area*/}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const picked = Array.from(e.dataTransfer.files ?? []);
          handleFile(picked[0]);
          if (needsSiblings) setSiblingFiles(picked.slice(1));
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
          Select File{needsSiblings ? "s" : ""}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={needsSiblings}
          className="hidden"
          onChange={(e) => {
            const picked = Array.from(e.target.files ?? []);
            handleFile(picked[0]);
            if (needsSiblings) setSiblingFiles(picked.slice(1));
          }}
        />
        <p className="mono-label mt-4">
          Supports {[tool.sourceExt, ...(tool.extraSourceExts ?? [])].join(" /")}
          {/* webMaxFilePc === 0 means this converter cannot run on the web at all;
              "up to 0 MB on web" read as a broken limit, so state it outright. */}
          {overLimitMb > 0
            ? ` · up to ${overLimitMb} MB on web${
                tool.className === "B" ? " · larger files use the desktop app" : ""
              }`
            : " · not supported on the web — use the free desktop app"}
        </p>
        {needsSiblings && (
          <p className="mt-3 max-w-md text-xs leading-relaxed text-muted-foreground">
            Uploading a bare <span className="font-semibold text-foreground">.opf</span>?
            Select it together with every file it references (hold Ctrl/Cmd to pick several) —
            an OPF is only a manifest and has no content by itself. Zipping them first also works.
          </p>
        )}
      </div>

      {/*The second upload area of ​​PFM→TTF: supporting .pfb (including glyph outline)*/}
      {needsCompanion && file && !error && !desktopMessage && !result && (
        <div className="mt-4 rounded-xl border border-dashed border-border/70 p-4">
          <p className="mono-label mb-2">
            Companion <span className="font-semibold text-foreground">.pfb</span> file
            (glyph outlines) — required
          </p>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) setCompanionFile(f);
            }}
            className="flex flex-col items-center justify-center rounded-lg bg-muted/30 px-4 py-6 text-center"
          >
            <input
              ref={inputRef2}
              type="file"
              accept=".pfb"
              className="hidden"
              onChange={(e) => setCompanionFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => inputRef2.current?.click()}
              className="rounded-lg border border-border/60 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
            >
              {companionFile ? "Change .pfb" : "Select .pfb file"}
            </button>
            {companionFile && (
              <p className="mt-2 truncate font-mono text-sm text-foreground">
                {companionFile.name}
              </p>
            )}
          </div>
        </div>
      )}

      {/*Options panel (such as RAW→WAV sample rate/bit depth/channels)*/}
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

      {/*Selected files + Convert button*/}
      {file && !desktopMessage && !error && (!needsCompanion || companionFile) && (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="truncate font-mono text-sm text-foreground">
            {file.name}{" "}
            <span className="text-muted-foreground">
              ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </span>
            {siblingFiles.length > 0 && (
              <span className="text-muted-foreground">
                {" "}
                + {siblingFiles.length} resource file
                {siblingFiles.length === 1 ? "" : "s"}
              </span>
            )}
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
      {needsCompanion && file && !companionFile && !error && !desktopMessage && !result && (
        <p className="mt-3 text-sm text-muted-foreground">
          Please also provide the companion .pfb file above to enable conversion.
        </p>
      )}

      {/*progress bar*/}
      {converting && (
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
        </div>
      )}

      {/*Error (danger color)*/}
      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/*Desktop boot*/}
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

      {/*Result (success color)*/}
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
