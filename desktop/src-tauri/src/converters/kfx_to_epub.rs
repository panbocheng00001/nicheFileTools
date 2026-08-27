use std::path::Path;

use crate::converters::Converter;
use crate::errors::AppError;

/// KFX (Amazon Kindle Format 8+) -> EPUB.
///
/// The full desktop implementation requires a DRIF metadata parser + Snappy
/// decompression + EPUB builder (`epub-builder`). That native pipeline is planned
/// for a later phase; for now we return a clear, honest error rather than a fake
/// conversion. The web WASM build performs a browser-based conversion path.
pub struct KfxToEpubConverter;

impl Converter for KfxToEpubConverter {
    fn slug(&self) -> &'static str {
        "kfx-to-epub"
    }
    fn class_type(&self) -> &'static str {
        "A"
    }
    fn convert(&self, _input: &Path, _output: &Path) -> Result<u64, AppError> {
        Err(AppError::NotImplemented(
            "KFX -> EPUB desktop conversion requires the DRIF/Snappy parser (planned). \
             Use the web tool for browser-based conversion, or wait for the native \
             EPUB builder in a later phase."
                .into(),
        ))
    }
}
