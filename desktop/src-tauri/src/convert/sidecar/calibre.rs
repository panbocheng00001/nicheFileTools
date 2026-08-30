use std::fs;
use std::path::Path;

use crate::errors::AppError;

use super::run_command;

/// Convert an input document to EPUB with Calibre's `ebook-convert`.
///
/// `calibre` may be the full `ebook-convert` binary path, or the directory
/// containing it. Calibre is GPL-3.0 but, like Blender, is invoked as a
/// separate process (technical document §8.5).
pub fn ebook_convert(calibre: &Path, input: &Path, output: &Path) -> Result<u64, AppError> {
    // `calibre` resolves to the ebook-convert executable path (see EngineResolver).
    let bin = if calibre.file_name().map(|n| n.to_string_lossy().eq_ignore_ascii_case("calibre"))
        == Some(true)
    {
        // User pointed at the `calibre` GUI binary; the converter is a sibling.
        calibre.with_file_name(format!(
            "ebook-convert{}",
            calibre.extension().map(|_| ".exe").unwrap_or_default()
        ))
    } else {
        calibre.to_path_buf()
    };

    let parts = vec![
        input.display().to_string(),
        output.display().to_string(),
        "--output-profile".into(),
        "generic".into(),
    ];
    run_command(&bin, &parts)?;

    let size = fs::metadata(output).map(|m| m.len()).unwrap_or(0);
    if size == 0 {
        return Err(AppError::Other(
            "Calibre ran but produced no EPUB output.".into(),
        ));
    }
    Ok(size)
}
