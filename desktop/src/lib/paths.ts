import type { ToolDef } from "./tools-data";

export type OutMode = "same" | "folder";

/// Strip directories from a path (handles both Windows `\` and POSIX `/`).
export function baseName(p: string): string {
  const parts = p.split(/[\\/]/);
  return parts[parts.length - 1] || p;
}

/**
 * Replace the file extension with `ext`, appending it when the name has none.
 *
 * The character class deliberately **excludes path separators**: a naive
 * `/\.[^.]+$/` matches the dot in a directory name (e.g. `C:/my.folder/clip`
 * → `C:/my.iso`), which would silently write the output to the wrong place.
 * It also leaves extension-less inputs untouched, which would make the output
 * path equal to the input path and overwrite the source file.
 */
export function replaceExt(p: string, ext: string): string {
  return /\.[^.\\/]+$/.test(p) ? p.replace(/\.[^.\\/]+$/, ext) : p + ext;
}

/// Drop the trailing extension (the "stem"), ignoring dots in directory names.
export function stemOf(p: string): string {
  return /\.[^.\\/]+$/.test(p) ? p.replace(/\.[^.\\/]+$/, "") : p;
}

/**
 * Resolve where a converted file should be written.
 *
 * Kept pure and unit-tested: a wrong output path means files silently land
 * somewhere unexpected (or overwrite each other / the source), so this is
 * deliberately isolated from React state.
 *
 * - `outMode === "folder"` collects every output under `outFolder`.
 * - Tools with `outputKind === "dir"` (e.g. WAD) extract into a directory, so
 *   they get the stem with no target extension.
 */
export function resolveOutputPath(
  input: string,
  tool: Pick<ToolDef, "targetExt" | "outputKind">,
  outMode: OutMode,
  outFolder: string,
): string {
  if (outMode === "folder" && outFolder) {
    const clean = outFolder.replace(/[\\/]+$/, "");
    const base = baseName(input);
    // Directory-style outputs keep the stem — no target extension.
    if (tool.outputKind === "dir") return `${clean}/${stemOf(base)}`;
    return `${clean}/${replaceExt(base, tool.targetExt)}`;
  }
  if (tool.outputKind === "dir") return stemOf(input);
  return replaceExt(input, tool.targetExt);
}
