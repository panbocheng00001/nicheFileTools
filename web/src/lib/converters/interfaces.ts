//Unified converter interface (aligned with Technical Requirements Document §2.5 IConverter).
// Web converters run 100% client-side; files never leave the device.

export type ToolCategory =
  | "ebook"
  | "3d"
  | "image"
  | "audio"
  | "video"
  | "font"
  | "archive"
  | "data";

export type ClassType = "A" | "B" | "C";

export interface ConversionOptions {
  inputFile: File;
  outputFormat: string;
  quality?: number;
  compressionLevel?: number;
  /** User parameters returned by the tool page options panel (such as sampling rate/bit depth/channel)*/
  params?: Record<string, string>;
  /** PFM→TTF and other tools that require supporting files (such as .pfb) are imported from the second upload area of ​​the UI*/
  pfbCompanion?: File;
  /**
   * Files chosen alongside the main one via a multi-select input.
   * Needed by tools whose input is a set rather than a single file: an .opf
   * always references sibling resources (XHTML/NCX), so uploading the .opf
   * alone can never produce a valid EPUB.
   */
  siblingFiles?: File[];
  // desktop-only passthrough (unused on web)
  batchSize?: number;
  outputDir?: string;
}

export interface ConversionResult {
  data: Blob;
  filename: string;
  size: number;
  mimeType: string;
  metadata?: Record<string, unknown>;
}

export interface ConverterInfo {
  id: string;
  name: string;
  sourceFormats: string[];
  targetFormat: string;
  category: ToolCategory;
  /** Web max file size in bytes. 0 = not supported on web (C class). */
  maxWebFileSize: number;
  classType: ClassType;
  description: string;
}

export interface IConverter {
  readonly info: ConverterInfo;
  convert(options: ConversionOptions): Promise<ConversionResult>;
  validate(file: File): { valid: boolean; error?: string };
}

/** Structured error thrown when a conversion cannot run in-browser. */
export class DesktopRequiredError extends Error {
  constructor(message = "This conversion requires the desktop application.") {
    super(message);
    this.name = "DesktopRequiredError";
  }
}

export const MB = 1024 * 1024;

export function defaultValidate(
  info: ConverterInfo,
  file: File,
): { valid: boolean; error?: string } {
  const ext = "." + (file.name.split(".").pop() ?? "").toLowerCase();
  if (!info.sourceFormats.includes(ext)) {
    return {
      valid: false,
      error: `Unsupported file. Please upload a ${info.sourceFormats.join(
        " / ",
      )} file.`,
    };
  }
  if (info.maxWebFileSize > 0 && file.size > info.maxWebFileSize) {
    const limit = Math.round(info.maxWebFileSize / MB);
    return {
      valid: false,
      error: `File exceeds the ${limit} MB browser limit. Use the desktop app for larger files.`,
    };
  }
  return { valid: true };
}
