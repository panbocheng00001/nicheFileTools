//RAW PCM → WAV: pure container packaging (technical requirements document §4.4.1 original implementation), zero dependence, zero quality loss.
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
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = channels * bytesPerSample;

    // Raw PCM has no header, so the parameters above are the *only* thing that
    // tells us how to interpret the bytes. If the data length is not a multiple
    // of the block size, the stream is being mis-framed: silently truncating it
    // (or wrapping it) yields audio at the wrong speed with interleaved
    // channels shuffled. Detect it and tell the user which settings fit.
    const remainder = dataSize % blockAlign;
    if (remainder !== 0) {
      const fits: string[] = [];
      for (const ch of [1, 2]) {
        for (const bits of [8, 16, 24, 32]) {
          if (ch === channels && bits === bitsPerSample) continue;
          if (dataSize % (ch * (bits / 8)) === 0) {
            fits.push(`${ch === 1 ? "Mono" : "Stereo"} at ${bits}-bit`);
          }
        }
      }
      const hint = fits.length
        ? ` These settings fit the file exactly: ${fits.slice(0, 3).join(", ")}.`
        : " Check the sample rate / bit depth / channels — one of them does not match the source.";
      throw new Error(
        `The file is ${dataSize} bytes, which is not a multiple of the block size ${blockAlign} bytes ` +
          `(Channels ${channels} × ${bitsPerSample}-bit) — ${remainder} trailing byte(s) would be misread, ` +
          `producing audio at the wrong speed with garbled stereo.${hint}`,
      );
    }

    const usable = dataSize;

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

    // Length is validated above, so the whole payload is always usable.
    const wav = new Blob([header, raw], { type: "audio/wav" });

    return {
      data: wav,
      filename: options.inputFile.name.replace(/\.(raw|pcm|bin)$/i, ".wav"),
      size: 44 + usable,
      mimeType: "audio/wav",
    };
  }
}
