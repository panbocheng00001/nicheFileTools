use std::path::Path;

use crate::convert::converter::Converter;
use crate::convert::engine::{Engine, EngineResolver};
use crate::convert::sidecar::python_fonttools;
use crate::errors::AppError;

/// PFM/PFB (Type1) -> TTF.
///
/// A Type1 font ships as an outline file (`.pfb` / `.pfa`) plus an optional
/// metrics file (`.pfm`). We run the conversion in a Python + `fontforge` sidecar
/// (MIT, separate process). Convention: keep the `.pfm` next to the `.pfb` with
/// the same stem; it is picked up automatically when present (technical document §8.4).
pub struct PfmToTtfConverter;

impl Converter for PfmToTtfConverter {
    fn slug(&self) -> &'static str {
        "pfm-to-ttf"
    }
    fn class_type(&self) -> &'static str {
        "A"
    }
    fn engines(&self) -> &'static [Engine] {
        &[Engine::PythonFonttools]
    }
    fn convert(&self, input: &Path, output: &Path) -> Result<u64, AppError> {
        let resolver = EngineResolver::detect();
        let python = resolver
            .bin(Engine::PythonFonttools)
            .ok_or_else(|| AppError::EngineMissing(Engine::PythonFonttools.label().to_string()))?;

        // Optional sibling .pfm with the same stem.
        let pfm = input
            .file_stem()
            .and_then(|s| {
                let cand = input.parent()?.join(format!("{}.pfm", s.to_string_lossy()));
                cand.exists().then_some(cand)
            });

        python_fonttools::pfb_to_ttf(python, input, pfm.as_deref(), output)
    }
}
