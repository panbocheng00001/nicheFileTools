use std::path::Path;

use crate::convert::converter::Converter;
use crate::convert::engine::{Engine, EngineResolver};
use crate::convert::sidecar::ffmpeg;
use crate::errors::AppError;

/// MTS / M2TS (AVCHD, MPEG-2 TS) -> MP4.
///
/// Most MTS clips only need a container remux (`-c copy`); FFmpeg (bundled, LGPL)
/// is invoked as a separate process (技术文档 §8.2).
pub struct MtsToMp4Converter;

impl Converter for MtsToMp4Converter {
    fn slug(&self) -> &'static str {
        "mts-to-mp4"
    }
    fn class_type(&self) -> &'static str {
        "B"
    }
    fn engines(&self) -> &'static [Engine] {
        &[Engine::Ffmpeg]
    }
    fn convert(&self, input: &Path, output: &Path) -> Result<u64, AppError> {
        let resolver = EngineResolver::detect();
        let ffmpeg = resolver
            .bin(Engine::Ffmpeg)
            .ok_or_else(|| AppError::EngineMissing(Engine::Ffmpeg.label().to_string()))?;
        ffmpeg::transcode(ffmpeg, input, output, &["-c", "copy"])
    }
}
