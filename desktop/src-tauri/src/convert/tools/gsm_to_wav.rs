use std::path::Path;

use crate::convert::converter::Converter;
use crate::convert::engine::{Engine, EngineResolver};
use crate::convert::sidecar::ffmpeg;
use crate::errors::AppError;

/// GSM (RPE-LTP speech codec) -> WAV.
///
/// Decoding GSM requires FFmpeg (bundled, LGPL). We invoke it as a separate
/// process (技术文档 §8.2) — never statically linked.
pub struct GsmToWavConverter;

impl Converter for GsmToWavConverter {
    fn slug(&self) -> &'static str {
        "gsm-to-wav"
    }
    fn class_type(&self) -> &'static str {
        "A"
    }
    fn engines(&self) -> &'static [Engine] {
        &[Engine::Ffmpeg]
    }
    fn convert(&self, input: &Path, output: &Path) -> Result<u64, AppError> {
        let resolver = EngineResolver::detect();
        let ffmpeg = resolver
            .bin(Engine::Ffmpeg)
            .ok_or_else(|| AppError::EngineMissing(Engine::Ffmpeg.label().to_string()))?;
        ffmpeg::transcode(ffmpeg, input, output, &[])
    }
}
