use std::fs;
use std::path::{Path, PathBuf};

use flate2::read::ZlibDecoder;
use std::io::Read;

use crate::convert::converter::Converter;
use crate::convert::engine::Engine;
use crate::errors::AppError;

/// WAD archive extractor (class C, desktop-only).
///
/// Supports the classic Doom format (`IWAD`/`PWAD`, 16-byte directory entries)
/// and the Quake format (`WAD2`/`WAD3`, 32-byte entries where lumps may be
/// zlib-compressed — handled via `flate2`). Every lump is written to a sibling
/// directory next to `output`.
pub struct WadExtractor;

impl Converter for WadExtractor {
    fn slug(&self) -> &'static str {
        "wad-extractor"
    }
    fn class_type(&self) -> &'static str {
        "C"
    }
    fn engines(&self) -> &'static [Engine] {
        &[Engine::RustNative]
    }
    fn convert(&self, input: &Path, output: &Path) -> Result<u64, AppError> {
        let data = fs::read(input)?;
        if data.len() < 12 {
            return Err(AppError::InvalidFile("File too small to be a WAD.".into()));
        }
        let magic = &data[0..4];
        let is_quake = magic == b"WAD2" || magic == b"WAD3";
        let is_doom = magic == b"IWAD" || magic == b"PWAD";
        if !is_quake && !is_doom {
            return Err(AppError::InvalidFile(
                "Not a WAD archive (expected IWAD/PWAD/WAD2/WAD3).".into(),
            ));
        }

        let num = u32::from_le_bytes([data[4], data[5], data[6], data[7]]) as usize;
        let dir_off = u32::from_le_bytes([data[8], data[9], data[10], data[11]]) as usize;

        let out_dir = output_dir(output);
        fs::create_dir_all(&out_dir)?;

        let entry_size: usize = if is_quake { 32 } else { 16 };
        let mut written: u64 = 0;
        let mut i = 0usize;
        let mut off = dir_off;
        while i < num && off + entry_size <= data.len() {
            let (name, file_pos, size, compressed_size, is_compressed) = if is_quake {
                let file_pos = u32::from_le_bytes([data[off], data[off + 1], data[off + 2], data[off + 3]]) as usize;
                let size = u32::from_le_bytes([data[off + 4], data[off + 5], data[off + 6], data[off + 7]]) as usize;
                let dsize = u32::from_le_bytes([data[off + 8], data[off + 9], data[off + 10], data[off + 11]]) as usize;
                let kind = data[off + 12];
                let name = read_name(&data[off + 16..off + 32]);
                (name, file_pos, size, dsize, kind == 0x46 && dsize != size)
            } else {
                let file_pos = u32::from_le_bytes([data[off], data[off + 1], data[off + 2], data[off + 3]]) as usize;
                let size = u32::from_le_bytes([data[off + 4], data[off + 5], data[off + 6], data[off + 7]]) as usize;
                let name = read_name(&data[off + 8..off + 16]);
                (name, file_pos, size, size, false)
            };

            if !name.is_empty() && file_pos + size <= data.len() {
                let raw = &data[file_pos..file_pos + size];
                let bytes: Vec<u8> = if is_compressed {
                    let mut dec = ZlibDecoder::new(raw);
                    let mut out = Vec::with_capacity(compressed_size);
                    dec.read_to_end(&mut out)
                        .map_err(|e| AppError::InvalidFile(format!("Lump '{name}' inflate failed: {e}")))?;
                    out
                } else {
                    raw.to_vec()
                };

                let target = safe_target(&out_dir, &name);
                if let Some(parent) = target.parent() {
                    let _ = fs::create_dir_all(parent);
                }
                fs::write(&target, &bytes)?;
                written += bytes.len() as u64;
            }

            off += entry_size;
            i += 1;
        }

        if i == 0 {
            return Err(AppError::InvalidFile("WAD directory parsed zero lumps.".into()));
        }
        Ok(written)
    }
}

fn read_name(slice: &[u8]) -> String {
    let end = slice.iter().position(|b| *b == 0).unwrap_or(slice.len());
    String::from_utf8_lossy(&slice[..end]).trim().to_string()
}

/// `output` may be a file path; we extract into a sibling directory derived from
/// its stem so we never overwrite the user's picked file.
fn output_dir(output: &Path) -> PathBuf {
    if let Some(ext) = output.extension() {
        let _ = ext;
        let stem = output.file_stem().map(|s| s.to_string_lossy().into_owned()).unwrap_or_else(|| "wad".to_string());
        output.parent().map(|p| p.join(&stem)).unwrap_or_else(|| PathBuf::from(stem))
    } else {
        output.to_path_buf()
    }
}

fn safe_target(dir: &Path, name: &str) -> PathBuf {
    // WAD names may contain '/'; map to OS separators but stay inside `dir`.
    let rel = name.replace('\\', "/");
    let rel = rel.trim_start_matches('/');
    let mut p = dir.to_path_buf();
    for seg in rel.split('/') {
        if seg.is_empty() || seg == ".." {
            continue;
        }
        p = p.join(seg);
    }
    p
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extracts_doom_lumps() {
        // Build a tiny valid IWAD: 12-byte header, then padding so the lump
        // data begins at offset 28, then the 16-byte directory entry at 32.
        let mut buf = Vec::new();
        buf.extend_from_slice(b"IWAD");
        buf.extend_from_slice(&1u32.to_le_bytes()); // 1 lump
        buf.extend_from_slice(&32u32.to_le_bytes()); // dir entry begins at offset 32
        // pad to 28
        while buf.len() < 28 {
            buf.push(0);
        }
        // lump data (4 bytes) at offset 28
        let lump = [10u8, 20, 30, 40];
        let lump_off = buf.len() as u32; // == 28
        buf.extend_from_slice(&lump);
        // directory entry (16 bytes): filepos, size, name  -> begins at offset 32
        buf.extend_from_slice(&lump_off.to_le_bytes());
        buf.extend_from_slice(&4u32.to_le_bytes());
        let mut name = [0u8; 8];
        name[..2].copy_from_slice(b"AA");
        buf.extend_from_slice(&name);

        let dir = std::env::temp_dir().join("nichefiletools_tests");
        let _ = std::fs::create_dir_all(&dir);
        let inp = dir.join("d.wad");
        // output has no extension => extract directory == outd/extracted
        let outd = dir.join("d_extract");
        let _ = std::fs::remove_dir_all(&outd);
        std::fs::write(&inp, &buf).unwrap();

        let n = WadExtractor
            .convert(&inp, &outd.join("extracted"))
            .unwrap();
        assert_eq!(n, 4);
        assert_eq!(std::fs::read(outd.join("extracted").join("AA")).unwrap(), lump);
        let _ = std::fs::remove_file(&inp);
        let _ = std::fs::remove_dir_all(&outd);
    }
}
