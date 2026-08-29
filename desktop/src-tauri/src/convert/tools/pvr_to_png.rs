use std::fs;
use std::path::Path;

use image::{GrayImage, ImageFormat, RgbImage, RgbaImage};

use crate::convert::converter::Converter;
use crate::convert::engine::Engine;
use crate::errors::AppError;

/// Little-endian magic for PVR v3: bytes `50 56 52 03` = 'P' 'V' 'R' 0x03.
const PVR3_MAGIC: u32 = 0x0352_5650;
const HEADER_LEN: usize = 52;

/// PVR (PowerVR texture) -> PNG.
///
/// Implements a self-contained PVR v3 (52-byte header) parser. Uncompressed
/// layouts are decoded directly and re-encoded as PNG:
///   - 4 bytes/pixel -> RGBA8888
///   - 3 bytes/pixel -> RGB888
///   - 1 byte/pixel  -> L8 (grayscale / alpha)
///
/// 2-byte uncompressed layouts (RGB565 / RGBA4444 / RGBA5551 / LA88) and all
/// compressed variants (PVRTC / ETC / ETC2 / ASTC / DXT) require the planned
/// native block decoder and currently return a clear `NotImplemented` (技术文档
/// §6.1). This avoids silently emitting corrupt images for ambiguous/compressed
/// pixel formats.
pub struct PvrToPngConverter;

impl Converter for PvrToPngConverter {
    fn slug(&self) -> &'static str {
        "pvr-to-png"
    }
    fn class_type(&self) -> &'static str {
        "A"
    }
    fn engines(&self) -> &'static [Engine] {
        &[Engine::RustNative]
    }
    fn convert(&self, input: &Path, output: &Path) -> Result<u64, AppError> {
        let data = fs::read(input)?;
        if data.len() < HEADER_LEN + 16 {
            return Err(AppError::InvalidFile("File too small to be a PVR v3 image.".into()));
        }

        let magic = u32::from_le_bytes([data[0], data[1], data[2], data[3]]);
        if magic != PVR3_MAGIC {
            return Err(AppError::InvalidFile(
                "Not a valid PVR v3 file (bad magic). Expected 'PVR\\3'.".into(),
            ));
        }

        let height = u32::from_le_bytes([data[24], data[25], data[26], data[27]]);
        let width = u32::from_le_bytes([data[28], data[29], data[30], data[31]]);
        let meta_data_size = u32::from_le_bytes([data[48], data[49], data[50], data[51]]);
        if width == 0 || height == 0 {
            return Err(AppError::InvalidFile("PVR header reports zero width/height.".into()));
        }

        let data_start = HEADER_LEN;
        let meta_start = data.len().saturating_sub(meta_data_size as usize);
        let data_len = meta_start.saturating_sub(data_start);
        let px = width as usize * height as usize;

        let bytes_per_px = if data_len == px * 4 {
            4
        } else if data_len == px * 3 {
            3
        } else if data_len == px {
            1
        } else {
            return Err(AppError::NotImplemented(
                "This PVR layout is not decoded yet. Supported: uncompressed RGBA8888 (4B), \
                 RGB888 (3B), L8 (1B). Compressed/2-byte layouts need the planned native \
                 decoder; for those use the web tool or an external texture converter."
                    .into(),
            ));
        };

        let n = px * bytes_per_px;
        match bytes_per_px {
            4 => {
                let img = RgbaImage::from_raw(width, height, data[data_start..data_start + n].to_vec())
                    .ok_or_else(|| AppError::InvalidFile("Failed to build RGBA image buffer.".into()))?;
                img.save_with_format(output, ImageFormat::Png)
                    .map_err(|e| AppError::Other(format!("PNG encode failed: {e}")))?;
            }
            3 => {
                let img = RgbImage::from_raw(width, height, data[data_start..data_start + n].to_vec())
                    .ok_or_else(|| AppError::InvalidFile("Failed to build RGB image buffer.".into()))?;
                img.save_with_format(output, ImageFormat::Png)
                    .map_err(|e| AppError::Other(format!("PNG encode failed: {e}")))?;
            }
            _ => {
                let img = GrayImage::from_raw(width, height, data[data_start..data_start + n].to_vec())
                    .ok_or_else(|| AppError::InvalidFile("Failed to build L8 image buffer.".into()))?;
                img.save_with_format(output, ImageFormat::Png)
                    .map_err(|e| AppError::Other(format!("PNG encode failed: {e}")))?;
            }
        }

        let size = fs::metadata(output).map(|m| m.len()).unwrap_or(0);
        Ok(size)
    }
}
