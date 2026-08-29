use std::fs;
use std::path::Path;

use image::{DynamicImage, ImageFormat};

use crate::convert::converter::Converter;
use crate::convert::engine::Engine;
use crate::errors::AppError;

/// EXR (OpenEXR HDR) -> PNG.
///
/// Uses the `image` crate's built-in EXR decoder (the `exr` feature) — no custom
/// decoder to maintain. EXR is floating-point HDR, so we map it to 8-bit PNG by
/// clamping (linear [0,1] -> [0,255]). For lossless HDR round-trips prefer the
/// source EXR; this path is for quick preview/compat.
pub struct ExrToPngConverter;

impl Converter for ExrToPngConverter {
    fn slug(&self) -> &'static str {
        "exr-to-png"
    }
    fn class_type(&self) -> &'static str {
        "A"
    }
    fn engines(&self) -> &'static [Engine] {
        &[Engine::RustNative]
    }
    fn convert(&self, input: &Path, output: &Path) -> Result<u64, AppError> {
        let img: DynamicImage = image::open(input)
            .map_err(|e| AppError::InvalidFile(format!("Failed to decode EXR: {e}")))?;

        let rgba = img.to_rgba8();
        rgba.save_with_format(output, ImageFormat::Png)
            .map_err(|e| AppError::Other(format!("PNG encode failed: {e}")))?;

        let size = fs::metadata(output).map(|m| m.len()).unwrap_or(0);
        Ok(size)
    }
}
