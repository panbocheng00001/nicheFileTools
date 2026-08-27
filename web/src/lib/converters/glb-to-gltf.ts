// GLB → glTF（自包含 .gltf，buffer 以 base64 data URI 内嵌）。
// 零依赖实现（文档 §4.2.3 的拆分思路，输出改为单文件 embedded glTF——浏览器单次下载
// 最实用，且对 Three.js/Babylon/Blender 等加载器语义完全等价）。
import { IConverter, ConverterInfo, ConversionOptions, ConversionResult, defaultValidate } from "./interfaces";

const GLB_MAGIC = 0x46546c67;
const CHUNK_JSON = 0x4e4f534a;
const CHUNK_BIN = 0x004e4942;

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const CHUNK = 0x8000; // 分块避免 String.fromCharCode 栈溢出
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

export class GlbToGltfConverter implements IConverter {
  readonly info: ConverterInfo = {
    id: "glb-to-gltf",
    name: "GLB to GLTF",
    sourceFormats: [".glb"],
    targetFormat: ".gltf",
    category: "3d",
    maxWebFileSize: 200 * 1024 * 1024,
    classType: "A",
    description: "Unpack a GLB binary into a text-editable, self-contained .gltf file.",
  };

  validate(file: File) {
    return defaultValidate(this.info, file);
  }

  async convert(options: ConversionOptions): Promise<ConversionResult> {
    const buffer = await options.inputFile.arrayBuffer();
    const view = new DataView(buffer);

    if (view.getUint32(0, true) !== GLB_MAGIC) {
      throw new Error("Not a valid GLB file (missing glTF magic 0x46546C67).");
    }
    const version = view.getUint32(4, true);
    if (version !== 2) {
      throw new Error(`Unsupported GLB version ${version}; only GLB 2.0 is supported.`);
    }
    const totalLength = view.getUint32(8, true);

    let offset = 12;
    let jsonChunk: Uint8Array | null = null;
    let binChunk: Uint8Array | null = null;
    while (offset + 8 <= Math.min(totalLength, buffer.byteLength)) {
      const chunkLength = view.getUint32(offset, true);
      const chunkType = view.getUint32(offset + 4, true);
      const data = new Uint8Array(buffer, offset + 8, chunkLength);
      if (chunkType === CHUNK_JSON && !jsonChunk) jsonChunk = data;
      else if (chunkType === CHUNK_BIN && !binChunk) binChunk = data;
      offset += 8 + chunkLength + ((8 + chunkLength) % 4); // chunk 尾部 4 字节对齐 padding
    }

    if (!jsonChunk) throw new Error("No JSON chunk found in GLB — the file may be corrupted.");

    let gltf: Record<string, unknown>;
    try {
      gltf = JSON.parse(new TextDecoder().decode(jsonChunk));
    } catch {
      throw new Error("The GLB's JSON chunk is not valid JSON.");
    }

    const buffers = gltf.buffers as { uri?: string }[] | undefined;
    if (binChunk && buffers && buffers[0]) {
      buffers[0].uri = `data:application/octet-stream;base64,${bytesToBase64(binChunk)}`;
    }

    const json = JSON.stringify(gltf, null, 2);
    const blob = new Blob([json], { type: "model/gltf+json" });
    return {
      data: blob,
      filename: options.inputFile.name.replace(/\.glb$/i, ".gltf"),
      size: blob.size,
      mimeType: "model/gltf+json",
    };
  }
}
