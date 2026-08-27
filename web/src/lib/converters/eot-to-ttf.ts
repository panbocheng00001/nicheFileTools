// EOT → TTF/OTF：解包 EOT（Embedded OpenType）容器，还原内部 sfnt 字体数据。
// 零依赖（文档 §4.6.2）。V1/V2 未压缩路径完整支持；MTX/LZMAT 压缩变体如实报错。
import { IConverter, ConverterInfo, ConversionOptions, ConversionResult, defaultValidate } from "./interfaces";

/** EOT header 固定头（78 字节）内 MagicNumber（'PL' little-endian = 0x504C）位于 offset 40。 */
const EOT_MAGIC_OFFSET = 40;
const EOT_MAGIC = 0x504c;
/** 字符串区起点（FamilyNameSize 之后），sfnt 数据从这里开始扫描。 */
const EOT_HEADER_LEN = 78;
/** TTEMBED_TTCOMPRESSED —— 字体数据经 MicroType 压缩（罕见，IE WEFT 产物）。 */
const FLAG_COMPRESSED = 0x00000004;

/** sfnt 签名（文件头 4 字节，big-endian）。 */
const SFNT_SIGS: { bytes: number[]; ext: string; mime: string }[] = [
  { bytes: [0x00, 0x01, 0x00, 0x00], ext: ".ttf", mime: "font/ttf" },
  { bytes: [0x4f, 0x54, 0x54, 0x4f], ext: ".otf", mime: "font/otf" }, // 'OTTO'
  { bytes: [0x74, 0x72, 0x75, 0x65], ext: ".ttf", mime: "font/ttf" }, // 'true'
  { bytes: [0x74, 0x74, 0x63, 0x66], ext: ".ttf", mime: "font/ttf" }, // 'ttcf'
];

export class EotToTtfConverter implements IConverter {
  readonly info: ConverterInfo = {
    id: "eot-to-ttf",
    name: "EOT to TTF",
    sourceFormats: [".eot"],
    targetFormat: ".ttf",
    category: "font",
    maxWebFileSize: 10 * 1024 * 1024,
    classType: "A",
    description: "Extract the original TTF/OTF font from a legacy IE EOT wrapper.",
  };

  validate(file: File) {
    return defaultValidate(this.info, file);
  }

  async convert(options: ConversionOptions): Promise<ConversionResult> {
    const buf = await options.inputFile.arrayBuffer();
    const view = new DataView(buf);
    const u8 = new Uint8Array(buf);

    if (buf.byteLength < 78) {
      throw new Error("File is too small to be a valid EOT font.");
    }
    // EOT header（固定 78 字节）：MagicNumber(2) 位于 offset 40
    const fontDataSize = view.getUint32(4, true);
    const flags = view.getUint32(12, true);
    if (view.getUint16(EOT_MAGIC_OFFSET, true) !== EOT_MAGIC) {
      throw new Error(
        "Not a valid EOT file (missing EOT magic 0x504C). If this is already a .ttf/.otf, it needs no conversion.",
      );
    }
    if (flags & FLAG_COMPRESSED) {
      throw new Error(
        "This EOT uses MicroType (MTX/LZMAT) compression, which is not supported. Re-export the font or use the original TTF.",
      );
    }

    // 在头部字符串区（family/version/full/PostScript names + root string）之后定位 sfnt 签名
    const scanEnd = Math.min(u8.length, 4096);
    let found = -1;
    let matched = SFNT_SIGS[0];
    for (let i = EOT_HEADER_LEN; i + 4 <= scanEnd; i++) {
      const hit = SFNT_SIGS.find((s) =>
        s.bytes.every((b, j) => u8[i + j] === b),
      );
      if (hit) {
        found = i;
        matched = hit;
        break;
      }
    }
    if (found < 0) {
      throw new Error("No embedded TTF/OTF font data found inside the EOT container.");
    }

    let size = fontDataSize;
    if (size <= 0 || found + size > u8.length) {
      // 某些生成器 FontDataSize 不可靠：退化到文件末尾
      size = u8.length - found;
      if (size <= 0) throw new Error("EOT declares zero-length font data.");
    }

    const fontData = u8.slice(found, found + size);
    return {
      data: new Blob([fontData as unknown as BlobPart], { type: matched.mime }),
      filename: options.inputFile.name.replace(/\.eot$/i, matched.ext),
      size,
      mimeType: matched.mime,
    };
  }
}
