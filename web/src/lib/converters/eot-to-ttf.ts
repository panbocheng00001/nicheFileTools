//EOT → TTF/OTF: Unpack the EOT (Embedded OpenType) container and restore the internal sfnt font data.
//Zero dependencies (Documentation §4.6.2). V1/V2 uncompressed paths are fully supported; MTX/LZMAT compressed variants report errors truthfully.
import { IConverter, ConverterInfo, ConversionOptions, ConversionResult, defaultValidate } from "./interfaces";

/** MagicNumber ('PL' little-endian = 0x504C) in the EOT header fixed header (78 bytes) is located at offset 40.*/
const EOT_MAGIC_OFFSET = 40;
const EOT_MAGIC = 0x504c;
/** The starting point of the string area (after FamilyNameSize), where sfnt data starts to be scanned.*/
const EOT_HEADER_LEN = 78;
/** TTEMBED_TTCOMPRESSED - Font data is MicroType compressed (rare, a product of IE WEFT).*/
const FLAG_COMPRESSED = 0x00000004;

/** sfnt signature (file header 4 bytes, big-endian).*/
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
    //EOT header (fixed 78 bytes): MagicNumber(2) at offset 40
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

    //Locate the sfnt signature after the header string area (family/version/full/PostScript names + root string)
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
      //Some generators for FontDataSize are unreliable: fallback to end of file
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
