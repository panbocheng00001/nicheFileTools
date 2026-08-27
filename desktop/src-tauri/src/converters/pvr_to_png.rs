use std::fs;
use std::path::Path;

use image::{ImageFormat, RgbaImage};

use crate::converters::Converter;
use crate::errors::AppError;

/// Little-endian magic for PVR v3: bytes `50 56 52 03` = 'P' 'V' 'R' 0x03.
const PVR3_MAGIC: u32 = 0x0352_5650;
const HEADER_LEN: usize = 52;

/// PVR (PowerVR texture) -> PNG.
///
/// Implements a self-contained PVR v3 (52-byte header) parser. For the
/// uncompressed 32-bit RGBA layout we decode directly and re-encode as PNG.
/// Compressed PVRTC/ETC/ASTC variants are not decoded in this build and return a
/// clear `NotImplemented` so the UI can route the user to the planned native
/// decoder or suggest the web tool where applicable.
pub struct PvrToPngConverter;

impl Converter for PvrToPngConverter {
    fn slug(&self) -> &'static str {
        "pvr-to-png"
    }
    fn class_type(&self) -> &'static str {
        "A"
    }
    fn convert(&self, input: &Path, output: &Path) -> Result<u64, AppError> {
        let data = fs::read(input)?;
        if data.len() < HEADER_LEN + 16 {
            return Err(AppError::InvalidFile(
                "File too small to be a PVR v3 image.".into(),
            ));
        }

        let magic = u32::from_le_bytes([data[0], data[1], data[2], data[3]]);
        if magic != PVR3_MAGIC {
            return Err(AppError::InvalidFile(
                "Not a valid PVR v3 file (bad magic). Expected 'PVR\\3'.".into(),
            ));
        }

        // Header fields we need (all little-endian).
        let _flags = u32::from_le_bytes([data[4], data[5], data[6], data[7]]);
        let _pixel_format_lo = u32::from_le_bytes([data[8], data[9], data[10], data[11]]);
        let _pixel_format_hi = u32::from_le_bytes([data[12], data[13], data[14], data[15]]);
        let _color_space = u32::from_le_bytes([data[16], data[17], data[18], data[19]]);
        let _channel_type = u32::from_le_bytes([data[20], data[21], data[22], data[23]]);
        let height = u32::from_le_bytes([data[24], data[25], data[26], data[27]]);
        let width = u32::from_le_bytes([data[28], data[29], data[30], data[31]]);
        let _depth = u32::from_le_bytes([data[32], data[33], data[34], data[35]]);
        let _num_surfaces = u32::from_le_bytes([data[36], data[37], data[38], data[39]]);
        let _num_faces = u32::from_le_bytes([data[40], data[41], data[42], data[43]]);
        let _num_mipmaps = u32::from_le_bytes([data[44], data[45], data[46], data[47]]);
        let meta_data_size = u32::from_le_bytes([data[48], data[49], data[50], data[51]]);

        if width == 0 || height == 0 {
            return Err(AppError::InvalidFile(
                "PVR header reports zero width/height.".into(),
            ));
        }

        let data_start = HEADER_LEN;
        let meta_start = data.len().saturating_sub(meta_data_size as usize);
        let data_len = meta_start.saturating_sub(data_start);
        let expected = width as usize * height as usize * 4;

        if data_len != expected {
            return Err(AppError::NotImplemented(
                "Compressed PVR variants (PVRTC/ETC/ASTC) are not decoded in this build. \
                 Convert from an uncompressed 32-bit RGBA PVR, or use the planned native decoder."
                    .into(),
            ));
        }

        // PVR stores RGBA per pixel, little-endian R,G,B,A.
        let rgba = data[data_start..data_start + expected].to_vec();
        let img = RgbaImage::from_raw(width, height, rgba).ok_or_else(|| {
            AppError::InvalidFile("Failed to build RGBA image buffer.".into())
        })?;
        img.save_with_format(output, ImageFormat::Png)
            .map_err(|e| AppError::Other(format!("PNG encode failed: {e}")))?;
        Ok(expected as u64)
    }
}
