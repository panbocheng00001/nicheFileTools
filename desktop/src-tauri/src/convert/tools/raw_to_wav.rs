use std::fs;
use std::fs::File;
use std::io::{BufReader, BufWriter, Read, Write};
use std::path::Path;

use crate::convert::converter::{Converter, ProgressPhase, ProgressSink};
use crate::convert::engine::Engine;
use crate::convert::progress::ProgressWriter;
use crate::errors::AppError;

/// RAW (headerless PCM) -> WAV.
///
/// WAV is just a 44-byte RIFF header wrapped around the same PCM samples, so this
/// is a zero-loss container repackaging. Sample rate / bit depth / channels come
/// from the IPC `options` JSON (defaults: 44100 Hz, 16-bit, mono). The trailing
/// partial sample is trimmed to keep block alignment valid. Byte progress is
/// reported while the PCM body is streamed to the output.
pub struct RawToWavConverter;

impl Converter for RawToWavConverter {
    fn slug(&self) -> &'static str {
        "raw-to-wav"
    }
    fn class_type(&self) -> &'static str {
        "A"
    }
    fn engines(&self) -> &'static [Engine] {
        &[Engine::RustNative]
    }

    fn convert_with_progress(
        &self,
        input: &Path,
        output: &Path,
        opts: Option<&serde_json::Value>,
        sink: &dyn ProgressSink,
    ) -> Result<u64, AppError> {
        let (sample_rate, bits, channels) = parse_opts(opts);

        if !(8..=32).contains(&bits) || bits % 8 != 0 {
            return Err(AppError::InvalidFile(format!(
                "Unsupported bit depth {bits}; expected 8/16/24/32."
            )));
        }
        if channels == 0 {
            return Err(AppError::InvalidFile("Channel count must be >= 1.".into()));
        }

        let input_len = fs::metadata(input)?.len();
        if input_len == 0 {
            return Err(AppError::InvalidFile("Input RAW file is empty.".into()));
        }
        let block_align = (channels as usize * (bits as usize / 8)).max(1);
        let data_len = input_len as usize - input_len as usize % block_align;
        let total_out = 44 + data_len;

        let out_file = File::create(output)?;
        let mut writer = ProgressWriter::new(
            BufWriter::new(out_file),
            sink,
            ProgressPhase::Writing,
            total_out as u64,
        );

        // --- 44-byte RIFF/WAVE header ---
        let byte_rate = sample_rate * block_align as u32;
        writer.write_all(b"RIFF")?;
        writer.write_all(&((36 + data_len) as u32).to_le_bytes())?;
        writer.write_all(b"WAVE")?;
        writer.write_all(b"fmt ")?;
        writer.write_all(&16u32.to_le_bytes())?; // fmt chunk size
        writer.write_all(&1u16.to_le_bytes())?; // PCM
        writer.write_all(&(channels as u16).to_le_bytes())?;
        writer.write_all(&sample_rate.to_le_bytes())?;
        writer.write_all(&byte_rate.to_le_bytes())?;
        writer.write_all(&(block_align as u16).to_le_bytes())?;
        writer.write_all(&(bits as u16).to_le_bytes())?;
        writer.write_all(b"data")?;
        writer.write_all(&(data_len as u32).to_le_bytes())?;
        writer.flush()?;

        // --- PCM body (1:1 with the input, minus the trailing partial sample) ---
        let in_file = File::open(input)?;
        let mut reader = BufReader::new(in_file);
        let mut remaining = data_len;
        let mut buf = [0u8; 64 * 1024];
        while remaining > 0 {
            let to_read = remaining.min(buf.len());
            let n = reader
                .read(&mut buf[..to_read])
                .map_err(|e| AppError::Other(format!("read failed: {e}")))?;
            if n == 0 {
                break;
            }
            writer.write_all(&buf[..n])?;
            remaining -= n;
        }
        writer.flush()?;
        Ok(total_out as u64)
    }
}

fn parse_opts(opts: Option<&serde_json::Value>) -> (u32, u16, u16) {
    let mut sample_rate = 44100u32;
    let mut bits = 16u16;
    let mut channels = 1u16;
    if let Some(o) = opts {
        if let Some(v) = o.get("sample_rate").and_then(|v| v.as_u64()) {
            sample_rate = v as u32;
        }
        if let Some(v) = o.get("bits").and_then(|v| v.as_u64()) {
            bits = v as u16;
        }
        if let Some(v) = o.get("channels").and_then(|v| v.as_u64()) {
            channels = v as u16;
        }
    }
    (sample_rate, bits, channels)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::convert::converter::NoopSink;

    #[test]
    fn builds_valid_wav_header() {
        let dir = std::env::temp_dir().join("nichefiletools_tests");
        let _ = std::fs::create_dir_all(&dir);
        let inp = dir.join("raw_to_wav_in.raw");
        let outp = dir.join("raw_to_wav_out.wav");
        // 4 samples * 2 bytes = 8 bytes (mono 16-bit).
        std::fs::write(&inp, vec![0u8; 8]).unwrap();

        let c = RawToWavConverter;
        let n = c
            .convert_with_progress(&inp, &outp, None, &NoopSink)
            .unwrap();
        assert_eq!(n, 44 + 8);

        let data = std::fs::read(&outp).unwrap();
        assert_eq!(&data[0..4], b"RIFF");
        assert_eq!(&data[8..12], b"WAVE");
        assert_eq!(&data[22..24], &1u16.to_le_bytes()); // channels = 1
        assert_eq!(&data[24..28], &44100u32.to_le_bytes()); // sample rate
        let _ = std::fs::remove_file(&inp);
        let _ = std::fs::remove_file(&outp);
    }
}
