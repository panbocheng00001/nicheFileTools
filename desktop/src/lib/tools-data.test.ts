import { describe, it, expect } from "vitest";
import { toToolDef } from "./tools-data";
import type { ToolMeta } from "./tauri";

const meta = (over: Partial<ToolMeta> = {}): ToolMeta => ({
  slug: "raw-to-iso",
  name: "RAW to ISO",
  class: "C",
  engines: ["rust-native"],
  source: [".raw", ".img"],
  target: ".iso",
  output_kind: "file",
  guide: null,
  category: "archive",
  web_slug: null,
  ...over,
});

describe("toToolDef", () => {
  it("maps the happy path", () => {
    const d = toToolDef(meta());
    expect(d.slug).toBe("raw-to-iso");
    expect(d.name).toBe("RAW to ISO");
    expect(d.className).toBe("C");
    expect(d.category).toBe("archive");
    expect(d.sourceExt).toBe(".raw");
    expect(d.sourceExts).toEqual([".raw", ".img"]);
    expect(d.targetExt).toBe(".iso");
    expect(d.outputKind).toBe("file");
  });

  it("derives uppercase format labels from the extensions", () => {
    const d = toToolDef(meta({ source: [".mts", ".m2ts"], target: ".mp4" }));
    expect(d.sourceFormat).toBe("MTS");
    expect(d.targetFormat).toBe("MP4");
  });

  it("falls back to class A for an unknown class", () => {
    // The UI renders a colour per class; an unrecognised value must not crash
    // into an undefined badge style.
    expect(toToolDef(meta({ class: "Z" })).className).toBe("A");
    expect(toToolDef(meta({ class: "" })).className).toBe("A");
  });

  it("falls back to the 'other' category when the manifest omits it", () => {
    expect(toToolDef(meta({ category: null })).category).toBe("other");
  });

  it("defaults outputKind to file", () => {
    expect(toToolDef(meta({ output_kind: "" })).outputKind).toBe("file");
  });

  it("keeps the snake_case output_kind sent by Rust (dir => WAD style output)", () => {
    expect(toToolDef(meta({ output_kind: "dir" })).outputKind).toBe("dir");
  });

  it("prefers the manifest guide as the description", () => {
    expect(toToolDef(meta({ guide: "Requires FFmpeg" })).description).toBe("Requires FFmpeg");
  });

  it("generates a description when there is no guide", () => {
    expect(toToolDef(meta({ guide: null })).description).toBe("Convert RAW to ISO.");
  });

  it("keeps every source extension for multi-ext tools", () => {
    const d = toToolDef(
      meta({ slug: "step-to-stl", source: [".step", ".stp", ".iges", ".igs", ".brep"] }),
    );
    expect(d.sourceExts).toHaveLength(5);
    expect(d.sourceExts).toContain(".stp");
  });

  it("falls back to the desktop slug when the web page matches", () => {
    expect(toToolDef(meta()).webSlug).toBe("raw-to-iso");
  });

  it("uses web_slug when the web catalogue names the tool differently", () => {
    // Desktop `step-to-stl` lives at /tools/prt-to-stl on the web; the "get the
    // code" link must follow the override or it 404s.
    const d = toToolDef(meta({ slug: "step-to-stl", web_slug: "prt-to-stl" }));
    expect(d.webSlug).toBe("prt-to-stl");
  });

  it("survives a tool with no source extensions", () => {
    const d = toToolDef(meta({ source: [] }));
    expect(d.sourceExt).toBe("");
    expect(d.sourceFormat).toBe("?");
    // Must still not throw when the UI builds filters from this.
    expect(Array.isArray(d.sourceExts)).toBe(true);
  });
});
