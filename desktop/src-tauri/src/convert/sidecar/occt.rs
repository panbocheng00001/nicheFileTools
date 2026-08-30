use std::fs;
use std::path::Path;

use crate::errors::AppError;

use super::run_command;

/// Tessellate a CAD part (STEP / IGES / BREP) to STL via FreeCAD headless.
///
/// PTC Creo `.prt` is proprietary and **not** supported by FreeCAD — callers
/// must first export to STEP/IGES in Creo. OCCT is LGPL and invoked as a
/// separate `freecadcmd` process (technical document §8.6).
pub fn step_to_stl(occt: &Path, input: &Path, output: &Path) -> Result<u64, AppError> {
    let script = format!(
        "import FreeCAD, Mesh\n\
         doc = FreeCAD.open(r'{}')\n\
         mesh_objs = []\n\
         for obj in doc.Objects:\n\
         \x20\x20 if hasattr(obj, 'Shape') and obj.Shape and not obj.Shape.isNull():\n\
         \x20\x20\x20\x20 m = doc.addObject('Mesh::Feature', 'Mesh')\n\
         \x20\x20\x20\x20 m.Mesh = Mesh.Mesh(obj.Shape.tessellate(0.1))\n\
         \x20\x20\x20\x20 mesh_objs.append(m)\n\
         if mesh_objs:\n\
         \x20\x20 Mesh.export(mesh_objs, r'{}')\n",
        input.display(),
        output.display()
    );
    let tmp = std::env::temp_dir().join("nichefiletools_step_stl.py");
    fs::write(&tmp, script)?;

    let res = run_command(occt, &[tmp.to_string_lossy().into()]);
    let _ = fs::remove_file(&tmp);
    res?;

    let size = fs::metadata(output).map(|m| m.len()).unwrap_or(0);
    if size == 0 {
        return Err(AppError::Other(
            "CAD engine ran but produced no STL output.".into(),
        ));
    }
    Ok(size)
}
