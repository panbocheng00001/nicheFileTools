use std::fs;
use std::path::Path;

use crate::convert::converter::Converter;
use crate::convert::engine::Engine;
use crate::errors::AppError;

/// EOT (Embedded OpenType) -> TTF/OTF.
///
/// EOT is a wrapper around a normal font (TTF/OTF) plus a header of metadata and
/// a trailing root string. This converter locates the embedded font by scanning
/// for the standard font magic ("\x00\x01\x00\x00", "OTTO", "true") and writes
/// those bytes out unchanged — a pure byte extraction, zero quality loss.
pub struct EotToTtfConverter;

const TTF_MAGICS: &[&[u8]] = &[
    &[0x00, 0x01, 0x00, 0x00], // TrueType
    b"OTTO",                   // OpenType (CFF)
    b"true",                   // TrueType (Mac)
    b"typ1",                   // Type 1 in sfnt wrapper
];

impl Converter for EotToTtfConverter {
    fn slug(&self) -> &'static str {
        "eot-to-ttf"
    }
    fn class_type(&self) -> &'static str {
        "A"
    }
    fn engines(&self) -> &'static [Engine] {
        &[Engine::RustNative]
    }
    fn convert(&self, input: &Path, output: &Path) -> Result<u64, AppError> {
        let data = fs::read(input)?;
        if data.len() < 16 {
            return Err(AppError::InvalidFile("File too small to be an EOT.".into()));
        }

        // The embedded font size is recorded at bytes 4..8 (uint32 LE).
        let font_data_size = u32::from_le_bytes([data[4], data[5], data[6], data[7]]) as usize;

        // Scan for the embedded font magic, starting after the fixed header so we
        // don't accidentally match a root string later in the file.
        let start = find_font(&data, 12).ok_or_else(|| {
            AppError::InvalidFile("No embedded TTF/OTF found inside the EOT container.".into())
        })?;

        let end = if font_data_size > 0 && start + font_data_size <= data.len() {
            start + font_data_size
        } else {
            // Fall back to scanning for the next magic after `start`, else EOF.
            find_font(&data[start + 1..], start + 1).unwrap_or(data.len())
        };

        let font = &data[start..end];
        if !TTF_MAGICS.iter().any(|m| font.starts_with(m)) {
            return Err(AppError::InvalidFile(
                "Embedded font data does not start with a valid font signature.".into(),
            ));
        }

        fs::write(output, font)?;
        Ok(font.len() as u64)
    }
}

fn find_font(data: &[u8], from: usize) -> Option<usize> {
    let mut i = from;
    while i + 4 <= data.len() {
        if TTF_MAGICS.iter().any(|m| data[i..i + 4].starts_with(m)) {
            return Some(i);
        }
        i += 1;
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extracts_embedded_ttf() {
        // Fake EOT: 12-byte header + a TTF payload starting with 0x00010000.
        let mut buf = Vec::new();
        buf.extend_from_slice(&[0u8; 12]);
        let ttf = [0x00, 0x01, 0x00, 0x00, 0xAA, 0xBB, 0xCC, 0xDD];
        buf.extend_from_slice(&ttf);
        let dir = std::env::temp_dir().join("nichefiletools_tests");
        let _ = std::fs::create_dir_all(&dir);
        let inp = dir.join("eot_in.eot");
        let outp = dir.join("eot_out.ttf");
        std::fs::write(&inp, &buf).unwrap();

        let n = EotToTtfConverter.convert(&inp, &outp).unwrap();
        assert_eq!(n, 8);
        assert_eq!(std::fs::read(&outp).unwrap(), ttf);
        let _ = std::fs::remove_file(&inp);
        let _ = std::fs::remove_file(&outp);
    }
}
