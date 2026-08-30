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
/// Security contract (technical document §8.7):
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

#[cfg(test)]
mod tests {
    use super::*;

    /// Platform shell used purely as a *stand-in engine* so these tests exercise
    /// `run_command` without requiring FFmpeg/Blender/Calibre to be installed.
    #[cfg(windows)]
    const SHELL: &str = "cmd";
    #[cfg(not(windows))]
    const SHELL: &str = "sh";

    /// Flag that makes the shell run an inline command string.
    #[cfg(windows)]
    fn shell_flag() -> &'static str {
        "/c"
    }
    #[cfg(not(windows))]
    fn shell_flag() -> &'static str {
        "-c"
    }

    /// Args that make the shell print "hello" and exit 0.
    fn echo_args() -> Vec<String> {
        vec![shell_flag().into(), "echo hello".into()]
    }

    /// Args that make the shell exit non-zero.
    fn fail_args() -> Vec<String> {
        vec![shell_flag().into(), "exit 3".into()]
    }

    #[test]
    fn captures_stdout_on_success() {
        let out = run_command(Path::new(SHELL), &echo_args()).expect("shell should run");
        assert_eq!(String::from_utf8_lossy(&out).trim(), "hello");
    }

    /// A failing engine must surface stderr/exit info as `SidecarFailed` — this
    /// is the message users see when e.g. FFmpeg rejects an input file.
    #[test]
    fn non_zero_exit_becomes_sidecar_failed() {
        match run_command(Path::new(SHELL), &fail_args()) {
            Err(AppError::SidecarFailed(msg)) => {
                assert!(!msg.is_empty(), "failure message must not be empty");
            }
            other => panic!("expected SidecarFailed, got {other:?}"),
        }
    }

    /// A missing engine binary must be `SidecarSpawn` (drives the "install it"
    /// prompt), never a panic.
    #[test]
    fn missing_binary_becomes_sidecar_spawn() {
        let missing = Path::new(if cfg!(windows) {
            "C:/definitely/not/here/niche-missing-engine.exe"
        } else {
            "/definitely/not/here/niche-missing-engine"
        });
        match run_command(missing, &[]) {
            Err(AppError::SidecarSpawn(_)) => {}
            other => panic!("expected SidecarSpawn, got {other:?}"),
        }
    }

    /// Security contract: arguments are separate argv entries, never
    /// concatenated into a shell string. A payload containing shell
    /// metacharacters must therefore never be executed.
    #[test]
    fn metacharacters_in_args_are_not_executed() {
        let dir = std::env::temp_dir().join("nichefiletools_sidecar_tests");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        let sentinel = dir.join("sentinel.txt");
        std::fs::write(&sentinel, b"alive").unwrap();

        let payload = if cfg!(windows) {
            format!("& del /q \"{}\"", sentinel.display())
        } else {
            format!("; rm -rf {}", dir.display())
        };

        // `exit 0` is the only command the shell runs; `payload` is passed as a
        // separate argv entry and must stay inert.
        let args = vec![shell_flag().into(), "exit 0".into(), payload];
        let _ = run_command(Path::new(SHELL), &args);

        assert!(
            sentinel.exists(),
            "shell metacharacter was executed — command injection!"
        );
        let _ = std::fs::remove_dir_all(&dir);
    }
}
