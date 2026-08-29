use std::fs;
use std::path::{Path, PathBuf};

use crate::convert::converter::Converter;
use crate::convert::engine::Engine;
use crate::errors::AppError;

/// GLB (glTF Binary) -> GLTF (+ external .bin).
///
/// A GLB is one file containing a 12-byte header, a JSON chunk and a BIN chunk.
/// We split it into a `.gltf` (the JSON, pretty-printed) and a sibling `.bin`
/// (the buffer), then point `buffers[0].uri` at that `.bin` file.
pub struct GlbToGltfConverter;

impl Converter for GlbToGltfConverter {
    fn slug(&self) -> &'static str {
        "glb-to-gltf"
    }
    fn class_type(&self) -> &'static str {
        "A"
    }
    fn engines(&self) -> &'static [Engine] {
        &[Engine::RustNative]
    }
    fn convert(&self, input: &Path, output: &Path) -> Result<u64, AppError> {
        let data = fs::read(input)?;
        if data.len() < 12 {
            return Err(AppError::InvalidFile("File too small to be a GLB.".into()));
        }
        if &data[0..4] != b"glTF" {
            return Err(AppError::InvalidFile(
                "Not a GLB file (missing 'glTF' magic).".into(),
            ));
        }
        let total_len = u32::from_le_bytes([data[8], data[9], data[10], data[11]]) as usize;
        let total_len = if total_len == 0 { data.len() } else { total_len };
        if total_len > data.len() {
            return Err(AppError::InvalidFile(
                "GLB length header exceeds file size.".into(),
            ));
        }

        // First chunk: JSON.
        let json_len = u32::from_le_bytes([data[12], data[13], data[14], data[15]]) as usize;
        let json_type = &data[16..20];
        if json_type != b"JSON" {
            return Err(AppError::InvalidFile("GLB first chunk is not JSON.".into()));
        }
        let json_raw = &data[20..20 + json_len];

        // Second chunk: BIN (optional but expected).
        let bin_start = 20 + json_len;
        let bin_len = if bin_start + 8 <= total_len {
            u32::from_le_bytes([
                data[bin_start],
                data[bin_start + 1],
                data[bin_start + 2],
                data[bin_start + 3],
            ]) as usize
        } else {
            0
        };
        let bin_type_ok = bin_start + 4 < total_len && &data[bin_start + 4..bin_start + 8] == b"BIN\0";
        let bin_data = if bin_len > 0 && bin_type_ok {
            let bs = bin_start + 8;
            Some(&data[bs..bs + bin_len])
        } else {
            None
        };

        let mut doc: serde_json::Value =
            serde_json::from_slice(json_raw).map_err(|e| AppError::InvalidFile(format!("Invalid glTF JSON: {e}")))?;

        // Write the .bin sibling and repoint buffers[0].uri.
        let bin_path = sibling_bin(output);
        if let Some(bd) = bin_data {
            fs::write(&bin_path, bd)?;
            if let Some(buffers) = doc.get_mut("buffers").and_then(|v| v.as_array_mut()) {
                if let Some(first) = buffers.first_mut() {
                    if let Some(obj) = first.as_object_mut() {
                        obj.insert(
                            "uri".to_string(),
                            serde_json::Value::String(bin_path.file_name().unwrap().to_string_lossy().into_owned()),
                        );
                    }
                }
            }
        }

        let pretty = serde_json::to_vec_pretty(&doc).map_err(AppError::Json)?;
        fs::write(output, &pretty)?;
        Ok(pretty.len() as u64)
    }
}

fn sibling_bin(gltf: &Path) -> PathBuf {
    let stem = gltf.file_stem().map(|s| s.to_string_lossy().into_owned()).unwrap_or_else(|| "scene".into());
    let parent = gltf.parent().unwrap_or_else(|| Path::new("."));
    parent.join(format!("{stem}.bin"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn splits_glb_into_json_and_bin() {
        let json = br#"{"buffers":[{"byteLength":4}]}"#;
        let bin = [1u8, 2, 3, 4];
        let mut glb = Vec::new();
        glb.extend_from_slice(b"glTF");
        glb.extend_from_slice(&2u32.to_le_bytes()); // version
        let total = 12 + 8 + json.len() + 8 + bin.len();
        glb.extend_from_slice(&(total as u32).to_le_bytes());
        glb.extend_from_slice(&(json.len() as u32).to_le_bytes());
        glb.extend_from_slice(b"JSON");
        glb.extend_from_slice(json);
        glb.extend_from_slice(&(bin.len() as u32).to_le_bytes());
        glb.extend_from_slice(b"BIN\0");
        glb.extend_from_slice(&bin);

        let dir = std::env::temp_dir().join("nichefiletools_tests");
        let _ = std::fs::create_dir_all(&dir);
        let inp = dir.join("s.glb");
        let outp = dir.join("s.gltf");
        std::fs::write(&inp, &glb).unwrap();

        GlbToGltfConverter.convert(&inp, &outp).unwrap();
        let doc: serde_json::Value = serde_json::from_str(&std::fs::read_to_string(&outp).unwrap()).unwrap();
        assert_eq!(doc["buffers"][0]["uri"], "s.bin");
        assert_eq!(std::fs::read(dir.join("s.bin")).unwrap(), bin);
        let _ = std::fs::remove_file(&inp);
        let _ = std::fs::remove_file(&outp);
        let _ = std::fs::remove_file(dir.join("s.bin"));
    }
}
