import { describe, it, expect } from "vitest";
import { baseName, replaceExt, stemOf, resolveOutputPath } from "./paths";
import type { ToolDef } from "./tools-data";

const fileTool: Pick<ToolDef, "targetExt" | "outputKind"> = {
  targetExt: ".iso",
  outputKind: "file",
};
const dirTool: Pick<ToolDef, "targetExt" | "outputKind"> = {
  targetExt: ".wad",
  outputKind: "dir",
};

describe("baseName", () => {
  it("strips POSIX and Windows directories", () => {
    expect(baseName("C:/data/clip.raw")).toBe("clip.raw");
    expect(baseName("C:\\data\\clip.raw")).toBe("clip.raw");
    expect(baseName("/var/tmp/clip.raw")).toBe("clip.raw");
  });

  it("returns the input when there is no directory", () => {
    expect(baseName("clip.raw")).toBe("clip.raw");
  });
});

describe("replaceExt", () => {
  it("swaps the extension", () => {
    expect(replaceExt("clip.raw", ".iso")).toBe("clip.iso");
  });

  // Regression: the original inline regex was /\.[^.]+$/, which matched the dot
  // inside a *directory* name and truncated the path.
  it("does not truncate dotted directory names", () => {
    expect(replaceExt("C:/my.folder/clip", ".iso")).toBe("C:/my.folder/clip.iso");
    expect(replaceExt("C:\\my.folder\\clip.raw", ".iso")).toBe("C:\\my.folder\\clip.iso");
  });

  // Regression: without this, an extension-less input produced an output path
  // identical to the input — the conversion would overwrite the source file.
  it("appends the extension when the name has none", () => {
    expect(replaceExt("C:/data/RAW", ".iso")).toBe("C:/data/RAW.iso");
    expect(replaceExt("clip", ".iso")).toBe("clip.iso");
  });
});

describe("stemOf", () => {
  it("drops the trailing extension", () => {
    expect(stemOf("clip.raw")).toBe("clip");
    expect(stemOf("/a/b/clip.raw")).toBe("/a/b/clip");
  });

  it("leaves dotted directories intact", () => {
    expect(stemOf("C:/my.folder/clip")).toBe("C:/my.folder/clip");
  });

  it("handles multiple dots in a filename", () => {
    expect(stemOf("clip.final.v2.raw")).toBe("clip.final.v2");
  });
});

describe("resolveOutputPath — same folder", () => {
  it("writes next to the source with the target extension", () => {
    expect(resolveOutputPath("C:/data/clip.raw", fileTool, "same", "")).toBe(
      "C:/data/clip.iso",
    );
  });

  it("uses the stem for directory-style outputs", () => {
    expect(resolveOutputPath("C:/data/doom.wad", dirTool, "same", "")).toBe(
      "C:/data/doom",
    );
  });

  // Regression: dotted directory names must survive.
  it("keeps dotted directory names intact", () => {
    expect(resolveOutputPath("C:/my.folder/clip", fileTool, "same", "")).toBe(
      "C:/my.folder/clip.iso",
    );
  });
});

describe("resolveOutputPath — chosen folder", () => {
  it("collects outputs under the chosen folder", () => {
    expect(resolveOutputPath("C:/data/clip.raw", fileTool, "folder", "D:/out")).toBe(
      "D:/out/clip.iso",
    );
  });

  it("uses the basename so nested sources do not recreate the tree", () => {
    expect(
      resolveOutputPath("C:/data/nested/deep/clip.raw", fileTool, "folder", "D:/out"),
    ).toBe("D:/out/clip.iso");
  });

  it("trims trailing separators from the folder", () => {
    expect(resolveOutputPath("C:/d/clip.raw", fileTool, "folder", "D:/out/")).toBe(
      "D:/out/clip.iso",
    );
    expect(resolveOutputPath("C:/d/clip.raw", fileTool, "folder", "D:/out\\")).toBe(
      "D:/out/clip.iso",
    );
  });

  it("uses the stem for directory-style outputs", () => {
    expect(resolveOutputPath("C:/d/doom.wad", dirTool, "folder", "D:/out")).toBe(
      "D:/out/doom",
    );
  });

  // Falls back to "same" behaviour when no folder has been picked yet.
  it("falls back to same-folder when no folder is chosen", () => {
    expect(resolveOutputPath("C:/d/clip.raw", fileTool, "folder", "")).toBe(
      "C:/d/clip.iso",
    );
  });

  it("never returns the input path (would overwrite the source)", () => {
    const cases: Array<[string, Pick<ToolDef, "targetExt" | "outputKind">]> = [
      ["C:/data/clip", fileTool],
      ["C:/my.folder/clip", fileTool],
      ["clip", fileTool],
    ];
    for (const [input, tool] of cases) {
      expect(resolveOutputPath(input, tool, "same", "")).not.toBe(input);
    }
  });
});
