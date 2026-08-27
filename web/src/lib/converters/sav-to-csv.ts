// SAV (SPSS) → CSV：纯 TS 解析（文档 §4.8.1，不依赖 sav-parser-wasm）。
// 支持：$FL2 未压缩 / $FL2 字节压缩 / $FL3 zlib(.zsav)；数值/字符串变量、
// sysmis 缺失值、>8 字节字符串宽度。局限：>255 字节长字符串分段记录输出为多列。
import { IConverter, ConverterInfo, ConversionOptions, ConversionResult, defaultValidate } from "./interfaces";

const SYSMIS = -1.7976931348623157e308;

interface SavVar {
  name: string;
  /** 0 = numeric；>0 = 字符串宽度（字节） */
  width: number;
}

async function inflateZlib(data: Uint8Array): Promise<Uint8Array<ArrayBuffer>> {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("This browser cannot decompress .zsav files (no DecompressionStream).");
  }
  const stream = new Blob([data as unknown as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function readDictionary(view: DataView, u8: Uint8Array): { vars: SavVar[]; dataOffset: number } {
  let o = 176; // header = 176 bytes
  const vars: SavVar[] = [];
  const dec = new TextDecoder("utf-8", { fatal: false });

  while (o + 4 <= u8.length) {
    const recType = view.getInt32(o, true);
    if (recType === 2) {
      // Variable record
      const type = view.getInt32(o + 4, true);
      const hasLabel = view.getInt32(o + 8, true);
      const nMissing = view.getInt32(o + 12, true);
      let p = o + 12 + 4 + 8 + 8; // 跳过 print/write 格式（各 8 字节，大端结构，无需解析）
      const nameLen = Math.min(u8[p], 64);
      const name = dec.decode(u8.subarray(p + 1, p + 1 + nameLen)).trim();
      p += 1 + 8; // nameLen(1) + 固定 8 字节 name 域（不足补空格）
      if (hasLabel) {
        const labelLen = view.getInt32(p, true);
        p += 4 + Math.ceil(labelLen / 4) * 4;
      }
      p += Math.abs(nMissing) * 8;
      vars.push({ name: name || `V${vars.length + 1}`, width: type });
      o = p;
    } else if (recType === 3) {
      // Value labels：n(4) + n×8 字节值（关联变量在随后的 type 4 记录）
      const n = view.getInt32(o + 4, true);
      o += 8 + n * 8;
    } else if (recType === 4) {
      const n = view.getInt32(o + 4, true);
      o += 8 + n * 4;
    } else if (recType === 6) {
      const n = view.getInt32(o + 4, true);
      o += 8 + n * 80;
    } else if (recType === 7) {
      const size = view.getInt32(o + 8, true);
      const count = view.getInt32(o + 12, true);
      o += 16 + size * count;
    } else if (recType === 999) {
      return { vars, dataOffset: o + 4 };
    } else if (recType === 0) {
      o += 4; // 对齐填充（罕见）
    } else {
      throw new Error(`Corrupt SAV dictionary: unknown record type ${recType} at byte ${o}.`);
    }
  }
  throw new Error("Corrupt SAV file: dictionary has no end-of-dictionary record.");
}

export class SavToCsvConverter implements IConverter {
  readonly info: ConverterInfo = {
    id: "sav-to-csv",
    name: "SAV to CSV",
    sourceFormats: [".sav", ".zsav"],
    targetFormat: ".csv",
    category: "data",
    maxWebFileSize: 200 * 1024 * 1024,
    classType: "A",
    description: "Export IBM SPSS Statistics data files to universal CSV.",
  };

  validate(file: File) {
    return defaultValidate(this.info, file);
  }

  async convert(options: ConversionOptions): Promise<ConversionResult> {
    const buf = await options.inputFile.arrayBuffer();
    const view = new DataView(buf);
    if (buf.byteLength < 176) throw new Error("File is too small to be a valid SPSS .sav file.");

    const magic = new TextDecoder().decode(new Uint8Array(buf, 0, 4));
    if (magic !== "$FL2" && magic !== "$FL3") {
      throw new Error("Not a valid SPSS SAV file (missing $FL2/$FL3 signature).");
    }
    const compressed = view.getInt32(72, true);
    const ncases = view.getInt32(80, true);
    const bias = view.getFloat64(84, true) || 100.0;

    const { vars, dataOffset } = readDictionary(view, new Uint8Array(buf));
    if (!vars.length) throw new Error("The SAV file declares no variables.");

    let data: Uint8Array<ArrayBuffer> = new Uint8Array(buf, dataOffset);
    if (magic === "$FL3" || compressed === 2) {
      data = await inflateZlib(data);
    }

    const rows: string[][] = [];
    const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const bytesPerCase = vars.reduce((s, v) => s + (v.width === 0 ? 8 : Math.ceil(v.width / 8) * 8), 0);

    const readString = (offset: number, width: number): string => {
      const bytes = data.subarray(offset, offset + width);
      let end = bytes.length;
      while (end > 0 && (bytes[end - 1] === 0x20 || bytes[end - 1] === 0x00)) end--;
      return new TextDecoder().decode(bytes.subarray(0, end));
    };

    if (compressed === 1) {
      // 字节压缩流：opcode 控制
      let p = 0;
      for (let c = 0; c < ncases && p < data.length; c++) {
        const row: string[] = [];
        for (const v of vars) {
          if (v.width === 0) {
            const op = data[p++];
            if (op === 252) { p = data.length; break; } // end-of-data
            if (op === 253) { row.push(num(dv.getFloat64(p, true))); p += 8; }
            else if (op === 254) { row.push(""); p += 8; }
            else if (op === 255) { row.push(""); }
            else { row.push(num(op - bias)); }
          } else {
            const segs = Math.ceil(v.width / 8);
            let s = "";
            for (let k = 0; k < segs; k++) {
              const op = data[p++];
              if (op === 254) { s += readString(p, 8); p += 8; }
              else if (op === 253) { p += 8; }
            }
            row.push(s.slice(0, v.width));
          }
        }
        if (row.length === vars.length) rows.push(row);
      }
    } else {
      // 未压缩布局：数值 8 字节 double，字符串 ceil(w/8)*8 字节
      for (let c = 0; c < ncases; c++) {
        const base = c * bytesPerCase;
        if (base + bytesPerCase > data.length) break;
        const row: string[] = [];
        let p = base;
        for (const v of vars) {
          if (v.width === 0) {
            row.push(num(dv.getFloat64(p, true)));
            p += 8;
          } else {
            row.push(readString(p, v.width));
            p += Math.ceil(v.width / 8) * 8;
          }
        }
        rows.push(row);
      }
    }

    const csv = "\uFEFF" + [vars.map((v) => csvCell(v.name)), ...rows.map((r) => r.map(csvCell).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    return {
      data: blob,
      filename: options.inputFile.name.replace(/\.(z?sav)$/i, ".csv"),
      size: blob.size,
      mimeType: "text/csv",
    };
  }
}

function num(v: number): string {
  if (v <= SYSMIS * 0.99) return ""; // sysmis（缺失）→ 空单元格
  return Number.isInteger(v) ? String(v) : String(v);
}

function csvCell(v: string): string {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}
