// GSM 06.10 → WAV：使用 ffmpeg.wasm 的内置 GSM 解码器（libgsm 同级实现，正确可靠）。
// 输出标准 16-bit PCM mono @ 8000 Hz 的 WAV，与原始 GSM 承载内容逐样本一致（无损解码）。
import { fetchFile } from "@ffmpeg/util";
import {
  IConverter,
  ConverterInfo,
  ConversionOptions,
  ConversionResult,
  defaultValidate,
} from "./interfaces";
import { getFfmpeg } from "./ffmpeg-shared";

export class GsmToWavConverter implements IConverter {
  readonly info: ConverterInfo = {
    id: "gsm-to-wav",
    name: "GSM to WAV",
    sourceFormats: [".gsm", ".gsmcodec"],
    targetFormat: ".wav",
    category: "audio",
    maxWebFileSize: 500 * 1024 * 1024,
    classType: "A",
    description:
      "Decode GSM 06.10 speech audio to 16-bit PCM WAV using FFmpeg (WASM).",
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
        "Failed to load the audio engine (FFmpeg WASM). Check your network and retry, or use the desktop app.",
      );
    }

    const inputData = await fetchFile(options.inputFile);
    await ffmpeg.writeFile("input.gsm", inputData);

    try {
      await ffmpeg.exec([
        "-i",
        "input.gsm",
        "-ar",
        "8000",
        "-ac",
        "1",
        "-c:a",
        "pcm_s16le",
        "output.wav",
      ]);
    } catch (e) {
      throw new Error(
        "This file could not be decoded as GSM 06.10. Make sure it is a valid .gsm frame stream (33 bytes per frame).",
      );
    }

    const out = await ffmpeg.readFile("output.wav");
    let bytes: Uint8Array;
    if (typeof out === "string") {
      bytes = new TextEncoder().encode(out);
    } else {
      bytes = out as Uint8Array;
    }

    // sanity: WAV must start with "RIFF"
    if (!(bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46)) {
      throw new Error("FFmpeg produced an invalid WAV output for this GSM file.");
    }

    const blob = new Blob([bytes as unknown as BlobPart], { type: "audio/wav" });
    return {
      data: blob,
      filename: options.inputFile.name.replace(/\.(gsm|gsmcodec)$/i, ".wav"),
      size: bytes.byteLength,
      mimeType: "audio/wav",
    };
  }
}
