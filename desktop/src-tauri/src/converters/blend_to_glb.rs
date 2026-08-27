use std::fs;
use std::path::Path;
use std::process::Command;

use crate::converters::Converter;
use crate::errors::AppError;

/// BLEND (Blender project) -> GLB (glTF Binary).
///
/// Desktop strategy (技术需求文档 §4.3): drive Blender in background mode
/// (`blender -b -P script.py`) to export glTF. Blender is detected via
/// `BLENDER_CMD` or `blender` on PATH.
pub struct BlendToGlbConverter;

impl Converter for BlendToGlbConverter {
    fn slug(&self) -> &'static str {
        "blend-to-glb"
    }
    fn class_type(&self) -> &'static str {
        "B"
    }
    fn convert(&self, input: &Path, output: &Path) -> Result<u64, AppError> {
        let blender = std::env::var("BLENDER_CMD").unwrap_or_else(|_| "blender".to_string());

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

        let status = Command::new(&blender)
            .args(["-b", "-P", &tmp.to_string_lossy()])
            .status();

        let _ = fs::remove_file(&tmp);

        match status {
            Ok(s) if s.success() => {
                let size = fs::metadata(output).map(|m| m.len()).unwrap_or(0);
                if size == 0 {
                    return Err(AppError::Other(
                        "Blender ran but produced no GLB output.".into(),
                    ));
                }
                Ok(size)
            }
            Ok(s) => Err(AppError::Other(format!("Blender exited with status {s}."))),
            Err(_) => Err(AppError::MissingDependency(
                "Blender not found. Install Blender, or set BLENDER_CMD to its path.".into(),
            )),
        }
    }
}
