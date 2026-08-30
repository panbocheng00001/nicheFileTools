import {
  ConverterInfo,
  ConversionOptions,
  ConversionResult,
  IConverter,
  defaultValidate,
  DesktopRequiredError,
} from "./interfaces";

// BLEND -> GLB requires parsing Blender's DNA structure. A correct parser needs a
// bundled Blender/blend WASM which is not included in this web build, so we degrade
//gracefully to the desktop app (which calls Blender's Python API). See Technical Requirements Document §4.2.2.
export class BlendToGlbConverter implements IConverter {
  readonly info: ConverterInfo = {
    id: "blend-to-glb",
    name: "BLEND to GLB",
    sourceFormats: [".blend"],
    targetFormat: ".glb",
    category: "3d",
    maxWebFileSize: 30 * 1024 * 1024,
    classType: "B",
    description: "Convert Blender BLEND files to GLB (glTF Binary)",
  };

  validate(file: File) {
    return defaultValidate(this.info, file);
  }

  async convert(_options: ConversionOptions): Promise<ConversionResult> {
    throw new DesktopRequiredError(
      "In-browser BLEND parsing requires a bundled Blender/blend WASM which is not included in this web build. Please use the free desktop app for full BLEND to GLB conversion.",
    );
  }
}
