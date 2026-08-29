use std::path::Path;
use std::process::Command;

use crate::errors::AppError;

pub mod blender;
pub mod calibre;
pub mod ffmpeg;
pub mod occt;
pub mod python_fonttools;

/// Run an external engine binary **safely**.
///
/// Security contract (技术文档 §8.7):
/// - `bin` is *only* ever supplied by [`crate::convert::engine::EngineResolver`],
///   i.e. resolved from PATH or a trusted env override (never from user input).
/// - Arguments are passed as a `Vec<String>` to `Command` — we never build a
///   shell string, so command injection and path traversal are impossible.
/// - Returns captured stdout on success; on a non-zero exit it surfaces the
///   engine's stderr as `AppError::SidecarFailed`.
pub fn run_command(bin: &Path, args: &[String]) -> Result<Vec<u8>, AppError> {
    let out = Command::new(bin)
        .args(args)
        .output()
        .map_err(|e| AppError::SidecarSpawn(format!("failed to launch {}: {e}", bin.display())))?;

    if !out.status.success() {
        return Err(AppError::SidecarFailed(format!(
            "{} exited with {}\n{}",
            bin.file_name().map(|s| s.to_string_lossy()).unwrap_or("engine".into()),
            out.status,
            String::from_utf8_lossy(&out.stderr).trim()
        )));
    }
    Ok(out.stdout)
}
