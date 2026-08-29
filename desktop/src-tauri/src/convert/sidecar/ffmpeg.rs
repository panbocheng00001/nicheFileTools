use std::fs;
use std::path::Path;

use crate::errors::AppError;

use super::run_command;

/// Transcode/remux `input` → `output` with the bundled or detected FFmpeg.
///
/// `extra` carries format-specific flags (e.g. `-c copy` for remux, or codec
/// selection). The output file size is returned on success.
pub fn transcode(
    ffmpeg: &Path,
    input: &Path,
    output: &Path,
    extra: &[&str],
) -> Result<u64, AppError> {
    let mut parts: Vec<String> = vec!["-y".into(), "-i".into(), input.display().to_string()];
    for e in extra {
        parts.push(e.to_string());
    }
    parts.push(output.display().to_string());

    run_command(ffmpeg, &parts)?;

    let size = fs::metadata(output).map(|m| m.len()).unwrap_or(0);
    if size == 0 {
        return Err(AppError::Other(
            "FFmpeg ran but produced no output file.".into(),
        ));
    }
    Ok(size)
}
