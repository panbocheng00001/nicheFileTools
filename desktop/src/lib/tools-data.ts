import type { ToolMeta } from "./tauri";

export type ClassType = "A" | "B" | "C";

/// UI-facing tool model, derived from the backend manifest (single source of truth).
export interface ToolDef {
  slug: string;
  name: string;
  className: ClassType;
  category: string;
  sourceFormat: string;
  targetFormat: string;
  sourceExt: string;
  sourceExts: string[];
  targetExt: string;
  outputKind: string;
  description: string;
  engines: string[];
  /** Slug of the matching page on nichefiletools.com (differs for step-to-stl). */
  webSlug: string;
}

/// Map a backend `ToolMeta` to the UI `ToolDef`.
export function toToolDef(m: ToolMeta): ToolDef {
  const sourceExt = m.source[0] ?? "";
  const sourceFormat = sourceExt.replace(".", "").toUpperCase() || m.source[0] || "?";
  const targetFormat = m.target.replace(".", "").toUpperCase() || m.target.replace(".", "");
  return {
    slug: m.slug,
    name: m.name,
    className: (m.class === "A" || m.class === "B" || m.class === "C" ? m.class : "A") as ClassType,
    category: m.category ?? "other",
    sourceFormat,
    targetFormat,
    sourceExt,
    sourceExts: m.source.length ? m.source : [m.source[0] ?? ""],
    targetExt: m.target,
    outputKind: m.output_kind || "file",
    description: m.guide ?? `Convert ${sourceFormat} to ${targetFormat}.`,
    engines: m.engines,
    webSlug: m.web_slug || m.slug,
  };
}
