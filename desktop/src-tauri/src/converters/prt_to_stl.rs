use std::fs;
use std::path::Path;
use std::process::Command;

use crate::converters::Converter;
use crate::errors::AppError;

/// PRT (PTC Creo/Pro-E part) -> STL.
///
/// Desktop strategy (技术需求文档 §4.3): shell out to the FreeCAD CLI, which
/// natively imports PRT and exports STL. This is more reliable than binding OCCT
/// directly. FreeCAD is detected via `FREECAD_CMD` or `freecadcmd` on PATH.
pub struct PrtToStlConverter;

impl Converter for PrtToStlConverter {
    fn slug(&self) -> &'static str {
        "prt-to-stl"
    }
    fn class_type(&self) -> &'static str {
        "B"
    }
    fn convert(&self, input: &Path, output: &Path) -> Result<u64, AppError> {
        let freecad = std::env::var("FREECAD_CMD").unwrap_or_else(|_| "freecadcmd".to_string());

        let script = format!(
            "import FreeCAD, Mesh\n\
             doc = FreeCAD.open(r'{}')\n\
             meshes = [o for o in doc.Objects if hasattr(o, 'Shape')]\n\
             Mesh.export(meshes, r'{}')\n",
            input.display(),
            output.display()
        );
        let tmp = std::env::temp_dir().join("nichefiletools_prt_stl.py");
        fs::write(&tmp, script)?;

        let status = Command::new(&freecad)
            .args(["--console", &tmp.to_string_lossy()])
            .status();

        let _ = fs::remove_file(&tmp);

        match status {
            Ok(s) if s.success() => {
                let size = fs::metadata(output).map(|m| m.len()).unwrap_or(0);
                if size == 0 {
                    return Err(AppError::Other(
                        "FreeCAD ran but produced no STL output.".into(),
                    ));
                }
                Ok(size)
            }
            Ok(s) => Err(AppError::Other(format!("FreeCAD exited with status {s}."))),
            Err(_) => Err(AppError::MissingDependency(
                "FreeCAD (freecadcmd) not found. Install FreeCAD, or set FREECAD_CMD to its path."
                    .into(),
            )),
        }
    }
}
