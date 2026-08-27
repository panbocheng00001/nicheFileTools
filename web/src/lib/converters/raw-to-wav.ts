// RAW PCM → WAV：纯容器包装（技术需求文档 §4.4.1 原实现），零依赖、零质量损失。
import { IConverter, ConverterInfo, ConversionOptions, ConversionResult, defaultValidate } from "./interfaces";

export class RawToWavConverter implements IConverter {
  readonly info: ConverterInfo = {
    id: "raw-to-wav",
    name: "RAW to WAV",
    sourceFormats: [".raw", ".pcm", ".bin"],
    targetFormat: ".wav",
    category: "audio",
    maxWebFileSize: 500 * 1024 * 1024,
    classType: "A",
    description: "Wrap headerless PCM audio data in a standard RIFF/WAV container.",
  };

  validate(file: File) {
    return defaultValidate(this.info, file);
  }

  async convert(options: ConversionOptions): Promise<ConversionResult> {
    const raw = await options.inputFile.arrayBuffer();
    const p = options.params ?? {};

    const sampleRate = Number(p.sampleRate ?? 44100);
    const channels = Number(p.channels ?? 2);
    const bitsPerSample = Number(p.bitsPerSample ?? 16);
    if (![8000, 11025, 16000, 22050, 24000, 32000, 44100, 48000, 96000].includes(sampleRate)) {
      throw new Error(`Invalid sample rate: ${p.sampleRate}`);
    }
    if (![8, 16, 24, 32].includes(bitsPerSample)) {
      throw new Error(`Invalid bit depth: ${p.bitsPerSample}`);
    }
    if (![1, 2].includes(channels)) {
      throw new Error(`Invalid channel count: ${p.channels}`);
    }

    const dataSize = raw.byteLength;
    // data 区必须是块对齐整数倍，截掉尾部不完整样本
    const blockAlign = channels * (bitsPerSample / 8);
    const usable = dataSize - (dataSize % blockAlign);

    const header = new ArrayBuffer(44);
    const view = new DataView(header);
    const writeStr = (o: number, s: string) => {
      for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i));
    };

    writeStr(0, "RIFF");
    view.setUint32(4, 36 + usable, true);
    writeStr(8, "WAVE");
    writeStr(12, "fmt ");
    view.setUint32(16, 16, true); // PCM fmt chunk size
    view.setUint16(20, 1, true); // AudioFormat = PCM
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true); // ByteRate
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeStr(36, "data");
    view.setUint32(40, usable, true);

    const wav = new Blob([header, usable === dataSize ? raw : raw.slice(0, usable)], {
      type: "audio/wav",
    });

    return {
      data: wav,
      filename: options.inputFile.name.replace(/\.(raw|pcm|bin)$/i, ".wav"),
      size: 44 + usable,
      mimeType: "audio/wav",
    };
  }
}
