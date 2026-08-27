use std::fs::File;
use std::io::{BufReader, BufWriter, Read, Write};
use std::path::Path;

use crate::converters::Converter;
use crate::errors::AppError;

/// RAW (2352-byte/sector optical disc image) -> ISO 9660 (2048-byte user data).
///
/// Mode 1 / Mode 2 Form 1 sectors store 2048 bytes of user data at offset 16..2064;
/// the remaining bytes are sync/header/EDC/ECC which ISO discards. This is a pure
/// byte-level operation — no external dependency required (class C, desktop-only).
pub struct RawToIsoConverter;

impl Converter for RawToIsoConverter {
    fn slug(&self) -> &'static str {
        "raw-to-iso"
    }
    fn class_type(&self) -> &'static str {
        "C"
    }
    fn convert(&self, input: &Path, output: &Path) -> Result<u64, AppError> {
        let in_file = File::open(input)?;
        let total = in_file.metadata()?.len();
        if total == 0 || total % 2352 != 0 {
            return Err(AppError::InvalidFile(format!(
                "RAW image is {total} bytes; expected a multiple of 2352-byte sectors."
            )));
        }

        let mut reader = BufReader::new(in_file);
        let out_file = File::create(output)?;
        let mut writer = BufWriter::new(out_file);

        let mut sector = [0u8; 2352];
        let mut written: u64 = 0u64;
        loop {
            match reader.read_exact(&mut sector) {
                Ok(()) => {
                    // Extract 2048-byte user data (Mode 1: bytes 16..2064).
                    writer.write_all(&sector[16..2064])?;
                    written += 2048;
                }
                Err(_) => break, // clean EOF
            }
        }
        writer.flush()?;
        Ok(written)
    }
}
