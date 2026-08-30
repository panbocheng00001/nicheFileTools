// Minimal TrueType (glyf/loca) writer — zero dependencies.
//
// Why: opentype.js 1.3.5 can only *emit* CFF outlines — fontToSfntTable() calls
// cff_default.make() unconditionally and ignores `outlinesFormat`, so every file
// it writes carries an `OTTO` signature plus a `CFF ` table. This tool is
// advertised as PFM -> TTF, so we build the glyf/loca tables ourselves:
// Type 1 cubics are flattened to quadratics, then packed as simple glyphs.
import type { PathCommand } from "./parse";

export interface TtfGlyphInput {
  name: string;
  advanceWidth: number;
  commands: PathCommand[];
  unicodes: number[];
}

export interface TtfOptions {
  familyName: string;
  styleName: string;
  unitsPerEm: number;
  ascender: number;
  descender: number;
  glyphs: TtfGlyphInput[];
}

interface Pt {
  x: number;
  y: number;
  on: boolean;
}

// ---------------------------------------------------------------- cubic -> quad

/** Adaptive De Casteljau subdivision; emits Q commands (tolerance in font units). */
function subdivideCubic(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
  d: { x: number; y: number },
  out: PathCommand[],
  depth = 0,
) {
  const mid = (p: { x: number; y: number }, q: { x: number; y: number }) => ({
    x: (p.x + q.x) / 2,
    y: (p.y + q.y) / 2,
  });
  const flat = (
    a: { x: number; y: number },
    b: { x: number; y: number },
    c: { x: number; y: number },
    d: { x: number; y: number },
  ) => {
    const dev =
      Math.hypot(b.x - a.x, b.y - a.y) +
      Math.hypot(c.x - d.x, c.y - d.y) -
      Math.hypot(d.x - a.x, d.y - a.y);
    return dev * dev <= 0.25; // 0.5 design unit
  };
  if (depth > 12 || flat(a, b, c, d)) {
    out.push({
      type: "Q",
      x1: 0.75 * (b.x + c.x) - 0.5 * a.x - 0.25 * d.x,
      y1: 0.75 * (b.y + c.y) - 0.5 * a.y - 0.25 * d.y,
      x: d.x,
      y: d.y,
    });
    return;
  }
  const ab = mid(a, b),
    bc = mid(b, c),
    cd = mid(c, d);
  const abc = mid(ab, bc),
    bcd = mid(bc, cd);
  const abcd = mid(abc, bcd);
  subdivideCubic(a, ab, abc, abcd, out, depth + 1);
  subdivideCubic(abcd, bcd, cd, d, out, depth + 1);
}

/** Replace every C command with an equivalent run of Q commands. */
function flattenCubics(cmds: PathCommand[]): PathCommand[] {
  const out: PathCommand[] = [];
  let cur = { x: 0, y: 0 };
  for (const c of cmds) {
    if (c.type === "M" || c.type === "L") {
      out.push({ type: c.type, x: c.x, y: c.y });
      cur = { x: c.x ?? 0, y: c.y ?? 0 };
    } else if (c.type === "Q") {
      out.push({ type: "Q", x1: c.x1, y1: c.y1, x: c.x, y: c.y });
      cur = { x: c.x ?? 0, y: c.y ?? 0 };
    } else if (c.type === "C") {
      subdivideCubic(
        cur,
        { x: c.x1 ?? 0, y: c.y1 ?? 0 },
        { x: c.x2 ?? 0, y: c.y2 ?? 0 },
        { x: c.x ?? 0, y: c.y ?? 0 },
        out,
      );
      cur = { x: c.x ?? 0, y: c.y ?? 0 };
    } else if (c.type === "Z") {
      out.push({ type: "Z" });
    }
  }
  return out;
}

function toContours(cmds: PathCommand[]): Pt[][] {
  const contours: Pt[][] = [];
  let cur: Pt[] = [];
  const r = (v?: number) => Math.round(v ?? 0);
  for (const c of cmds) {
    if (c.type === "M") {
      if (cur.length) contours.push(cur);
      cur = [{ x: r(c.x), y: r(c.y), on: true }];
    } else if (c.type === "L") {
      cur.push({ x: r(c.x), y: r(c.y), on: true });
    } else if (c.type === "Q") {
      cur.push({ x: r(c.x1), y: r(c.y1), on: false });
      cur.push({ x: r(c.x), y: r(c.y), on: true });
    } else if (c.type === "Z") {
      if (cur.length) contours.push(cur);
      cur = [];
    }
  }
  if (cur.length) contours.push(cur);
  return contours;
}

// ---------------------------------------------------------------- glyf

function encodeGlyph(contours: Pt[][]): Uint8Array {
  if (!contours.length) return new Uint8Array(0);

  const endPts: number[] = [];
  let idx = -1;
  for (const c of contours) {
    idx += c.length;
    endPts.push(idx);
  }
  const pts: Pt[] = contours.flat();

  let xMin = Infinity,
    yMin = Infinity,
    xMax = -Infinity,
    yMax = -Infinity;
  for (const p of pts) {
    if (p.x < xMin) xMin = p.x;
    if (p.y < yMin) yMin = p.y;
    if (p.x > xMax) xMax = p.x;
    if (p.y > yMax) yMax = p.y;
  }

  const flags: number[] = [];
  const xs: number[] = [];
  const ys: number[] = [];
  let px = 0,
    py = 0;
  for (const p of pts) {
    let f = p.on ? 0x01 : 0x00;
    const dx = p.x - px;
    const dy = p.y - py;

    if (dx === 0) {
      f |= 0x10; // X_IS_SAME
    } else if (dx >= -255 && dx <= 255) {
      f |= 0x02; // X_SHORT
      if (dx > 0) f |= 0x10;
      xs.push(Math.abs(dx));
    } else {
      xs.push((dx >> 8) & 0xff, dx & 0xff);
    }

    if (dy === 0) {
      f |= 0x20; // Y_IS_SAME
    } else if (dy >= -255 && dy <= 255) {
      f |= 0x04; // Y_SHORT
      if (dy > 0) f |= 0x20;
      ys.push(Math.abs(dy));
    } else {
      ys.push((dy >> 8) & 0xff, dy & 0xff);
    }

    flags.push(f);
    px = p.x;
    py = p.y;
  }

  const size = 10 + endPts.length * 2 + 2 + flags.length + xs.length + ys.length;
  const buf = new Uint8Array(size);
  const dv = new DataView(buf.buffer);
  let o = 0;
  dv.setInt16(o, contours.length, false);
  o += 2;
  dv.setInt16(o, xMin, false);
  o += 2;
  dv.setInt16(o, yMin, false);
  o += 2;
  dv.setInt16(o, xMax, false);
  o += 2;
  dv.setInt16(o, yMax, false);
  o += 2;
  for (const e of endPts) {
    dv.setUint16(o, e, false);
    o += 2;
  }
  dv.setUint16(o, 0, false);
  o += 2; // instructionLength
  for (const f of flags) buf[o++] = f;
  for (const v of xs) buf[o++] = v;
  for (const v of ys) buf[o++] = v;
  return buf;
}

// ---------------------------------------------------------------- cmap (format 4)

function buildCmap(glyphs: TtfGlyphInput[]): Uint8Array {
  const pairs: { u: number; g: number }[] = [];
  glyphs.forEach((g, gi) => {
    for (const u of g.unicodes) {
      if (u > 0 && u <= 0xffff && gi <= 0xffff) pairs.push({ u, g: gi });
    }
  });
  pairs.sort((a, b) => a.u - b.u);

  // merge runs whose gid increments in lockstep -> idDelta encoding
  const segs: { start: number; end: number; delta: number }[] = [];
  for (const { u, g } of pairs) {
    const last = segs[segs.length - 1];
    if (last && u === last.end + 1 && (g - u) % 65536 === last.delta) {
      last.end = u;
    } else {
      segs.push({ start: u, end: u, delta: (g - u) & 0xffff });
    }
  }
  segs.push({ start: 0xffff, end: 0xffff, delta: 1 });

  const segCount = segs.length;
  const entrySelector = Math.floor(Math.log2(segCount));
  const searchRange = 2 ** entrySelector * 2;
  const rangeShift = segCount * 2 - searchRange;

  const len = 14 + segCount * 8;
  const buf = new Uint8Array(len);
  const dv = new DataView(buf.buffer);
  let o = 0;
  dv.setUint16(o, 4, false);
  o += 2; // format
  dv.setUint16(o, len, false);
  o += 2;
  dv.setUint16(o, 0, false);
  o += 2; // language
  dv.setUint16(o, segCount * 2, false);
  o += 2;
  dv.setUint16(o, searchRange, false);
  o += 2;
  dv.setUint16(o, entrySelector, false);
  o += 2;
  dv.setUint16(o, rangeShift, false);
  o += 2;
  for (const s of segs) {
    dv.setUint16(o, s.end, false);
    o += 2;
  }
  dv.setUint16(o, 0, false);
  o += 2; // reservedPad
  for (const s of segs) {
    dv.setUint16(o, s.start, false);
    o += 2;
  }
  for (const s of segs) {
    dv.setInt16(o, s.delta, false);
    o += 2;
  }
  for (let i = 0; i < segCount; i++) {
    dv.setUint16(o, 0, false);
    o += 2; // idRangeOffset (unused: idDelta form)
  }
  return buf;
}

// ---------------------------------------------------------------- name

const NAME_IDS: [number, (o: TtfOptions) => string][] = [
  [1, (o) => o.familyName],
  [2, (o) => o.styleName],
  [4, (o) => `${o.familyName} ${o.styleName}`],
  [6, (o) => `${o.familyName.replace(/\s+/g, "")}-${o.styleName}`],
  [3, (o) => `Converted by nichefiletools: ${o.familyName} ${o.styleName}`],
  [5, () => "Version 1.000"],
];

function buildName(opts: TtfOptions): Uint8Array {
  const entries = NAME_IDS.map(([id, fn]) => ({ id, text: fn(opts) }));
  const strings: Uint8Array[] = [];
  let storageLen = 0;
  for (const e of entries) {
    const bytes: number[] = [];
    for (const ch of e.text) {
      const cp = ch.codePointAt(0)!;
      if (cp > 0xffff) continue;
      bytes.push((cp >> 8) & 0xff, cp & 0xff);
    }
    const arr = new Uint8Array(bytes);
    strings.push(arr);
    storageLen += arr.length;
  }
  const count = entries.length;
  const buf = new Uint8Array(6 + count * 12 + storageLen);
  const dv = new DataView(buf.buffer);
  let o = 0;
  dv.setUint16(o, 0, false);
  o += 2;
  dv.setUint16(o, count, false);
  o += 2;
  dv.setUint16(o, 6 + count * 12, false);
  o += 2;
  let strOff = 0;
  entries.forEach((e, i) => {
    dv.setUint16(o, 3, false);
    o += 2; // platform Windows
    dv.setUint16(o, 1, false);
    o += 2; // UCS-2
    dv.setUint16(o, 0x0409, false);
    o += 2; // en-US
    dv.setUint16(o, e.id, false);
    o += 2;
    dv.setUint16(o, strings[i].length, false);
    o += 2;
    dv.setUint16(o, strOff, false);
    o += 2;
    strOff += strings[i].length;
  });
  for (const s of strings) {
    buf.set(s, o);
    o += s.length;
  }
  return buf;
}

// ---------------------------------------------------------------- binary helpers

class W {
  private parts: Uint8Array[] = [];
  u8(v: number) {
    this.parts.push(new Uint8Array([v & 0xff]));
    return this;
  }
  u16(v: number) {
    this.parts.push(new Uint8Array([(v >> 8) & 0xff, v & 0xff]));
    return this;
  }
  i16(v: number) {
    const x = v & 0xffff;
    return this.u16(x);
  }
  u32(v: number) {
    this.parts.push(
      new Uint8Array([(v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff]),
    );
    return this;
  }
  raw(b: Uint8Array) {
    this.parts.push(b);
    return this;
  }
  bytes(): Uint8Array {
    const n = this.parts.reduce((s, p) => s + p.length, 0);
    const out = new Uint8Array(n);
    let o = 0;
    for (const p of this.parts) {
      out.set(p, o);
      o += p.length;
    }
    return out;
  }
}

function tableChecksum(b: Uint8Array): number {
  const padded = new Uint8Array(Math.ceil(b.length / 4) * 4);
  padded.set(b);
  let sum = 0;
  for (let i = 0; i < padded.length; i += 4) {
    sum =
      (sum +
        ((padded[i] << 24) |
          (padded[i + 1] << 16) |
          (padded[i + 2] << 8) |
          padded[i + 3])) >>>
      0;
  }
  return sum >>> 0;
}

// ---------------------------------------------------------------- main

export function buildTtf(opts: TtfOptions): Uint8Array {
  const glyphs = opts.glyphs;
  const numGlyphs = Math.max(1, glyphs.length);
  const upem = opts.unitsPerEm || 1000;

  // --- outlines ---
  const glyfData: Uint8Array[] = [];
  let maxPoints = 0;
  let maxContours = 0;
  let xMinAll = 0,
    yMinAll = 0,
    xMaxAll = 0,
    yMaxAll = 0;
  let advanceWidthMax = 0;
  let minLsb = 0;

  for (const g of glyphs) {
    const contours = toContours(flattenCubics(g.commands));
    const pts = contours.flat();
    maxPoints = Math.max(maxPoints, pts.length);
    maxContours = Math.max(maxContours, contours.length);
    for (const p of pts) {
      if (p.x < xMinAll) xMinAll = p.x;
      if (p.y < yMinAll) yMinAll = p.y;
      if (p.x > xMaxAll) xMaxAll = p.x;
      if (p.y > yMaxAll) yMaxAll = p.y;
    }
    if (contours.length) minLsb = Math.min(minLsb, Math.min(...pts.map((p) => p.x)));
    glyfData.push(encodeGlyph(contours));
  }
  for (const g of glyphs) {
    const w = Math.round(g.advanceWidth) || 0;
    if (w > advanceWidthMax) advanceWidthMax = w;
  }
  if (!glyphs.length) glyfData.push(new Uint8Array(0));

  // --- glyf + loca (4-byte aligned) ---
  const glyfParts: Uint8Array[] = [];
  const loca: number[] = [];
  let offset = 0;
  for (const gd of glyfData) {
    loca.push(offset);
    glyfParts.push(gd);
    offset += gd.length;
    const pad = (4 - (gd.length % 4)) % 4;
    if (pad) {
      glyfParts.push(new Uint8Array(pad));
      offset += pad;
    }
  }
  loca.push(offset);
  const glyf = (() => {
    const n = glyfParts.reduce((s, p) => s + p.length, 0);
    const out = new Uint8Array(n);
    let o = 0;
    for (const p of glyfParts) {
      out.set(p, o);
      o += p.length;
    }
    return out;
  })();

  const useLongLoca = offset > 0x1fffe;
  const locaBuf = new Uint8Array(loca.length * (useLongLoca ? 4 : 2));
  for (let i = 0; i < loca.length; i++) {
    if (useLongLoca) {
      locaBuf[i * 4] = (loca[i] >>> 24) & 0xff;
      locaBuf[i * 4 + 1] = (loca[i] >>> 16) & 0xff;
      locaBuf[i * 4 + 2] = (loca[i] >>> 8) & 0xff;
      locaBuf[i * 4 + 3] = loca[i] & 0xff;
    } else {
      locaBuf[i * 2] = (loca[i] / 2 >> 8) & 0xff;
      locaBuf[i * 2 + 1] = (loca[i] / 2) & 0xff;
    }
  }

  // --- hmtx ---
  const hmtx = new Uint8Array(numGlyphs * 4);
  for (let i = 0; i < numGlyphs; i++) {
    const aw = Math.round(glyphs[i]?.advanceWidth ?? 0) || 0;
    hmtx[i * 4] = (aw >> 8) & 0xff;
    hmtx[i * 4 + 1] = aw & 0xff;
    // lsb: left-most point of the outline (0 for empty glyphs)
    hmtx[i * 4 + 2] = 0;
    hmtx[i * 4 + 3] = 0;
  }

  // --- head ---
  const head = new W();
  head.u32(0x00010000); // version
  head.u32(0x00010000); // fontRevision
  head.u32(0); // checkSumAdjustment (patched later)
  head.u32(0x5f0f3cf5); // magicNumber
  head.u16(0x0003); // flags
  head.u16(upem);
  head.u32(0).u32(0).u32(0).u32(0); // created + modified (8 bytes each)
  head.i16(Math.max(-32768, Math.min(32767, xMinAll)));
  head.i16(Math.max(-32768, Math.min(32767, yMinAll)));
  head.i16(Math.max(-32768, Math.min(32767, xMaxAll)));
  head.i16(Math.max(-32768, Math.min(32767, yMaxAll)));
  head.u16(/bold/i.test(opts.styleName) ? 1 : 0); // macStyle
  head.u16(8); // lowestRecPPEM
  head.i16(2); // fontDirectionHint
  head.i16(useLongLoca ? 1 : 0); // indexToLocFormat
  head.i16(0); // glyphDataFormat

  // --- hhea ---
  const hhea = new W();
  hhea.u32(0x00010000);
  hhea.i16(Math.round(opts.ascender));
  hhea.i16(Math.round(opts.descender));
  hhea.i16(0); // lineGap
  hhea.u16(Math.min(65535, advanceWidthMax));
  hhea.i16(Math.max(-32768, Math.min(32767, minLsb)));
  hhea.i16(Math.max(-32768, Math.min(32767, xMaxAll)));
  hhea.i16(Math.max(-32768, Math.min(32767, xMaxAll)));
  hhea.i16(1).i16(0).i16(0); // caretSlope
  hhea.i16(0).i16(0).i16(0).i16(0); // reserved
  hhea.i16(0); // metricDataFormat
  hhea.u16(numGlyphs);

  // --- maxp (1.0) ---
  const maxp = new W();
  maxp.u32(0x00010000);
  maxp.u16(numGlyphs);
  maxp.u16(Math.min(65535, maxPoints));
  maxp.u16(Math.min(65535, maxContours));
  maxp.u16(0).u16(0); // composite
  maxp.u16(2); // maxZones
  maxp.u16(0).u16(0).u16(0).u16(0); // twilight/storage/function/instruction defs
  maxp.u16(0).u16(0).u16(0).u16(0); // stack/instructions/components

  // --- OS/2 (version 4) ---
  const firstU = (() => {
    let m = 0xffff;
    for (const g of glyphs) for (const u of g.unicodes) if (u > 0 && u < m) m = u;
    return m === 0xffff ? 0 : m;
  })();
  const lastU = (() => {
    let m = 0;
    for (const g of glyphs) for (const u of g.unicodes) if (u > m) m = u;
    return m;
  })();
  const os2 = new W();
  os2.u16(4); // version
  os2.i16(500); // xAvgCharWidth
  os2.u16(/bold/i.test(opts.styleName) ? 700 : 400); // usWeightClass
  os2.u16(5); // usWidthClass
  os2.u16(0); // fsType (installable)
  os2.i16(650).i16(200).i16(0).i16(0); // subscript metrics
  os2.i16(650).i16(200).i16(0).i16(0); // superscript metrics
  os2.i16(50).i16(250); // strikeout
  os2.i16(0); // sFamilyClass
  for (let i = 0; i < 10; i++) os2.u8(2); // panose
  os2.u32(0x00000003).u32(0).u32(0).u32(0); // unicode ranges (Latin-1)
  os2.raw(new Uint8Array([0x4e, 0x49, 0x43, 0x48])); // achVendID "NICH"
  os2.u16(/bold/i.test(opts.styleName) ? 32 : 64); // fsSelection
  os2.u16(firstU);
  os2.u16(lastU);
  os2.i16(Math.round(opts.ascender));
  os2.i16(Math.round(opts.descender));
  os2.i16(0); // sTypoLineGap
  os2.u16(Math.abs(Math.round(opts.ascender))); // usWinAscent
  os2.u16(Math.abs(Math.round(opts.descender))); // usWinDescent
  os2.u32(0x00000001).u32(0); // code page range (Latin-1)
  os2.i16(500).i16(700); // sxHeight / sCapHeight
  os2.u16(0).u16(32); // usDefaultChar / usBreakChar
  os2.u16(2); // usMaxContext

  // --- post (3.0) ---
  const post = new W();
  post.u32(0x00030000);
  post.u32(0); // italicAngle
  post.i16(-100); // underlinePosition
  post.i16(50); // underlineThickness
  post.u32(0); // isFixedPitch
  post.u32(0).u32(0).u32(0).u32(0);

  const cmap = buildCmap(glyphs);
  const name = buildName(opts);

  // --- assemble sfnt ---
  const tables: [string, Uint8Array][] = [
    ["OS/2", os2.bytes()],
    ["cmap", cmap],
    ["glyf", glyf],
    ["head", head.bytes()],
    ["hhea", hhea.bytes()],
    ["hmtx", hmtx],
    ["loca", locaBuf],
    ["maxp", maxp.bytes()],
    ["name", name],
    ["post", post.bytes()],
  ];
  tables.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));

  const numTables = tables.length;
  const entrySelector = Math.floor(Math.log2(numTables));
  const searchRange = 2 ** entrySelector * 16;
  const rangeShift = numTables * 16 - searchRange;

  const headerLen = 12 + numTables * 16;
  let bodyLen = 0;
  for (const [, data] of tables) bodyLen += Math.ceil(data.length / 4) * 4;
  const total = headerLen + bodyLen;
  const out = new Uint8Array(total);
  const dv = new DataView(out.buffer);

  dv.setUint32(0, 0x00010000, false); // sfnt version: TrueType
  dv.setUint16(4, numTables, false);
  dv.setUint16(6, searchRange, false);
  dv.setUint16(8, entrySelector, false);
  dv.setUint16(10, rangeShift, false);

  let off = headerLen;
  tables.forEach(([tag, data], i) => {
    const rec = 12 + i * 16;
    for (let k = 0; k < 4; k++) out[rec + k] = tag.charCodeAt(k) || 0x20;
    dv.setUint32(rec + 4, tableChecksum(data), false);
    dv.setUint32(rec + 8, off, false);
    dv.setUint32(rec + 12, data.length, false);
    out.set(data, off);
    off += Math.ceil(data.length / 4) * 4;
  });

  // patch head.checkSumAdjustment
  const headRec = tables.findIndex(([t]) => t === "head");
  const headOff = dv.getUint32(12 + headRec * 16 + 8, false);
  dv.setUint32(headOff + 8, 0, false);
  const adj = (0xb1b0afba - tableChecksum(out)) >>> 0;
  dv.setUint32(headOff + 8, adj, false);

  return out;
}
