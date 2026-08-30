//PFM + PFB (Adobe Type 1) → TTF: Convert Type 1 cubic Bezier contour to TrueType quadratic contour and package it.
//- Binary PFB is just a package of Type 1 program: first unpack it into ASCII PFA (the type1 segment is as it is, the type2 encrypted segment is converted to <hex>), and then it is submitted to fontkit for analysis.
//- Convert contour (cubic) to quadratic (error ≤ 1 design unit), use opentype.js to assemble TTF.
//- Measurement (advanceWidth) and encoding are taken from PFB (PFB comes with encoding + word width); PFM is an optional enhancement.
import * as fontkit from "fontkit";
import * as opentype from "opentype.js";
import {
  IConverter,
  ConverterInfo,
  ConversionOptions,
  ConversionResult,
  defaultValidate,
} from "./interfaces";

interface PathCommand {
  type: "M" | "L" | "C" | "Q" | "Z";
  x?: number;
  y?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
}
interface FkGlyph {
  id: number;
  name: string;
  advanceWidth: number;
  path?: { commands: PathCommand[] };
}
interface FkFont {
  unitsPerEm: number;
  ascender: number;
  descender: number;
  fontBBox?: [number, number, number, number];
  postscriptName: string;
  numGlyphs: number;
  glyphForCode(code: number): FkGlyph;
  getGlyph(index: number): FkGlyph;
  familyName?: string;
  subfamilyName?: string;
}

// Binary PFB -> ASCII PFA (only valid for real Adobe PFB)
function pfbToPfa(buffer: ArrayBuffer): string {
  const u8 = new Uint8Array(buffer);
  let out = "";
  let i = 0;
  while (i + 6 <= u8.length) {
    if (u8[i] !== 0x80) {
      i++;
      continue;
    }
    const type = u8[i + 1];
    if (type === 3) break; // EOF
    const len =
      (u8[i + 2] | (u8[i + 3] << 8) | (u8[i + 4] << 16) | (u8[i + 5] << 24)) >>>
      0;
    if (i + 6 + len > u8.length) break;
    const data = u8.subarray(i + 6, i + 6 + len);
    i += 6 + len;
    if (type === 1) {
      out += latin1(data);
    } else if (type === 2) {
      let hex = "";
      for (let k = 0; k < data.length; k++)
        hex += data[k].toString(16).padStart(2, "0");
      out += "<" + hex + ">";
    }
  }
  return out;
}

function latin1(u8: Uint8Array): string {
  let s = "";
  for (let k = 0; k < u8.length; k++) s += String.fromCharCode(u8[k]);
  return s;
}

type Pt = { x: number; y: number };

// Cubic Bezier -> multiple quadratic Beziers (adaptive De Casteljau subdivision, control points = 0.75*(P1+P2) - 0.5*P0 - 0.25*P3)
function cubicToQuadratic(
  p0: Pt,
  p1: Pt,
  p2: Pt,
  p3: Pt,
  path: opentype.Path,
  tol = 1,
) {
  const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const flatEnough = (a: Pt, b: Pt, c: Pt, d: Pt) => {
    const dx = b.x - a.x,
      dy = b.y - a.y;
    const ex = c.x - d.x,
      ey = c.y - d.y;
    const fx = d.x - a.x,
      fy = d.y - a.y;
    const dev = Math.sqrt(dx * dx + dy * dy) + Math.sqrt(ex * ex + ey * ey) - Math.sqrt(fx * fx + fy * fy);
    return dev * dev <= tol * tol;
  };
  const rec = (a: Pt, b: Pt, c: Pt, d: Pt) => {
    if (flatEnough(a, b, c, d)) {
      const qx = 0.75 * (b.x + c.x) - 0.5 * a.x - 0.25 * d.x;
      const qy = 0.75 * (b.y + c.y) - 0.5 * a.y - 0.25 * d.y;
      path.qCurveTo(qx, qy, d.x, d.y);
      return;
    }
    const ab = mid(a, b),
      bc = mid(b, c),
      cd = mid(c, d);
    const abc = mid(ab, bc),
      bcd = mid(bc, cd);
    const abcd = mid(abc, bcd);
    rec(a, ab, abc, abcd);
    rec(abcd, bcd, cd, d);
  };
  rec(p0, p1, p2, p3);
}

function buildPath(commands: PathCommand[]): opentype.Path {
  const path = new opentype.Path();
  let cur: Pt = { x: 0, y: 0 };
  for (const c of commands) {
    switch (c.type) {
      case "M":
        cur = { x: c.x!, y: c.y! };
        path.moveTo(cur.x, cur.y);
        break;
      case "L":
        cur = { x: c.x!, y: c.y! };
        path.lineTo(cur.x, cur.y);
        break;
      case "C":
        cubicToQuadratic(
          cur,
          { x: c.x1!, y: c.y1! },
          { x: c.x2!, y: c.y2! },
          { x: c.x!, y: c.y! },
          path,
        );
        cur = { x: c.x!, y: c.y! };
        break;
      case "Q":
        path.qCurveTo(c.x1!, c.y1!, c.x!, c.y!);
        cur = { x: c.x!, y: c.y! };
        break;
      case "Z":
        path.close();
        break;
    }
  }
  return path;
}

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

    const pfbBuf = await options.pfbCompanion.arrayBuffer();
    const pfa = pfbToPfa(pfbBuf);

    let font: FkFont;
    try {
      font = fontkit.create(new TextEncoder().encode(pfa).buffer) as FkFont;
    } catch {
      throw new Error(
        "Could not parse the .pfb file as a Type 1 font. Make sure it is a valid Adobe PFB (binary) file.",
      );
    }

    const unitsPerEm = font.unitsPerEm || 1000;
    const ascender = isFinite(font.ascender)
      ? font.ascender
      : (font.fontBBox ? font.fontBBox[3] : Math.round(unitsPerEm * 0.8));
    const descender = isFinite(font.descender)
      ? font.descender
      : (font.fontBBox ? font.fontBBox[1] : -Math.round(unitsPerEm * 0.2));
    const familyName = font.familyName || font.postscriptName || "ConvertedFont";
    const styleName = font.subfamilyName || "Regular";

    const numGlyphs = font.numGlyphs || 0;
    if (!numGlyphs) {
      throw new Error("The Type 1 font has no glyphs.");
    }

    //unicode → glyph index mapping (from PFB’s own encoding)
    const unicodesByGlyph: Record<number, number[]> = {};
    for (let code = 0; code <= 0xffff; code++) {
      let g: FkGlyph;
      try {
        g = font.glyphForCode(code);
      } catch {
        continue;
      }
      if (g && g.id >= 0 && g.id < numGlyphs) {
        (unicodesByGlyph[g.id] ||= []).push(code);
      }
    }

    const glyphs: opentype.Glyph[] = [];
    for (let index = 0; index < numGlyphs; index++) {
      let g: FkGlyph;
      try {
        g = font.getGlyph(index);
      } catch {
        g = font.getGlyph(0);
      }
      const path = buildPath(g.path ? g.path.commands : []);
      glyphs.push(
        new opentype.Glyph({
          name: g.name || `glyph${index}`,
          index,
          advanceWidth: isFinite(g.advanceWidth) ? g.advanceWidth : 0,
          unicodes: unicodesByGlyph[index] || [],
          path,
        }),
      );
    }

    const ttf = new opentype.Font({
      familyName,
      styleName,
      unitsPerEm,
      ascender,
      descender,
      glyphs,
    });

    let buf: ArrayBuffer;
    try {
      buf = ttf.toArrayBuffer();
    } catch {
      throw new Error(
        "Failed to assemble the TTF. The font may use unsupported hinting structures.",
      );
    }

    const bytes = new Uint8Array(buf);
    const okTag =
      (bytes[0] === 0x00 && bytes[1] === 0x01) ||
      (bytes[0] === 0x74 && bytes[1] === 0x72); // 'true'
    if (!okTag) {
      throw new Error("Generated an invalid TTF container.");
    }

    return {
      data: new Blob([bytes as unknown as BlobPart], { type: "font/ttf" }),
      filename: options.inputFile.name.replace(/\.pfm$/i, ".ttf"),
      size: bytes.byteLength,
      mimeType: "font/ttf",
    };
  }
}
