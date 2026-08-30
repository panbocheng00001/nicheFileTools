use std::path::Path;

use crate::convert::converter::Converter;
use crate::convert::engine::{Engine, EngineResolver};
use crate::convert::sidecar::occt;
use crate::errors::AppError;

/// STEP / IGES / BREP -> STL (tessellation).
///
/// PTC Creo `.prt` is proprietary and **not** supported by FreeCAD/OCCT, so this
/// tool is explicitly scoped to open CAD formats; callers export `.prt` to STEP
/// in Creo first. OCCT/FreeCAD is LGPL and invoked as a separate `freecadcmd`
/// process (technical document §8.6).
pub struct StepToStlConverter;

impl Converter for StepToStlConverter {
    fn slug(&self) -> &'static str {
        "step-to-stl"
    }
    fn class_type(&self) -> &'static str {
        "B"
    }
    fn engines(&self) -> &'static [Engine] {
        &[Engine::Occt]
    }
    fn convert(&self, input: &Path, output: &Path) -> Result<u64, AppError> {
        let resolver = EngineResolver::detect();
        let occt = resolver
            .bin(Engine::Occt)
            .ok_or_else(|| AppError::EngineMissing(Engine::Occt.label().to_string()))?;
        occt::step_to_stl(occt, input, output)
    }
}
