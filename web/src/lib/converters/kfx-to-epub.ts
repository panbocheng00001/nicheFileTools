import {
  ConverterInfo,
  ConversionOptions,
  ConversionResult,
  IConverter,
  defaultValidate,
  DesktopRequiredError,
} from "./interfaces";

// KFX is Amazon's proprietary format (DRIF metadata + Snappy-compressed content).
// A correct, license-clean KFX parser is a substantial reverse-engineering effort and
// is NOT bundled in this web build. Per 务实可跑, we implement the IConverter contract
// and degrade gracefully to the desktop app, which ships the full parser.
// See 技术需求文档 §4.1.1.
export class KfxToEpubConverter implements IConverter {
  readonly info: ConverterInfo = {
    id: "kfx-to-epub",
    name: "KFX to EPUB",
    sourceFormats: [".kfx"],
    targetFormat: ".epub",
    category: "ebook",
    maxWebFileSize: 50 * 1024 * 1024,
    classType: "A",
    description: "Convert Amazon Kindle KFX format to standard EPUB",
  };

  validate(file: File) {
    return defaultValidate(this.info, file);
  }

  async convert(_options: ConversionOptions): Promise<ConversionResult> {
    throw new DesktopRequiredError(
      "In-browser decoding of the proprietary KFX (DRIF + Snappy) structure is not enabled in this build. Please use the free desktop app, which includes the full KFX parser for DRM-free books.",
    );
  }
}
