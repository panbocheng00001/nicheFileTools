"use strict";
// Unified converter interface (aligned with 技术需求文档 §2.5 IConverter).
// Web converters run 100% client-side; files never leave the device.
Object.defineProperty(exports, "__esModule", { value: true });
exports.MB = exports.DesktopRequiredError = void 0;
exports.defaultValidate = defaultValidate;
/** Structured error thrown when a conversion cannot run in-browser. */
class DesktopRequiredError extends Error {
    constructor(message = "This conversion requires the desktop application.") {
        super(message);
        this.name = "DesktopRequiredError";
    }
}
exports.DesktopRequiredError = DesktopRequiredError;
exports.MB = 1024 * 1024;
function defaultValidate(info, file) {
    const ext = "." + (file.name.split(".").pop() ?? "").toLowerCase();
    if (!info.sourceFormats.includes(ext)) {
        return {
            valid: false,
            error: `Unsupported file. Please upload a ${info.sourceFormats.join(" / ")} file.`,
        };
    }
    if (info.maxWebFileSize > 0 && file.size > info.maxWebFileSize) {
        const limit = Math.round(info.maxWebFileSize / exports.MB);
        return {
            valid: false,
            error: `File exceeds the ${limit} MB browser limit. Use the desktop app for larger files.`,
        };
    }
    return { valid: true };
}
