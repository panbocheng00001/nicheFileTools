//MTS / M2TS (AVCHD) → MP4: Use ffmpeg.wasm to remux or transcode.
// Default remux (copy video stream, re-encode audio to AAC); fall back to full transcode on failure.
import { fetchFile } from "@ffmpeg/util";
import {
  IConverter,
  ConverterInfo,
  ConversionOptions,
  ConversionResult,
  defaultValidate,
} from "./interfaces";
import { getFfmpeg } from "./ffmpeg-shared";

export class MtsToMp4Converter implements IConverter {
  readonly info: ConverterInfo = {
    id: "mts-to-mp4",
    name: "MTS to MP4",
    sourceFormats: [".mts", ".m2ts", ".avchd"],
    targetFormat: ".mp4",
    category: "video",
    maxWebFileSize: 100 * 1024 * 1024,
    classType: "B",
    description:
      "Remux AVCHD MTS/M2TS video into MP4 (H.264 + AAC) using FFmpeg (WASM).",
  };

  validate(file: File) {
    return defaultValidate(this.info, file);
  }

  async convert(options: ConversionOptions): Promise<ConversionResult> {
    let ffmpeg;
    try {
      ffmpeg = await getFfmpeg();
    } catch {
      throw new Error(
        "Failed to load the video engine (FFmpeg WASM). Check your network and retry, or use the desktop app for large files.",
      );
    }

    const inputData = await fetchFile(options.inputFile);
    await ffmpeg.writeFile("input.mts", inputData);

    // Pass 1: remux — copy H.264 video, re-encode audio to AAC (MP4 container
    // does not reliably carry AC3), faststart moov box to front for web playback.
    let ok = false;
    try {
      await ffmpeg.exec([
        "-i",
        "input.mts",
        "-c:v",
        "copy",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-movflags",
        "+faststart",
        "output.mp4",
      ]);
      ok = true;
    } catch {
      ok = false;
    }

    // Pass 2 (fallback): full transcode — needed when the source video stream
    // is not MP4-compatible (e.g. HEVC variants or odd profiles).
    if (!ok) {
      await ffmpeg.exec([
        "-i",
        "input.mts",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-movflags",
        "+faststart",
        "output.mp4",
      ]);
    }

    const out = await ffmpeg.readFile("output.mp4");
    let bytes: Uint8Array;
    if (typeof out === "string") {
      bytes = new TextEncoder().encode(out);
    } else {
      bytes = out as Uint8Array;
    }

    // sanity: MP4 must start with an ftyp box
    const sig = bytes.slice(4, 8);
    if (!(sig[0] === 0x66 && sig[1] === 0x74 && sig[2] === 0x79 && sig[3] === 0x70)) {
      throw new Error(
        "FFmpeg produced an invalid output. The source may use an unsupported codec — try the desktop app.",
      );
    }

    const blob = new Blob([bytes as unknown as BlobPart], { type: "video/mp4" });
    return {
      data: blob,
      filename: options.inputFile.name.replace(/\.(mts|m2ts|avchd)$/i, ".mp4"),
      size: bytes.byteLength,
      mimeType: "video/mp4",
    };
  }
}
