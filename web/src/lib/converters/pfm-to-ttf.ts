//PFM + PFB (Adobe Type 1) → TTF: Convert Type 1 cubic Bezier contour to TrueType quadratic contour and package it.
//- The .pfb is parsed by our own Type 1 parser (./type1/parse.ts): fontkit cannot
//  read Type 1/PFA, which made every real font fail with "Could not parse...".
//- Contours are cubic, so they are flattened to quadratics and packed by our own
//  TTF writer (./type1/ttf.ts): opentype.js only ever emits CFF outlines.
//- Measurement (advanceWidth) and encoding are taken from PFB (PFB comes with encoding + word width); PFM is an optional enhancement.
import { parseType1, glyphNameToUnicode } from "./type1/parse";
import { buildTtf, type TtfGlyphInput } from "./type1/ttf";
import {
  IConverter,
  ConverterInfo,
  ConversionOptions,
  ConversionResult,
  defaultValidate,
} from "./interfaces";

export class PfmToTtfConverter implements IConverter {
  readonly info: ConverterInfo = {
    id: "pfm-to-ttf",
    name: "PFM to TTF",
    sourceFormats: [".pfm"],
    targetFormat: ".ttf",
    category: "font",
    maxWebFileSize: 10 * 1024 * 1024,
    classType: "A",
    description:
      "Convert Adobe Type 1 (PFM + PFB) fonts to TrueType (TTF) in the browser.",
  };

  validate(file: File) {
    return defaultValidate(this.info, file);
  }

  async convert(options: ConversionOptions): Promise<ConversionResult> {
    if (!options.pfbCompanion) {
      throw new Error(
        "PFM conversion requires the companion .pfb file (it holds the glyph outlines). Please upload both .pfm and .pfb.",
      );
    }

    const pfbBuf = new Uint8Array(await options.pfbCompanion.arrayBuffer());

    let t1: ReturnType<typeof parseType1>;
    try {
      t1 = parseType1(pfbBuf);
    } catch (e) {
      throw new Error(
        `Could not parse the .pfb file as a Type 1 font: ${
          e instanceof Error ? e.message : "unknown error"
        }. Make sure it is a valid Adobe PFB (binary) file.`,
      );
    }

    const unitsPerEm = t1.unitsPerEm || 1000;
    const ascender = isFinite(t1.ascender)
      ? t1.ascender
      : Math.round(unitsPerEm * 0.8);
    const descender = isFinite(t1.descender)
      ? t1.descender
      : -Math.round(unitsPerEm * 0.2);
    const familyName = t1.familyName || t1.fontName || "ConvertedFont";
    const styleName = /bold/i.test(t1.weight)
      ? "Bold"
      : /italic|oblique/i.test(t1.weight) || t1.italicAngle !== 0
        ? "Italic"
        : "Regular";

    if (!t1.glyphs.length) {
      throw new Error("The Type 1 font has no glyphs.");
    }

    //Unicode → glyph id, resolved through the font's own /Encoding (Type 1
    //fonts are 8-bit: there is at most one glyph per code 0–255).
    const indexByName = new Map<string, number>();
    t1.glyphs.forEach((g, i) => indexByName.set(g.name, i));

    const unicodesByGlyph: Record<number, number[]> = {};
    for (let code = 0; code < 256; code++) {
      const name = t1.encoding[code];
      if (!name) continue;
      const gid = indexByName.get(name);
      if (gid === undefined) continue;
      const u = glyphNameToUnicode(name);
      if (u == null) continue;
      (unicodesByGlyph[gid] ||= []).push(u);
    }

    const glyphs: TtfGlyphInput[] = t1.glyphs.map((g, index) => ({
      name: g.name || `glyph${index}`,
      advanceWidth: isFinite(g.advanceWidth) ? g.advanceWidth : 0,
      commands: g.commands,
      unicodes: unicodesByGlyph[index] || [],
    }));

    let bytes: Uint8Array;
    try {
      bytes = buildTtf({
        familyName,
        styleName,
        unitsPerEm,
        ascender,
        descender,
        glyphs,
      });
    } catch (e) {
      throw new Error(
        `Failed to assemble the TTF: ${
          e instanceof Error ? e.message : "unknown error"
        }.`,
      );
    }
    const okTag =
      (bytes[0] === 0x00 && bytes[1] === 0x01) ||
      (bytes[0] === 0x74 && bytes[1] === 0x72); // 'true'
    if (!okTag) {
      const lead = Array.from(bytes.subarray(0, 8))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(" ");
      throw new Error(
        `Generated an invalid TTF container (first bytes: ${lead}).`,
      );
    }

    return {
      data: new Blob([bytes as unknown as BlobPart], { type: "font/ttf" }),
      filename: options.inputFile.name.replace(/\.pfm$/i, ".ttf"),
      size: bytes.byteLength,
      mimeType: "font/ttf",
    };
  }
}
