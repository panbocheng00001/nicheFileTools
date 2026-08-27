export type ClassType = "A" | "B" | "C";

export interface ToolDef {
  slug: string;
  name: string;
  className: ClassType;
  category: string;
  sourceFormat: string;
  targetFormat: string;
  sourceExt: string;
  targetExt: string;
  description: string;
}

// Compact desktop tool registry (the web app owns the full SEO copy).
// Keep in sync with web/src/lib/tools-data.ts slugs.
export const TOOLS: ToolDef[] = [
  {
    slug: "kfx-to-epub",
    name: "KFX to EPUB",
    className: "A",
    category: "ebook",
    sourceFormat: "KFX",
    targetFormat: "EPUB",
    sourceExt: ".kfx",
    targetExt: ".epub",
    description: "Convert Amazon Kindle KFX to EPUB (DRM-free).",
  },
  {
    slug: "prt-to-stl",
    name: "PRT to STL",
    className: "B",
    category: "3d",
    sourceFormat: "PRT",
    targetFormat: "STL",
    sourceExt: ".prt",
    targetExt: ".stl",
    description: "Convert Creo/Pro-E PRT to STL for 3D printing (via FreeCAD).",
  },
  {
    slug: "pvr-to-png",
    name: "PVR to PNG",
    className: "A",
    category: "image",
    sourceFormat: "PVR",
    targetFormat: "PNG",
    sourceExt: ".pvr",
    targetExt: ".png",
    description: "Convert PowerVR textures to PNG (uncompressed RGBA).",
  },
  {
    slug: "raw-to-iso",
    name: "RAW to ISO",
    className: "C",
    category: "archive",
    sourceFormat: "RAW",
    targetFormat: "ISO",
    sourceExt: ".raw",
    targetExt: ".iso",
    description: "Convert optical disc RAW images to ISO 9660.",
  },
  {
    slug: "blend-to-glb",
    name: "BLEND to GLB",
    className: "B",
    category: "3d",
    sourceFormat: "BLEND",
    targetFormat: "GLB",
    sourceExt: ".blend",
    targetExt: ".glb",
    description: "Convert Blender projects to GLB (glTF Binary, via Blender).",
  },
];

export function getTool(slug: string): ToolDef | undefined {
  return TOOLS.find((t) => t.slug === slug);
}
