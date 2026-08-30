// Minimal Adobe Type 1 parser (PFB/PFA -> glyph outlines).
//
// Why this exists: the converter used to hand the unpacked PFA to fontkit, but
// fontkit does not support Type 1 / PFA, so every real font failed with
// "Could not parse the .pfb file as a Type 1 font". This module implements the
// pieces that are actually needed: PFB unblocking, eexec/charstring decryption,
// the Type 1 charstring interpreter, and encoding -> Unicode mapping.
//
// Scope notes (deliberate): hint stems are parsed and discarded (they do not
// affect outlines), and `seac` composite glyphs are resolved by re-running the
// interpreter on the base/accent glyphs.

export type PathCommandType = "M" | "L" | "C" | "Q" | "Z";
export interface PathCommand {
  type: PathCommandType;
  x?: number;
  y?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
}

export interface T1Glyph {
  name: string;
  advanceWidth: number;
  commands: PathCommand[];
}

export interface T1Font {
  fontName: string;
  familyName: string;
  weight: string;
  italicAngle: number;
  unitsPerEm: number;
  ascender: number;
  descender: number;
  bbox: [number, number, number, number];
  /** glyph id -> glyph */
  glyphs: T1Glyph[];
  glyphByName: Map<string, T1Glyph>;
  /** font encoding: char code (0-255) -> glyph name */
  encoding: (string | null)[];
}

// ---------------------------------------------------------------- crypto

const EE_R = 55665; // eexec (whole binary section)
const CS_R = 4330; // charstring
const C1 = 52845;
const C2 = 22719;

function eexecDecrypt(data: Uint8Array): Uint8Array {
  const out = new Uint8Array(data.length);
  let r = EE_R;
  for (let i = 0; i < data.length; i++) {
    const c = data[i];
    out[i] = c ^ (r >> 8);
    r = ((c + r) * C1 + C2) & 0xffff;
  }
  return out;
}

/** Charstring cipher: skip `lenIV` random leading bytes, then decrypt the rest. */
function charstringDecrypt(data: Uint8Array, lenIV: number): Uint8Array {
  if (lenIV < 0) return data; // negative lenIV means "not encrypted"
  const out = new Uint8Array(Math.max(0, data.length - lenIV));
  let r = CS_R;
  for (let i = 0; i < data.length; i++) {
    const c = data[i];
    if (i >= lenIV) out[i - lenIV] = c ^ (r >> 8);
    r = ((c + r) * C1 + C2) & 0xffff;
  }
  return out;
}

// ---------------------------------------------------------------- PFB

function pfbBlocks(buf: Uint8Array): { type: number; data: Uint8Array }[] {
  const out: { type: number; data: Uint8Array }[] = [];
  let i = 0;
  while (i + 6 <= buf.length) {
    if (buf[i] !== 0x80) {
      i++;
      continue;
    }
    const type = buf[i + 1];
    if (type === 3) break; // EOF marker
    const len =
      buf[i + 2] | (buf[i + 3] << 8) | (buf[i + 4] << 16) | (buf[i + 5] << 24);
    if (i + 6 + len > buf.length) break;
    out.push({ type, data: buf.subarray(i + 6, i + 6 + len) });
    i += 6 + len;
  }
  return out;
}

/** True when the buffer is a binary PFB (starts with an 0x80 block header). */
function isPfb(buf: Uint8Array): boolean {
  return buf.length > 1 && buf[0] === 0x80;
}

// ---------------------------------------------------------------- byte helpers

const latin1 = (b: Uint8Array): string => {
  let s = "";
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return s;
};

const isSpace = (c: number) => c === 32 || c === 10 || c === 13 || c === 9;
const isDigit = (c: number) => c >= 48 && c <= 57;
const isDelim = (c: number) =>
  isSpace(c) || c === 0x2f || c === 0x7b || c === 0x7d || c === 0x5b || c === 0x5d;

/** Match a regex against the (latin1) text starting at `from`. */
function matchAt(
  stream: Uint8Array,
  from: number,
  re: RegExp,
): { text: string; groups: string[]; end: number } | null {
  const chunk = latin1(stream.subarray(from, Math.min(stream.length, from + 128)));
  const m = re.exec(chunk);
  if (!m) return null;
  return { text: m[0], groups: m.slice(1), end: from + m[0].length };
}

function findIndex(stream: Uint8Array, needle: string, from = 0): number {
  const n = needle.length;
  for (let i = from; i + n <= stream.length; i++) {
    let hit = true;
    for (let k = 0; k < n; k++) {
      if (stream[i + k] !== needle.charCodeAt(k)) {
        hit = false;
        break;
      }
    }
    if (hit) return i;
  }
  return -1;
}

// ---------------------------------------------------------------- dictionaries

function parseNumberArray(text: string, from: number): number[] {
  const open = text.indexOf("[", from);
  if (open < 0) return [];
  const close = text.indexOf("]", open);
  if (close < 0) return [];
  return text
    .slice(open + 1, close)
    .split(/[\s]+/)
    .filter(Boolean)
    .map(Number)
    .filter((n) => isFinite(n));
}

// ---------------------------------------------------------------- charstrings

interface CharStringSet {
  order: string[];
  map: Map<string, Uint8Array>;
}

/** Index of the standalone `end` token that closes a dict opened at `start`. */
function findDictEnd(text: string, start: number): number {
  const idx = text.indexOf("end", start);
  if (idx < 0) return -1;
  // make sure it is a token, not a prefix such as "endash"
  const before = idx > 0 ? text[idx - 1] : " ";
  const after = text[idx + 3] ?? " ";
  const wordish = (c: string) => /[0-9A-Za-z_-]/.test(c);
  if (wordish(before) || wordish(after)) {
    return findDictEnd(text, idx + 3);
  }
  return idx;
}

/**
 * `/name <len> RD <len bytes> ND` pairs inside a CharStrings dict.
 *
 * After each charstring the stream continues with the `ND` marker (not a
 * delimiter), so the cursor must jump past the encrypted bytes *and* the marker
 * before looking for the next entry.
 */
function parseCharStrings(
  stream: Uint8Array,
  start: number,
  lenIV: number,
): CharStringSet {
  const map = new Map<string, Uint8Array>();
  const order: string[] = [];
  const text = latin1(stream);
  const endIdx = findDictEnd(text, start);
  const scope = endIdx > 0 ? text.slice(start, endIdx) : text.slice(start);

  const re = /\/([^\s{}()<>\[\]\/]+)\s+(\d+)\s+RD\s?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(scope))) {
    const name = m[1];
    const len = Number(m[2]);
    const dataStart = start + m.index + m[0].length;
    if (!isFinite(len) || dataStart + len > stream.length) break;
    const data = charstringDecrypt(
      stream.subarray(dataStart, dataStart + len),
      lenIV,
    );
    if (!map.has(name)) order.push(name);
    map.set(name, data);
    // skip the encrypted payload and the trailing ND marker
    re.lastIndex = m.index + m[0].length + len;
  }
  return { order, map };
}

/**
 * `dup <idx> <len> RD <len bytes> NP` entries of the private Subrs array.
 * Same cursor rule as above, with an `NP` marker instead of `ND`.
 */
function parseSubrs(
  stream: Uint8Array,
  start: number,
  end: number,
  lenIV: number,
): Uint8Array[] {
  const subrs: Uint8Array[] = [];
  const text = latin1(stream);
  const stop = end > start ? Math.min(end, text.length) : text.length;
  const scope = text.slice(start, stop);

  const re = /dup\s+(\d+)\s+(\d+)\s+RD\s?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(scope))) {
    const idx = Number(m[1]);
    const len = Number(m[2]);
    const dataStart = start + m.index + m[0].length;
    if (!isFinite(len) || dataStart + len > stream.length) break;
    subrs[idx] = charstringDecrypt(
      stream.subarray(dataStart, dataStart + len),
      lenIV,
    );
    re.lastIndex = m.index + m[0].length + len;
  }
  return subrs;
}

/** `dup <code> /<name> put` entries of the /Encoding array. */
function parseEncoding(
  stream: Uint8Array,
  start: number,
): (string | null)[] {
  const enc: (string | null)[] = new Array(256).fill(null);
  let i = start;
  for (let guard = 0; guard < 2048; guard++) {
    // stop at the next top-level dict key
    const next = matchAt(stream, i, /^\s*dup\s+(\d+)\s+\/([^\s{}()<>\[\]\/]+)\s+put/);
    if (!next) break;
    const code = Number(next.groups[0]);
    if (code >= 0 && code < 256) enc[code] = next.groups[1];
    i = next.end;
  }
  return enc;
}

// ---------------------------------------------------------------- interpreter

interface InterpCtx {
  subrs: Uint8Array[];
  /** standard-encoding char code -> charstring (for `seac`) */
  byStdCode: (code: number) => Uint8Array | undefined;
  lenIV: number;
}

interface InterpResult {
  commands: PathCommand[];
  advanceWidth: number;
}

function interpret(bytes: Uint8Array, ctx: InterpCtx, depth = 0): InterpResult {
  const cmds: PathCommand[] = [];
  const stack: number[] = [];
  let i = 0;
  let cur = { x: 0, y: 0 };
  let start = { x: 0, y: 0 };
  let width = 0;
  let flexing = false;

  const pop = () => (stack.length ? (stack.pop() as number) : 0);
  const clear = () => (stack.length = 0);

  const readNumber = (): number => {
    const b0 = bytes[i++];
    if (b0 >= 32 && b0 <= 246) return b0 - 139;
    if (b0 >= 247 && b0 <= 250) {
      const b1 = bytes[i++];
      return (b0 - 247) * 256 + b1 + 108;
    }
    if (b0 >= 251 && b0 <= 254) {
      const b1 = bytes[i++];
      return -((b0 - 251) * 256 + b1) - 108;
    }
    if (b0 === 255) {
      const v =
        ((bytes[i] << 24) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3]) |
        0;
      i += 4;
      return v;
    }
    return NaN; // command byte
  };

  // Guard against malformed fonts / cyclic subroutines.
  const maxOps = 200000;
  let ops = 0;

  while (i < bytes.length && ops++ < maxOps) {
    const b = bytes[i];

    if (b >= 32) {
      const n = readNumber();
      if (!isNaN(n)) stack.push(n);
      continue;
    }
    i++; // consume the command byte

    switch (b) {
      case 0: // hstem
      case 1: // vstem
        clear(); // hints: not needed for outlines
        break;

      case 2: {
        // vmoveto
        const dy = pop();
        cur = { x: cur.x, y: cur.y + dy };
        start = cur;
        cmds.push({ type: "M", x: cur.x, y: cur.y });
        clear();
        break;
      }
      case 21: {
        // rmoveto
        const dy = pop();
        const dx = pop();
        cur = { x: cur.x + dx, y: cur.y + dy };
        start = cur;
        cmds.push({ type: "M", x: cur.x, y: cur.y });
        clear();
        break;
      }
      case 22: {
        // hmoveto
        const dx = pop();
        cur = { x: cur.x + dx, y: cur.y };
        start = cur;
        cmds.push({ type: "M", x: cur.x, y: cur.y });
        clear();
        break;
      }
      case 3: {
        // rlineto
        const dy = pop();
        const dx = pop();
        cur = { x: cur.x + dx, y: cur.y + dy };
        cmds.push({ type: "L", x: cur.x, y: cur.y });
        clear();
        break;
      }
      case 4: {
        // hlineto
        const dx = pop();
        cur = { x: cur.x + dx, y: cur.y };
        cmds.push({ type: "L", x: cur.x, y: cur.y });
        clear();
        break;
      }
      case 5: {
        // vlineto
        const dy = pop();
        cur = { x: cur.x, y: cur.y + dy };
        cmds.push({ type: "L", x: cur.x, y: cur.y });
        clear();
        break;
      }
      case 6: {
        // rrcurveto
        const dy3 = pop();
        const dx3 = pop();
        const dy2 = pop();
        const dx2 = pop();
        const dy1 = pop();
        const dx1 = pop();
        cmds.push({
          type: "C",
          x1: cur.x + dx1,
          y1: cur.y + dy1,
          x2: cur.x + dx1 + dx2,
          y2: cur.y + dy1 + dy2,
          x: cur.x + dx1 + dx2 + dx3,
          y: cur.y + dy1 + dy2 + dy3,
        });
        cur = {
          x: cur.x + dx1 + dx2 + dx3,
          y: cur.y + dy1 + dy2 + dy3,
        };
        clear();
        break;
      }
      case 30: {
        // vhcurveto: dy1 dx2 dy2 dx3
        const dx3 = pop();
        const dy2 = pop();
        const dx2 = pop();
        const dy1 = pop();
        cmds.push({
          type: "C",
          x1: cur.x,
          y1: cur.y + dy1,
          x2: cur.x + dx2,
          y2: cur.y + dy1 + dy2,
          x: cur.x + dx2 + dx3,
          y: cur.y + dy1 + dy2,
        });
        cur = { x: cur.x + dx2 + dx3, y: cur.y + dy1 + dy2 };
        clear();
        break;
      }
      case 31: {
        // hvcurveto: dx1 dx2 dy2 dy3
        const dy3 = pop();
        const dy2 = pop();
        const dx2 = pop();
        const dx1 = pop();
        cmds.push({
          type: "C",
          x1: cur.x + dx1,
          y1: cur.y,
          x2: cur.x + dx1 + dx2,
          y2: cur.y + dy2,
          x: cur.x + dx1 + dx2,
          y: cur.y + dy2 + dy3,
        });
        cur = { x: cur.x + dx1 + dx2, y: cur.y + dy2 + dy3 };
        clear();
        break;
      }
      case 7: // closepath
        cmds.push({ type: "Z" });
        cur = { ...start };
        clear();
        break;

      case 9: // hsbw (also 13)
      case 13: {
        const wx = pop();
        const sbx = pop();
        width = wx;
        cur = { x: sbx, y: 0 };
        start = cur;
        clear();
        break;
      }

      case 8: {
        // callsubr
        const idx = pop();
        const sub = ctx.subrs[idx];
        if (sub && depth < 10) {
          const r = interpret(sub, ctx, depth + 1);
          for (const c of r.commands) cmds.push(c);
          if (r.commands.length) {
            const last = r.commands[r.commands.length - 1];
            cur = { x: last.x ?? cur.x, y: last.y ?? cur.y };
          }
        }
        clear();
        break;
      }
      case 11: // return
        i = bytes.length;
        break;
      case 10: // endchar
        i = bytes.length;
        break;

      case 12: {
        const esc = bytes[i++];
        switch (esc) {
          case 0: // dotsection
            clear();
            break;
          case 1: // vstem3
          case 2: // hstem3
            clear();
            break;
          case 6: {
            // seac: asb adx ady bchar achar
            const achar = pop();
            const bchar = pop();
            const ady = pop();
            const adx = pop();
            pop(); // asb (left side bearing, unused for outlines)
            if (depth < 6) {
              const baseCs = ctx.byStdCode(bchar);
              const accCs = ctx.byStdCode(achar);
              if (baseCs) {
                const r = interpret(baseCs, ctx, depth + 1);
                for (const c of r.commands) cmds.push(c);
                if (!width) width = r.advanceWidth;
              }
              if (accCs) {
                const r = interpret(accCs, ctx, depth + 1);
                for (const c of r.commands) {
                  cmds.push({
                    ...c,
                    x: c.x === undefined ? undefined : c.x + adx,
                    y: c.y === undefined ? undefined : c.y + ady,
                    x1: c.x1 === undefined ? undefined : c.x1 + adx,
                    y1: c.y1 === undefined ? undefined : c.y1 + ady,
                    x2: c.x2 === undefined ? undefined : c.x2 + adx,
                    y2: c.y2 === undefined ? undefined : c.y2 + ady,
                  });
                }
              }
            }
            clear();
            break;
          }
          case 7: {
            // sbw: hsb sbx wx wy  (vertical metrics, unused for outlines)
            pop(); // wy
            const wx = pop();
            pop(); // sbx
            pop(); // syb
            width = wx;
            clear();
            break;
          }
          case 12: {
            // div
            const b2v = pop();
            const a2v = pop();
            stack.push(b2v === 0 ? 0 : a2v / b2v);
            break;
          }
          case 16: {
            // callothersubr (flex / hint controls)
            const subrNo = pop();
            const nargs = pop();
            for (let k = 0; k < nargs; k++) pop();
            flexing = subrNo === 0 || subrNo === 1 || subrNo === 2;
            break;
          }
          case 17: {
            // pop: discard the values left by callothersubr
            pop();
            if (flexing && stack.length === 0) flexing = false;
            break;
          }
          case 33: {
            // setcurrentpoint
            const y = pop();
            const x = pop();
            cur = { x, y };
            start = { x, y };
            clear();
            break;
          }
          default:
            clear();
            break;
        }
        break;
      }

      default:
        clear();
        break;
    }
  }

  return { commands: cmds, advanceWidth: width };
}

// ---------------------------------------------------------------- public API

/**
 * Parse a Type 1 font (binary PFB or ASCII PFA) into outlines + metrics.
 * Coordinates are returned in font units (font matrix already applied).
 */
export function parseType1(buf: Uint8Array): T1Font {
  let stream: Uint8Array;
  if (isPfb(buf)) {
    const parts: Uint8Array[] = [];
    for (const blk of pfbBlocks(buf)) {
      if (blk.type === 1) parts.push(blk.data);
      else if (blk.type === 2) {
        // eexec-encrypted section; first 4 bytes are random padding
        const dec = eexecDecrypt(blk.data);
        parts.push(dec.subarray(4));
      }
    }
    const total = parts.reduce((s, p) => s + p.length, 0);
    stream = new Uint8Array(total);
    let off = 0;
    for (const p of parts) {
      stream.set(p, off);
      off += p.length;
    }
  } else {
    stream = buf;
  }

  const text = latin1(stream);

  // --- metrics -------------------------------------------------------------
  const fmIdx = text.indexOf("/FontMatrix");
  const fm = fmIdx >= 0 ? parseNumberArray(text, fmIdx) : [];
  const scale = fm.length >= 1 && fm[0] > 0 ? fm[0] : 0.001;
  const unitsPerEm = Math.round(1 / scale);

  const bbIdx = text.indexOf("/FontBBox");
  const bb = bbIdx >= 0 ? parseNumberArray(text, bbIdx) : [];
  const bbox: [number, number, number, number] =
    bb.length >= 4 ? [bb[0], bb[1], bb[2], bb[3]] : [0, -200, 1000, 800];

  const readName = (key: string, fallback: string): string => {
    const idx = text.indexOf(key);
    if (idx < 0) return fallback;
    const m = /\/([^\s{}()<>\[\]\/]+)/.exec(text.slice(idx + key.length));
    return m ? m[1] : fallback;
  };
  const readString = (key: string, fallback: string): string => {
    const idx = text.indexOf(key);
    if (idx < 0) return fallback;
    const m = /\(([^)]*)\)/.exec(text.slice(idx + key.length, idx + key.length + 120));
    return m ? m[1] : fallback;
  };
  const readNum = (key: string, fallback: number): number => {
    const idx = text.indexOf(key);
    if (idx < 0) return fallback;
    const m = /(-?\d+(?:\.\d+)?)/.exec(text.slice(idx + key.length, idx + key.length + 40));
    return m ? Number(m[1]) : fallback;
  };

  const fontName = readName("/FontName", "Type1Font");
  const familyName = readString("/FamilyName", fontName);
  const weight = readString("/Weight", "Regular");
  const italicAngle = readNum("/ItalicAngle", 0);

  // lenIV: spec default is 4 bytes of random padding before each charstring.
  const lenIVIdx = text.indexOf("/lenIV");
  const lenIV =
    lenIVIdx >= 0 ? readNum("/lenIV", 4) : 4;

  // --- charstrings ----------------------------------------------------------
  const csIdx = findIndex(stream, "/CharStrings");
  if (csIdx < 0) throw new Error("No /CharStrings dictionary found in the Type 1 font.");
  const beginIdx = findIndex(stream, "begin", csIdx);
  const cs = parseCharStrings(
    stream,
    beginIdx >= 0 ? beginIdx + 5 : csIdx + 12,
    lenIV,
  );
  if (!cs.order.length) throw new Error("The Type 1 font contains no glyphs.");

  // --- private subroutines -------------------------------------------------
  // The Subrs array always precedes /CharStrings in the Private dict, so it can
  // be scanned within [subrsIdx, csIdx) without running into glyph data.
  const subrsIdx = findIndex(stream, "/Subrs");
  const subrs =
    subrsIdx >= 0 && csIdx > subrsIdx
      ? parseSubrs(stream, subrsIdx + 6, csIdx, lenIV)
      : [];

  // --- encoding ------------------------------------------------------------
  const encIdx = findIndex(stream, "/Encoding");
  let encoding: (string | null)[] = new Array(256).fill(null);
  if (encIdx >= 0) {
    const after = stream.subarray(encIdx, Math.min(stream.length, encIdx + 12000));
    const stdIdx = findIndex(after, "StandardEncoding");
    if (stdIdx >= 0 && stdIdx < 40) {
      encoding = STANDARD_ENCODING.slice();
    } else {
      encoding = parseEncoding(stream, encIdx + 9);
    }
  }

  // Map standard-encoding char codes -> charstrings (needed by `seac`).
  const byStdCode = (code: number): Uint8Array | undefined => {
    const nm = STANDARD_ENCODING[code];
    if (nm) {
      const v = cs.map.get(nm);
      if (v) return v;
    }
    // fall back to the font's own encoding
    const n2 = encoding[code];
    return n2 ? cs.map.get(n2) : undefined;
  };

  const ctx: InterpCtx = { subrs, byStdCode, lenIV };

  // --- build glyphs ---------------------------------------------------------
  const glyphs: T1Glyph[] = [];
  const glyphByName = new Map<string, T1Glyph>();

  // .notdef must be glyph 0 so that cmap/POST stay consistent.
  const ordered = [
    ...(cs.map.has(".notdef") ? [".notdef"] : []),
    ...cs.order.filter((n) => n !== ".notdef"),
  ];

  for (const name of ordered) {
    const bytes = cs.map.get(name)!;
    let res: InterpResult;
    try {
      res = interpret(bytes, ctx);
    } catch {
      res = { commands: [], advanceWidth: 0 };
    }
    const g: T1Glyph = {
      name,
      advanceWidth: res.advanceWidth,
      commands: res.commands,
    };
    glyphByName.set(name, g);
    glyphs.push(g);
  }

  return {
    fontName,
    familyName,
    weight,
    italicAngle,
    unitsPerEm,
    ascender: bbox[3],
    descender: bbox[1],
    bbox,
    glyphs,
    glyphByName,
    encoding,
  };
}

/** glyph name -> Unicode codepoint (Adobe Glyph List subset + uniXXXX form). */
export function glyphNameToUnicode(name: string): number | null {
  if (NAME_TO_UNICODE[name] !== undefined) return NAME_TO_UNICODE[name];
  const uni = /^uni([0-9A-Fa-f]{4,6})$/.exec(name);
  if (uni) return parseInt(uni[1], 16);
  const u = /^u([0-9A-Fa-f]{4,6})$/.exec(name);
  if (u) return parseInt(u[1], 16);
  // "aacute" style composites are in the table; dotted names like "a.sc" are not.
  return null;
}

// ---------------------------------------------------------------- tables
// Adobe glyph names for ASCII 32..126, indexed by (code - 32).
const ASCII_NAMES = [
  "space","exclam","quotedbl","numbersign","dollar","percent","ampersand",
  "quotesingle","parenleft","parenright","asterisk","plus","comma","hyphen",
  "period","slash","zero","one","two","three","four","five","six","seven",
  "eight","nine","colon","semicolon","less","equal","greater","question","at",
  "A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S",
  "T","U","V","W","X","Y","Z","bracketleft","backslash","bracketright",
  "asciicircum","underscore","grave","a","b","c","d","e","f","g","h","i","j",
  "k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z","braceleft",
  "bar","braceright","asciitilde",
];

// Adobe StandardEncoding (code -> glyph name). Required to resolve `seac`
// composites, whose bchar/achar are standard-encoding char codes.
const STANDARD_ENCODING: (string | null)[] = (() => {
  const e: (string | null)[] = new Array(256).fill(null);
  const set = (code: number, name: string) => (e[code] = name);
  for (let c = 32; c <= 126; c++) set(c, ASCII_NAMES[c - 32]);
  set(161, "exclamdown");
  set(162, "cent");
  set(163, "sterling");
  set(164, "fraction");
  set(165, "yen");
  set(166, "florin");
  set(167, "section");
  set(168, "currency");
  set(169, "quotesingle");
  set(170, "quotedblleft");
  set(171, "guillemotleft");
  set(172, "guilsinglleft");
  set(173, "guilsinglright");
  set(174, "fi");
  set(175, "fl");
  set(177, "endash");
  set(178, "dagger");
  set(179, "daggerdbl");
  set(180, "periodcentered");
  set(182, "paragraph");
  set(183, "bullet");
  set(184, "quotesinglbase");
  set(185, "quotedblbase");
  set(186, "quotedblright");
  set(187, "guillemotright");
  set(188, "ellipsis");
  set(189, "perthousand");
  set(191, "questiondown");
  set(193, "grave");
  set(194, "acute");
  set(195, "circumflex");
  set(196, "tilde");
  set(197, "macron");
  set(198, "breve");
  set(199, "dotaccent");
  set(200, "dieresis");
  set(202, "ring");
  set(203, "cedilla");
  set(205, "hungarumlaut");
  set(206, "ogonek");
  set(207, "caron");
  set(208, "emdash");
  set(225, "AE");
  set(226, "ordfeminine");
  set(232, "Lslash");
  set(233, "Oslash");
  set(234, "OE");
  set(235, "ordmasculine");
  set(241, "ae");
  set(248, "lslash");
  set(249, "oslash");
  set(250, "oe");
  set(251, "germandbls");
  return e;
})();

// glyph name -> Unicode. Covers ASCII, Latin-1, Greek (needed by TeX/CM fonts),
// and the common punctuation/symbol names; `uniXXXX` is parsed dynamically.
const NAME_TO_UNICODE: Record<string, number> = (() => {
  const t: Record<string, number> = {};
  for (let c = 32; c <= 126; c++) t[ASCII_NAMES[c - 32]] = c;
  Object.assign(t, {
    // Latin-1 / Latin Extended-A
    Agrave:0x00c0,Aacute:0x00c1,Acircumflex:0x00c2,Atilde:0x00c3,Adieresis:0x00c4,
    Aring:0x00c5,AE:0x00c6,Ccedilla:0x00c7,Egrave:0x00c8,Eacute:0x00c9,
    Ecircumflex:0x00ca,Edieresis:0x00cb,Igrave:0x00cc,Iacute:0x00cd,
    Icircumflex:0x00ce,Idieresis:0x00cf,Eth:0x00d0,Ntilde:0x00d1,Ograve:0x00d2,
    Oacute:0x00d3,Ocircumflex:0x00d4,Otilde:0x00d5,Odieresis:0x00d6,
    Oslash:0x00d8,Ugrave:0x00d9,Uacute:0x00da,Ucircumflex:0x00db,
    Udieresis:0x00dc,Yacute:0x00dd,Thorn:0x00de,germandbls:0x00df,
    agrave:0x00e0,aacute:0x00e1,acircumflex:0x00e2,atilde:0x00e3,
    adieresis:0x00e4,aring:0x00e5,ae:0x00e6,ccedilla:0x00e7,egrave:0x00e8,
    eacute:0x00e9,ecircumflex:0x00ea,edieresis:0x00eb,igrave:0x00ec,
    iacute:0x00ed,icircumflex:0x00ee,idieresis:0x00ef,eth:0x00f0,
    ntilde:0x00f1,ograve:0x00f2,oacute:0x00f3,ocircumflex:0x00f4,
    otilde:0x00f5,odieresis:0x00f6,oslash:0x00f8,ugrave:0x00f9,
    uacute:0x00fa,ucircumflex:0x00fb,udieresis:0x00fc,yacute:0x00fd,
    thorn:0x00fe,ydieresis:0x00ff,
    Amacron:0x0100,amacron:0x0101,Abreve:0x0102,abreve:0x0103,
    Aogonek:0x0104,aogonek:0x0105,Cacute:0x0106,cacute:0x0107,
    Ccircumflex:0x0108,ccircumflex:0x0109,Cdotaccent:0x010a,cdotaccent:0x010b,
    Ccaron:0x010c,ccaron:0x010d,Dcaron:0x010e,dcaron:0x010f,
    Emacron:0x0112,emacron:0x0113,Eogonek:0x0118,eogonek:0x0119,
    Ecaron:0x011a,ecaron:0x011b,Gcircumflex:0x011c,gcircumflex:0x011d,
    Hcircumflex:0x0124,hcircumflex:0x0125,Itilde:0x0128,itilde:0x0129,
    Imacron:0x012a,imacron:0x012b,Iogonek:0x012e,iogonek:0x012f,
    Idotaccent:0x0130,dotlessi:0x0131,IJ:0x0132,ij:0x0133,
    Jcircumflex:0x0134,jcircumflex:0x0135,Lacute:0x0139,lacute:0x013a,
    Lcaron:0x013d,lcaron:0x013e,Lslash:0x0141,lslash:0x0142,
    Nacute:0x0143,nacute:0x0144,Ncaron:0x0147,ncaron:0x0148,
    Eng:0x014a,eng:0x014b,Omacron:0x014c,omacron:0x014d,
    Ohungarumlaut:0x0150,ohungarumlaut:0x0151,Racute:0x0154,racute:0x0155,
    Rcaron:0x0158,rcaron:0x0159,Sacute:0x015a,sacute:0x015b,
    Scircumflex:0x015c,scircumflex:0x015d,Scaron:0x0160,scaron:0x0161,
    Tcaron:0x0164,tcaron:0x0165,Tcedilla:0x0162,tcedilla:0x0163,
    Utilde:0x0168,utilde:0x0169,Umacron:0x016a,umacron:0x016b,
    Uring:0x016e,uring:0x016f,Uhungarumlaut:0x0170,uhungarumlaut:0x0171,
    Wcircumflex:0x0174,wcircumflex:0x0175,Ycircumflex:0x0176,
    ycircumflex:0x0177,Ydieresis:0x0178,Zacute:0x0179,zacute:0x017a,
    Zdotaccent:0x017b,zdotaccent:0x017c,Zcaron:0x017d,zcaron:0x017e,
    // Greek
    Alpha:0x0391,Beta:0x0392,Gamma:0x0393,Delta:0x0394,Epsilon:0x0395,
    Zeta:0x0396,Eta:0x0397,Theta:0x0398,Iota:0x0399,Kappa:0x039a,
    Lambda:0x039b,Mu:0x039c,Nu:0x039d,Xi:0x039e,Omicron:0x039f,
    Pi:0x03a0,Rho:0x03a1,Sigma:0x03a3,Tau:0x03a4,Upsilon:0x03a5,
    Phi:0x03a6,Chi:0x03a7,Psi:0x03a8,Omega:0x03a9,
    alpha:0x03b1,beta:0x03b2,gamma:0x03b3,delta:0x03b4,epsilon:0x03b5,
    zeta:0x03b6,eta:0x03b7,theta:0x03b8,iota:0x03b9,kappa:0x03ba,
    lambda:0x03bb,mu:0x03bc,nu:0x03bd,xi:0x03be,omicron:0x03bf,
    pi:0x03c0,rho:0x03c1,sigma1:0x03c2,sigma:0x03c3,tau:0x03c4,
    upsilon:0x03c5,phi:0x03c6,chi:0x03c7,psi:0x03c8,omega:0x03c9,
    theta1:0x03d1,phi1:0x03d5,omega1:0x03d6,upsilon1:0x03d2,
    // punctuation & symbols
    exclamdown:0x00a1,cent:0x00a2,sterling:0x00a3,fraction:0x2044,
    yen:0x00a5,florin:0x0192,section:0x00a7,currency:0x00a4,
    quotesingle:0x0027,quotedblleft:0x201c,guillemotleft:0x00ab,
    guilsinglleft:0x2039,guilsinglright:0x203a,fi:0xfb01,fl:0xfb02,
    endash:0x2013,dagger:0x2020,daggerdbl:0x2021,periodcentered:0x00b7,
    paragraph:0x00b6,bullet:0x2022,quotesinglbase:0x201a,
    quotedblbase:0x201e,quotedblright:0x201d,guillemotright:0x00bb,
    ellipsis:0x2026,perthousand:0x2030,questiondown:0x00bf,
    grave:0x0060,acute:0x00b4,circumflex:0x005e,tilde:0x007e,
    macron:0x00af,breve:0x02d8,dotaccent:0x02d9,dieresis:0x00a8,
    ring:0x02da,cedilla:0x00b8,hungarumlaut:0x02dd,ogonek:0x02db,
    caron:0x02c7,emdash:0x2014,ordfeminine:0x00aa,ordmasculine:0x00ba,
    plusminus:0x00b1,multiply:0x00d7,divide:0x00f7,notequal:0x2260,
    lessequal:0x2264,greaterequal:0x2265,partialdiff:0x2202,
    summation:0x2211,product:0x220f,pi_:0x03c0,integral:0x222b,
    Omega_:0x03a9,radical:0x221a,infinity:0x221e,nabla:0x2207,
    element:0x2208,notelement:0x2209,suchthat:0x220b,
    universal:0x2200,existential:0x2203,logicaland:0x2227,
    logicalor:0x2228,intersection:0x2229,union:0x222a,
    arrowleft:0x2190,arrowup:0x2191,arrowright:0x2192,arrowdown:0x2193,
    arrowboth:0x2194,arrowupdown:0x2195,copyright:0x00a9,
    registered:0x00ae,trademark:0x2122,degree:0x00b0,
    minute:0x2032,second:0x2033,
  });
  return t;
})();
