import {
  ConverterInfo,
  ConversionOptions,
  ConversionResult,
  IConverter,
  defaultValidate,
  DesktopRequiredError,
} from "./interfaces";

// PVR (PowerVR Texture) v3 decoder.
// (技术规范 §4.3.1 names pvr-texture-decoder-wasm; here we ship a self-contained
// decoder that handles uncompressed 32-bit RGBA PVR v3 files with no external
// dependency, and degrades gracefully for compressed variants.)
const PVR3_MAGIC = 0x03525650;

interface PvrHeader {
  version: number;
  flags: number;
  pixelFormat: bigint;
  colorSpace: number;
  channelType: number;
  height: number;
  width: number;
  depth: number;
  numSurfaces: number;
  numFaces: number;
  numMipmaps: number;
  metaDataSize: number;
}

function parsePvrHeader(buffer: ArrayBuffer): PvrHeader {
  const dv = new DataView(buffer);
  return {
    version: dv.getUint32(0, true),
    flags: dv.getUint32(4, true),
    pixelFormat: dv.getBigUint64(8, true),
    colorSpace: dv.getUint32(16, true),
    channelType: dv.getUint32(20, true),
    height: dv.getUint32(24, true),
    width: dv.getUint32(28, true),
    depth: dv.getUint32(32, true),
    numSurfaces: dv.getUint32(36, true),
    numFaces: dv.getUint32(40, true),
    numMipmaps: dv.getUint32(44, true),
    metaDataSize: dv.getUint32(48, true),
  };
}

export class PvrToPngConverter implements IConverter {
  readonly info: ConverterInfo = {
    id: "pvr-to-png",
    name: "PVR to PNG",
    sourceFormats: [".pvr"],
    targetFormat: ".png",
    category: "image",
    maxWebFileSize: 100 * 1024 * 1024,
    classType: "A",
    description: "Convert PowerVR textures to PNG images",
  };

  validate(file: File) {
    return defaultValidate(this.info, file);
  }

  async convert(options: ConversionOptions): Promise<ConversionResult> {
    const buffer = await options.inputFile.arrayBuffer();
    const header = parsePvrHeader(buffer);

    if (header.version !== PVR3_MAGIC) {
      throw new DesktopRequiredError(
        "Not a valid PVR v3 file (bad magic number). Expected 'PVR\\3'.",
      );
    }

    const w = header.width;
    const h = header.height;
    if (w === 0 || h === 0) {
      throw new DesktopRequiredError("PVR header reports zero width/height.");
    }

    // First mipmap data starts at byte 52; metadata block is at the end.
    const dataStart = 52;
    const metaStart = buffer.byteLength - header.metaDataSize;
    const dataLen = metaStart - dataStart;
    const expected = w * h * 4;

    let rgba: Uint8ClampedArray;
    if (dataLen === expected) {
      // Heuristic: uncompressed 32-bit RGBA (R,G,B,A per pixel, little-endian).
      const view = new Uint8Array(buffer, dataStart, dataLen);
      rgba = new Uint8ClampedArray(view);
    } else {
      throw new DesktopRequiredError(
        `Compressed PVR variants (PVRTC/ETC/ASTC) are not decoded in-browser in this build. ` +
          `Data size (${dataLen} bytes) does not match uncompressed RGBA (${expected} bytes). ` +
          `Please use the free desktop app for compressed PVR files.`,
      );
    }

    const blob = await rgbaToPngBlob(rgba, w, h);
    return {
      data: blob,
      filename: options.inputFile.name.replace(/\.pvr$/i, ".png"),
      size: blob.size,
      mimeType: "image/png",
    };
  }
}

async function rgbaToPngBlob(
  rgba: Uint8ClampedArray,
  w: number,
  h: number,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  const img = ctx.createImageData(w, h);
  img.data.set(rgba);
  ctx.putImageData(img, 0, 0);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("PNG encoding failed"))),
      "image/png",
    );
  });
}
