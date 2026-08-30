use std::fs;
use std::path::Path;

use crate::errors::AppError;

use super::run_command;

/// Export a Blender project to GLB via `blender -b -P <script>`.
///
/// Blender is GPL-3.0 but invoked as a **separate process**, so it does not
/// infect the main binary (technical document §8.3). The export script is written to a
/// temp file and removed afterwards.
pub fn export_glb(blender: &Path, input: &Path, output: &Path) -> Result<u64, AppError> {
    let script = format!(
        "import bpy\n\
         bpy.ops.wm.open_mainfile(filepath=r'{}')\n\
         bpy.ops.export_scene.gltf(\n\
         \x20\x20 filepath=r'{}',\n\
         \x20\x20 export_format='GLB',\n\
         \x20\x20 export_materials='EXPORT',\n\
         \x20\x20 export_texcoords=True,\n\
         \x20\x20 export_normals=True,\n\
         \x20\x20 export_apply=True)\n",
        input.display(),
        output.display()
    );
    let tmp = std::env::temp_dir().join("nichefiletools_blend_glb.py");
    fs::write(&tmp, script)?;

    let res = run_command(blender, &["-b".into(), "-P".into(), tmp.to_string_lossy().into()]);
    let _ = fs::remove_file(&tmp);
    res?;

    let size = fs::metadata(output).map(|m| m.len()).unwrap_or(0);
    if size == 0 {
        return Err(AppError::Other(
            "Blender ran but produced no GLB output.".into(),
        ));
    }
    Ok(size)
}
