import { IConverter } from "./interfaces";
import { TOOLS, getTool, type ToolContent } from "../tools-data";
import { KfxToEpubConverter } from "./kfx-to-epub";
import { PrtToStlConverter } from "./prt-to-stl";
import { PvrToPngConverter } from "./pvr-to-png";
import { BlendToGlbConverter } from "./blend-to-glb";
import { RawToWavConverter } from "./raw-to-wav";
import { GlbToGltfConverter } from "./glb-to-gltf";
import { EotToTtfConverter } from "./eot-to-ttf";
import { OpfToEpubConverter } from "./opf-to-epub";
import { SavToCsvConverter } from "./sav-to-csv";

// slug -> web converter. C-class tools (raw-to-iso) have no web converter.
const converters: Record<string, IConverter | null> = {
  "kfx-to-epub": new KfxToEpubConverter(),
  "prt-to-stl": new PrtToStlConverter(),
  "pvr-to-png": new PvrToPngConverter(),
  "raw-to-iso": null,
  "blend-to-glb": new BlendToGlbConverter(),
  "raw-to-wav": new RawToWavConverter(),
  "glb-to-gltf": new GlbToGltfConverter(),
  "eot-to-ttf": new EotToTtfConverter(),
  "opf-to-epub": new OpfToEpubConverter(),
  "sav-to-csv": new SavToCsvConverter(),
};

export function getConverter(slug: string): IConverter | null {
  return converters[slug] ?? null;
}

export function getToolContent(slug: string): ToolContent | undefined {
  return getTool(slug);
}

export function getAllTools(): ToolContent[] {
  return TOOLS;
}

export function allSlugs(): string[] {
  return TOOLS.map((t) => t.slug);
}
