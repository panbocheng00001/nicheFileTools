use std::fs::File;
use std::io::{BufReader, BufWriter, Read, Write};
use std::path::Path;

use crate::convert::converter::{Converter, ProgressPhase, ProgressSink};
use crate::convert::engine::Engine;
use crate::convert::progress::ProgressWriter;
use crate::errors::AppError;

/// RAW (2352-byte/sector optical disc image) -> ISO 9660 (2048-byte user data).
///
/// Mode 1 / Mode 2 Form 1 sectors store 2048 bytes of user data at offset 16..2064;
/// the remaining bytes are sync/header/EDC/ECC which ISO discards. Pure byte-level
/// operation — no external dependency required (class C, desktop-only). Progress is
/// reported as output bytes are written (1:1 with the 2048-byte sectors).
pub struct RawToIsoConverter;

impl Converter for RawToIsoConverter {
    fn slug(&self) -> &'static str {
        "raw-to-iso"
    }
    fn class_type(&self) -> &'static str {
        "C"
    }
    fn engines(&self) -> &'static [Engine] {
        &[Engine::RustNative]
    }

    fn convert_with_progress(
        &self,
        input: &Path,
        output: &Path,
        _opts: Option<&serde_json::Value>,
        sink: &dyn ProgressSink,
    ) -> Result<u64, AppError> {
        let in_file = File::open(input)?;
        let total = in_file.metadata()?.len();
        if total == 0 || total % 2352 != 0 {
            return Err(AppError::InvalidFile(format!(
                "RAW image is {total} bytes; expected a multiple of 2352-byte sectors."
            )));
        }
        // Each 2352-byte sector yields 2048 bytes of ISO user data.
        let total_out = total / 2352 * 2048;

        let mut reader = BufReader::new(in_file);
        let out_file = File::create(output)?;
        let mut writer =
            ProgressWriter::new(BufWriter::new(out_file), sink, ProgressPhase::Writing, total_out);

        let mut sector = [0u8; 2352];
        loop {
            match reader.read_exact(&mut sector) {
                Ok(()) => {
                    writer.write_all(&sector[16..2064])?;
                }
                Err(_) => break, // clean EOF (or truncated tail) ends the stream
            }
        }
        writer.flush()?;
        Ok(total_out)
    }
}
