use std::fs;
use std::path::Path;

use crate::convert::converter::Converter;
use crate::convert::engine::Engine;
use crate::errors::AppError;

use crate::convert::engine::EngineResolver;
use crate::convert::sidecar::run_command;

/// SAV (SPSS) -> CSV.
///
/// A native SPSS reader is large and brittle; the robust, well-trodden path is
/// Python's `pandas.read_spss` (which wraps the C `readstat` library). We shell
/// out to a detected Python interpreter as a **separate process** (MIT). If
/// `pandas` is not installed we return a clear `MissingDependency` guiding the
/// user to `pip install pandas` (技术文档 §7.7).
pub struct SavToCsvConverter;

impl Converter for SavToCsvConverter {
    fn slug(&self) -> &'static str {
        "sav-to-csv"
    }
    fn class_type(&self) -> &'static str {
        "A"
    }
    fn engines(&self) -> &'static [Engine] {
        &[Engine::PythonFonttools]
    }
    fn convert(&self, input: &Path, output: &Path) -> Result<u64, AppError> {
        let resolver = EngineResolver::detect();
        let python = resolver
            .bin(Engine::PythonFonttools)
            .ok_or_else(|| AppError::EngineMissing(Engine::PythonFonttools.label().to_string()))?;

        let script = "import sys\n\
            try:\n\
            \x20\x20 import pandas as pd\n\
            except Exception as e:\n\
            \x20\x20 sys.stderr.write('pandas not available: %s' % e)\n\
            \x20\x20 sys.exit(3)\n\
            df = pd.read_spss(sys.argv[1])\n\
            df.to_csv(sys.argv[2], index=False)\n";
        let tmp = std::env::temp_dir().join("nichefiletools_sav_csv.py");
        fs::write(&tmp, script)?;

        let res = run_command(
            python,
            &[tmp.to_string_lossy().into(), input.display().to_string(), output.display().to_string()],
        );
        let _ = fs::remove_file(&tmp);
        match res {
            Ok(_) => {}
            Err(AppError::SidecarFailed(msg)) if msg.contains("pandas") => {
                return Err(AppError::MissingDependency(
                    "SAV conversion needs Python + pandas. Install with: pip install pandas".into(),
                ));
            }
            Err(e) => return Err(e),
        }

        let size = fs::metadata(output).map(|m| m.len()).unwrap_or(0);
        if size == 0 {
            return Err(AppError::Other("pandas ran but produced no CSV output.".into()));
        }
        Ok(size)
    }
}
