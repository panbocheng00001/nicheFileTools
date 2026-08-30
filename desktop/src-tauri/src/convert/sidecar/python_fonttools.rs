use std::fs;
use std::path::Path;

use crate::errors::AppError;

use super::run_command;

/// Convert a Type1 font (`.pfb` / `.pfa`) to TrueType (`.ttf`).
///
/// The desktop uses the Python `fontforge` module (typically already present
/// when Python+fonttools is installed). The metrics file `.pfm` is optional;
/// when supplied its character widths/names are used to enrich the output.
/// FontForge is invoked as a separate process (MIT), so it does not infect the
/// main binary (technical document §8.4).
pub fn pfb_to_ttf(
    python: &Path,
    input_pfb: &Path,
    input_pfm: Option<&Path>,
    output: &Path,
) -> Result<u64, AppError> {
    let pfm_line = match input_pfm {
        Some(p) => format!("pfm = r'{}'\n", p.display()),
        None => "pfm = None\n".to_string(),
    };
    let script = format!(
        "import sys\n\
         try:\n\
         \x20\x20 import fontforge\n\
         except Exception as e:\n\
         \x20\x20 sys.stderr.write('fontforge not available: %s' % e)\n\
         \x20\x20 sys.exit(3)\n\
         {} \
         font = fontforge.open(r'{}')\n\
         if pfm is not None:\n\
         \x20\x20 try:\n\
         \x20\x20\x20\x20 font.mergeFonts(pfm)\n\
         \x20\x20 except Exception as e:\n\
         \x20\x20\x20\x20 sys.stderr.write('pfm merge skipped: %s' % e)\n\
         font.generate(r'{}')\n",
        pfm_line,
        input_pfb.display(),
        output.display()
    );
    let tmp = std::env::temp_dir().join("nichefiletools_pfb_ttf.py");
    fs::write(&tmp, script)?;

    let res = run_command(python, &[tmp.to_string_lossy().into()]);
    let _ = fs::remove_file(&tmp);
    res?;

    let size = fs::metadata(output).map(|m| m.len()).unwrap_or(0);
    if size == 0 {
        return Err(AppError::Other(
            "Font engine ran but produced no TTF output.".into(),
        ));
    }
    Ok(size)
}
