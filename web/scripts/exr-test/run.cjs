// Round-trip test for ExrToPngConverter (exr-to-png.js), executed in Node 22.
// Generates known EXR files, runs the real converter, and verifies PNG output pixels.
const zlib = require("zlib");
const UPNG = require("upng-js");
const { ExrToPngConverter } = require("./exr-to-png.js");

// ---------- EXR encoder (minimal, scanline single-part) ----------
const le32 = (v) => { const b = Buffer.alloc(4); b.writeUInt32LE(v, 0); return b; };

function floatToHalf(val) {
  if (val === 0) return 0;
  const f = new Float32Array([val]);
  const i = new Uint32Array(f.buffer)[0];
  const sign = (i >> 16) & 0x8000;
  let exp = ((i >> 23) & 0xff) - 127 + 15;
  const mant = i & 0x7fffff;
  if (exp <= 0) {
    if (exp < -10) return sign;
    const m = (mant | 0x800000) >> (1 - exp);
    return sign | (m >> 13);
  }
  if (exp >= 0x1f) return sign | 0x7c00;
  return sign | (exp << 10) | (mant >> 13);
}

// pixels2d: array of rows; each row = array of {r,g,b}; channel order B,G,R in bytes.
function rowBytes(pixels, pixelType) {
  const w = pixels.length;
  const row = Buffer.alloc(w * (pixelType === 1 ? 6 : 12));
  for (let x = 0; x < w; x++) {
    const p = pixels[x];
    // EXR stores channels alphabetically: B, G, R
    if (pixelType === 1) {
      row.writeUInt16LE(floatToHalf(p.b), x * 6 + 0);
      row.writeUInt16LE(floatToHalf(p.g), x * 6 + 2);
      row.writeUInt16LE(floatToHalf(p.r), x * 6 + 4);
    } else {
      row.writeFloatLE(p.b, x * 12 + 0);
      row.writeFloatLE(p.g, x * 12 + 4);
      row.writeFloatLE(p.r, x * 12 + 8);
    }
  }
  return row;
}

function predict(buf) {
  const u16 = new Uint16Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length));
  const out = Uint16Array.from(u16);
  // Delta-encode against the ORIGINAL previous value (u16[i-1]), NOT the
  // already-modified out[i-1]; doing it in-place corrupts the stream.
  for (let i = 1; i < out.length; i++) out[i] = (u16[i] - u16[i - 1]) & 0xffff;
  return Buffer.from(out.buffer, out.byteOffset, out.byteLength);
}

function makeExr(pixelType, compression, rows, { badMagic = false, version = 1 } = {}) {
  const chNames = ["B", "G", "R"];
  let chlist = Buffer.alloc(0);
  for (const n of chNames) {
    chlist = Buffer.concat([
      chlist,
      Buffer.from(n + "\0", "latin1"),
      le32(pixelType), le32(1), le32(1),
      Buffer.from([0, 0, 0, 0]), // pLinear + 3 pad
    ]);
  }
  chlist = Buffer.concat([chlist, Buffer.from([0])]); // terminator

  const dw = Buffer.concat([le32(0), le32(0), le32(rows[0].length - 1), le32(rows.length - 1)]);
  const attr = (name, type, val) =>
    Buffer.concat([Buffer.from(name + "\0", "latin1"), Buffer.from(type + "\0", "latin1"), le32(val.length), val]);

  let attrs = Buffer.alloc(0);
  attrs = Buffer.concat([attrs, attr("channels", "chlist", chlist)]);
  attrs = Buffer.concat([attrs, attr("dataWindow", "box2i", dw)]);
  attrs = Buffer.concat([attrs, attr("displayWindow", "box2i", dw)]);
  attrs = Buffer.concat([attrs, attr("compression", "compression", Buffer.from([compression]))]);
  attrs = Buffer.concat([attrs, Buffer.from([0])]); // end of attrs

  let body = Buffer.alloc(0);
  for (let y = 0; y < rows.length; y++) {
    let rb = rowBytes(rows[y], pixelType);
    if (compression === 2 || compression === 3) rb = zlib.deflateRawSync(predict(rb));
    body = Buffer.concat([body, le32(y), le32(rb.length), rb]);
  }

  const magic = badMagic ? Buffer.from([0, 1, 2, 3]) : Buffer.from([0x76, 0x2f, 0x31, 0x01]);
  return Buffer.concat([magic, le32(version), attrs, body]);
}

// ---------- helpers ----------
function expectedRGBA(vals) {
  const s = (v) => {
    const x = Math.max(0, Math.min(1, v / (1 + v)));
    const s2 = x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
    return Math.round(s2 * 255);
  };
  return [s(vals[0]), s(vals[1]), s(vals[2]), 255];
}

async function runConvert(buf, params) {
  const file = new File([buf], "test.exr", { type: "image/x-exr" });
  const c = new ExrToPngConverter();
  const res = await c.convert({ inputFile: file, outputFormat: ".png", params });
  const pngBuf = Buffer.from(await res.data.arrayBuffer());
  const dec = UPNG.decode(pngBuf);
  // toRGBA8 returns an ArrayBuffer (not Uint8Array); wrap it.
  const data = new Uint8Array(UPNG.toRGBA8(dec)[0]); // Uint8Array RGBA of first (only) frame
  return { res, data, pngBuf, width: dec.width, height: dec.height };
}

// ---------- tests ----------
let pass = 0, fail = 0;
function assert(name, cond, extra = "") {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name} ${extra}`); }
}

async function main() {
  const rows = [
    [{ r: 1, g: 0, b: 0 }, { r: 0, g: 1, b: 0 }],
    [{ r: 0, g: 0, b: 1 }, { r: 1, g: 1, b: 1 }],
  ];

  console.log("TEST 1: NO_COMPRESSION, FLOAT RGB");
  {
    const exr = makeExr(2, 0, rows);
    const { res, data, pngBuf, width, height } = await runConvert(exr);
    assert("PNG signature", pngBuf[0] === 0x89 && pngBuf[1] === 0x50 && pngBuf[2] === 0x4e && pngBuf[3] === 0x47, pngBuf.slice(0, 4).toString("hex"));
    assert("dimensions 2x2", width === 2 && height === 2, `got ${width}x${height}`);
    assert("mime image/png", res.mimeType === "image/png");
    assert("filename .png", res.filename === "test.png", res.filename);
    const px = (x, y) => [data[(y * 2 + x) * 4], data[(y * 2 + x) * 4 + 1], data[(y * 2 + x) * 4 + 2], data[(y * 2 + x) * 4 + 3]];
    assert("px(0,0)=(188,0,0,255)", JSON.stringify(px(0, 0)) === JSON.stringify(expectedRGBA([1, 0, 0])), JSON.stringify(px(0, 0)));
    assert("px(1,0)=(0,188,0,255)", JSON.stringify(px(1, 0)) === JSON.stringify(expectedRGBA([0, 1, 0])), JSON.stringify(px(1, 0)));
    assert("px(0,1)=(0,0,188,255)", JSON.stringify(px(0, 1)) === JSON.stringify(expectedRGBA([0, 0, 1])), JSON.stringify(px(0, 1)));
    assert("px(1,1)=(188,188,188,255)", JSON.stringify(px(1, 1)) === JSON.stringify(expectedRGBA([1, 1, 1])), JSON.stringify(px(1, 1)));
  }

  console.log("TEST 2: ZIPS (compression=2) FLOAT RGB");
  {
    const exr = makeExr(2, 2, rows);
    const { data } = await runConvert(exr);
    const px = (x, y) => [data[(y * 2 + x) * 4], data[(y * 2 + x) * 4 + 1], data[(y * 2 + x) * 4 + 2], data[(y * 2 + x) * 4 + 3]];
    assert("px(0,0) after ZIPS", JSON.stringify(px(0, 0)) === JSON.stringify(expectedRGBA([1, 0, 0])), JSON.stringify(px(0, 0)));
    assert("px(1,1) after ZIPS", JSON.stringify(px(1, 1)) === JSON.stringify(expectedRGBA([1, 1, 1])), JSON.stringify(px(1, 1)));
  }

  console.log("TEST 3: NO_COMPRESSION, HALF float RGB (halfToFloat path)");
  {
    const exr = makeExr(1, 0, rows);
    const { data } = await runConvert(exr);
    const px = (x, y) => [data[(y * 2 + x) * 4], data[(y * 2 + x) * 4 + 1], data[(y * 2 + x) * 4 + 2], data[(y * 2 + x) * 4 + 3]];
    assert("px(0,0) after HALF", JSON.stringify(px(0, 0)) === JSON.stringify(expectedRGBA([1, 0, 0])), JSON.stringify(px(0, 0)));
    assert("px(1,1) after HALF", JSON.stringify(px(1, 1)) === JSON.stringify(expectedRGBA([1, 1, 1])), JSON.stringify(px(1, 1)));
  }

  console.log("TEST 4: ACES tone mapping (vs Reinhard)");
  {
    const exr = makeExr(2, 0, rows);
    const { data } = await runConvert(exr, { toneMap: "aces", exposure: "1" });
    const aces = (v) => { const x = Math.max(0, Math.min(1, (v * (2.51 * v + 0.03)) / (v * (2.43 * v + 0.59) + 0.14))); const s2 = x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055; return Math.round(s2 * 255); };
    const got = data[(1 * 2 + 1) * 4]; // px(1,1) red channel (white)
    const exp = aces(1.0);
    assert("ACES px(1,1) red == computed", got === exp, `got ${got} expected ${exp}`);
  }

  console.log("TEST 5: Error - tiled EXR (version 2)");
  {
    const exr = makeExr(2, 0, rows, { version: 2 });
    let threw = false, msg = "";
    try { await runConvert(exr); } catch (e) { threw = true; msg = e.message; }
    assert("throws Tiled EXR", threw && /Tiled EXR/.test(msg), msg);
  }

  console.log("TEST 6: Error - bad magic");
  {
    const exr = makeExr(2, 0, rows, { badMagic: true });
    let threw = false, msg = "";
    try { await runConvert(exr); } catch (e) { threw = true; msg = e.message; }
    assert("throws Not a valid OpenEXR", threw && /valid OpenEXR/.test(msg), msg);
  }

  console.log("TEST 7: Error - PXR24 unsupported");
  {
    const exr = makeExr(2, 5, rows);
    let threw = false, msg = "";
    try { await runConvert(exr); } catch (e) { threw = true; msg = e.message; }
    assert("throws PXR24 unsupported", threw && /PXR24/.test(msg), msg);
  }

  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error("HARNESS ERROR:", e); process.exit(2); });
