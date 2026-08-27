/**
 * 零依赖 ZIP 读/写工具（浏览器原生 API）。
 * - 读：解析 local file headers，stored 直接切片，deflate 用 DecompressionStream('deflate-raw')
 * - 写：仅 store 模式（EPUB mimetype 要求 stored；其余条目也用 stored 保证兼容）
 * 供 opf-to-epub 使用（技术需求文档 §4.1.2：不引入 jszip，零依赖实现）。
 */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

async function inflate(data: Uint8Array, format: "deflate" | "deflate-raw"): Promise<Uint8Array> {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("This browser cannot decompress ZIP entries (no DecompressionStream).");
  }
  const ds = new DecompressionStream(format);
  const stream = new Blob([data as unknown as BlobPart]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

/** 顺序解析 ZIP local file headers（覆盖 Python zipfile / 系统工具生成的常规 ZIP）。 */
export async function readZip(buf: ArrayBuffer): Promise<ZipEntry[]> {
  const u8 = new Uint8Array(buf);
  const view = new DataView(buf);
  const dec = new TextDecoder();
  const entries: ZipEntry[] = [];
  let o = 0;
  while (o + 30 <= u8.length) {
    if (view.getUint32(o, true) !== 0x04034b50) break; // 不再是 local header（到了 central directory）
    const method = view.getUint16(o + 8, true);
    const compSize = view.getUint32(o + 18, true);
    const nameLen = view.getUint16(o + 26, true);
    const extraLen = view.getUint16(o + 28, true);
    const name = dec.decode(u8.subarray(o + 30, o + 30 + nameLen));
    const dataStart = o + 30 + nameLen + extraLen;
    const raw = u8.subarray(dataStart, dataStart + compSize);
    if (name.endsWith("/")) {
      // 目录条目，跳过
    } else if (method === 0) {
      entries.push({ name, data: raw });
    } else if (method === 8) {
      entries.push({ name, data: await inflate(raw, "deflate-raw") });
    } else {
      throw new Error(`Unsupported ZIP compression method ${method} for "${name}".`);
    }
    o = dataStart + compSize;
  }
  if (!entries.length) throw new Error("No readable files found in the ZIP archive.");
  return entries;
}

/** 生成 ZIP（全部 stored）。第一项约定为 mimetype（EPUB 规范要求）。 */
export function buildZip(entries: ZipEntry[]): Blob {
  const enc = new TextEncoder();
  const chunks: BlobPart[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  for (const e of entries) {
    const nameBytes = enc.encode(e.name);
    const crc = crc32(e.data);
    const size = e.data.length;

    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true); // version needed
    lv.setUint16(6, 0x0800, true); // UTF-8 names
    lv.setUint16(8, 0, true); // stored
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true);
    lv.setUint32(22, size, true);
    lv.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);

    chunks.push(local as unknown as BlobPart, e.data as unknown as BlobPart);

    const cd = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(cd.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint32(42, offset, true);
    cd.set(nameBytes, 46);
    central.push(cd);

    offset += local.length + size;
  }

  const centralSize = central.reduce((s, c) => s + c.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);

  return new Blob([...chunks, ...central.map((c) => c as unknown as BlobPart), eocd as unknown as BlobPart], {
    type: "application/zip",
  });
}
