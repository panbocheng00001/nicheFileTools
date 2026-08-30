use std::path::Path;

use crate::convert::converter::Converter;
use crate::convert::engine::{Engine, EngineResolver};
use crate::convert::sidecar::calibre;
use crate::errors::AppError;

/// KFX (Amazon Kindle Format 8+) -> EPUB.
///
/// KFX is a proprietary DRIF/Snappy format with no reliable open decoder. The
/// desktop strategy is to call Calibre's `ebook-convert`, which natively accepts
/// KFX input (technical document §8.5). Calibre is GPL-3.0 but invoked as a separate
/// process, so it does not infect the main binary. Self-rolled KFX parsing is a
/// long-term fallback only.
pub struct KfxToEpubConverter;

impl Converter for KfxToEpubConverter {
    fn slug(&self) -> &'static str {
        "kfx-to-epub"
    }
    fn class_type(&self) -> &'static str {
        "A"
    }
    fn engines(&self) -> &'static [Engine] {
        &[Engine::Calibre]
    }
    fn convert(&self, input: &Path, output: &Path) -> Result<u64, AppError> {
        let resolver = EngineResolver::detect();
        let calibre = resolver
            .bin(Engine::Calibre)
            .ok_or_else(|| AppError::EngineMissing(Engine::Calibre.label().to_string()))?;
        calibre::ebook_convert(calibre, input, output)
    }
}
