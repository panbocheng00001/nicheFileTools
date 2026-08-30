use std::path::Path;

use crate::convert::converter::Converter;
use crate::convert::engine::{Engine, EngineResolver};
use crate::convert::sidecar::blender;
use crate::errors::AppError;

/// BLEND (Blender project) -> GLB (glTF Binary).
///
/// BLEND is a private Blender database; we drive Blender in background mode
/// (`blender -b -P script`) to export glTF. Blender is GPL-3.0 but invoked as a
/// separate process, so it does not infect the main binary (technical document §8.3). The
/// router pre-checks for an installed Blender and the UI guides install if absent.
pub struct BlendToGlbConverter;

impl Converter for BlendToGlbConverter {
    fn slug(&self) -> &'static str {
        "blend-to-glb"
    }
    fn class_type(&self) -> &'static str {
        "B"
    }
    fn engines(&self) -> &'static [Engine] {
        &[Engine::Blender]
    }
    fn convert(&self, input: &Path, output: &Path) -> Result<u64, AppError> {
        let resolver = EngineResolver::detect();
        let blender = resolver
            .bin(Engine::Blender)
            .ok_or_else(|| AppError::EngineMissing(Engine::Blender.label().to_string()))?;
        blender::export_glb(blender, input, output)
    }
}
