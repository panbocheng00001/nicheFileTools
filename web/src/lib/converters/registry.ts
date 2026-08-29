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
import { PfmToTtfConverter } from "./pfm-to-ttf";
import { ExrToPngConverter } from "./exr-to-png";
import { GsmToWavConverter } from "./gsm-to-wav";
import { MtsToMp4Converter } from "./mts-to-mp4";

// slug -> web converter. C-class tools (raw-to-iso, wad-extractor) have no web converter.
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
  "pfm-to-ttf": new PfmToTtfConverter(),
  "exr-to-png": new ExrToPngConverter(),
  "gsm-to-wav": new GsmToWavConverter(),
  "mts-to-mp4": new MtsToMp4Converter(),
  "wad-extractor": null,
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
