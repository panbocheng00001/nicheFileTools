import {
  ConverterInfo,
  ConversionOptions,
  ConversionResult,
  IConverter,
  defaultValidate,
  DesktopRequiredError,
} from "./interfaces";

// PRT -> STL requires tessellating a CAD B-Rep via the OCCT kernel. The OCCT WASM
// build is large and not bundled in this web build, so we degrade gracefully to the
// desktop app (which calls FreeCAD/OCCT). See technical requirements doc §4.2.1.
export class PrtToStlConverter implements IConverter {
  readonly info: ConverterInfo = {
    id: "prt-to-stl",
    name: "PRT to STL",
    sourceFormats: [".prt"],
    targetFormat: ".stl",
    category: "3d",
    maxWebFileSize: 20 * 1024 * 1024,
    classType: "B",
    description: "Convert Pro/ENGINEER Creo PRT files to STL for 3D printing",
  };

  validate(file: File) {
    return defaultValidate(this.info, file);
  }

  async convert(_options: ConversionOptions): Promise<ConversionResult> {
    throw new DesktopRequiredError(
      "Browser-based CAD tessellation requires the OCCT kernel, which is not bundled in this web build. For files up to 20 MB this will be enabled via a WASM worker; larger PRT files should use the free desktop app.",
    );
  }
}
