use std::env;
use std::path::PathBuf;

/// External conversion engines, decoupled from Rust-native logic.
///
/// Every variant besides `RustNative` maps to a sidecar binary that the
/// `EngineResolver` detects at runtime. GPL/LGPL engines (Blender, Calibre,
/// OCCT) are only ever invoked as **separate processes** — never statically
/// linked — so they do not infect the main binary (技术文档 §8.1).
#[derive(Clone, Copy, PartialEq, Eq, Debug, Hash)]
pub enum Engine {
    /// Pure Rust, runs directly on the desktop. Always available.
    RustNative,
    /// Bundled static FFmpeg (LGPL) — gsm→wav, mts→mp4.
    Ffmpeg,
    /// Blender (GPL-3.0, process-isolated) — blend→glb.
    Blender,
    /// OpenCASCADE / FreeCAD (LGPL, process-isolated) — STEP/IGES/BREP→stl.
    Occt,
    /// Calibre `ebook-convert` (GPL-3.0, process-isolated) — kfx→epub.
    Calibre,
    /// Python + fonttools (MIT, optional) — pfb/pfm→ttf.
    PythonFonttools,
}

impl Engine {
    /// Stable string used in `tools.json` manifests.
    pub fn as_str(self) -> &'static str {
        match self {
            Engine::RustNative => "rust-native",
            Engine::Ffmpeg => "ffmpeg",
            Engine::Blender => "blender",
            Engine::Occt => "occt",
            Engine::Calibre => "calibre",
            Engine::PythonFonttools => "python-fonttools",
        }
    }

    /// Parse a manifest string into an `Engine`.
    #[allow(dead_code)]
    pub fn from_str(s: &str) -> Option<Engine> {
        match s.trim().to_ascii_lowercase().as_str() {
            "rust-native" | "rust_native" | "native" => Some(Engine::RustNative),
            "ffmpeg" => Some(Engine::Ffmpeg),
            "blender" => Some(Engine::Blender),
            "occt" | "opencascade" | "freecad" => Some(Engine::Occt),
            "calibre" | "ebook-convert" => Some(Engine::Calibre),
            "python-fonttools" | "python_fonttools" | "fonttools" => Some(Engine::PythonFonttools),
            _ => None,
        }
    }

    /// Human-facing download page shown when the engine is missing.
    pub fn install_url(self) -> &'static str {
        match self {
            Engine::RustNative => "",
            Engine::Ffmpeg => "https://ffmpeg.org/download.html",
            Engine::Blender => "https://www.blender.org/download/",
            Engine::Occt => "https://www.freecad.org/download/",
            Engine::Calibre => "https://calibre-ebook.com/download",
            Engine::PythonFonttools => "https://www.python.org/downloads/",
        }
    }

    /// Friendly engine name for UI prompts.
    pub fn label(self) -> &'static str {
        match self {
            Engine::RustNative => "Built-in",
            Engine::Ffmpeg => "FFmpeg",
            Engine::Blender => "Blender",
            Engine::Occt => "FreeCAD / OpenCASCADE",
            Engine::Calibre => "Calibre",
            Engine::PythonFonttools => "Python + fonttools",
        }
    }
}

/// Detected sidecar binaries. Built once per process via [`EngineResolver::detect`].
pub struct EngineResolver {
    pub ffmpeg_bin: Option<PathBuf>,
    pub blender_bin: Option<PathBuf>,
    pub occt_bin: Option<PathBuf>,
    pub calibre_bin: Option<PathBuf>,
    pub python_bin: Option<PathBuf>,
}

impl EngineResolver {
    /// Scan PATH plus well-known env-var overrides for every external engine.
    pub fn detect() -> Self {
        EngineResolver {
            ffmpeg_bin: resolve_ffmpeg(),
            blender_bin: resolve_blender(),
            occt_bin: resolve_occt(),
            calibre_bin: resolve_calibre(),
            python_bin: resolve_python(),
        }
    }

    /// Whether the given engine is usable on this machine.
    pub fn is_available(&self, e: Engine) -> bool {
        match e {
            Engine::RustNative => true,
            Engine::Ffmpeg => self.ffmpeg_bin.is_some(),
            Engine::Blender => self.blender_bin.is_some(),
            Engine::Occt => self.occt_bin.is_some(),
            Engine::Calibre => self.calibre_bin.is_some(),
            Engine::PythonFonttools => self.python_bin.is_some(),
        }
    }

    /// Resolve a usable binary path for `e`, or `None` if absent.
    pub fn bin(&self, e: Engine) -> Option<&PathBuf> {
        match e {
            Engine::RustNative => None,
            Engine::Ffmpeg => self.ffmpeg_bin.as_ref(),
            Engine::Blender => self.blender_bin.as_ref(),
            Engine::Occt => self.occt_bin.as_ref(),
            Engine::Calibre => self.calibre_bin.as_ref(),
            Engine::PythonFonttools => self.python_bin.as_ref(),
        }
    }
}

/// Look up `name` (+ `.exe`) in each PATH directory.
fn which(name: &str) -> Option<PathBuf> {
    let path = env::var("PATH").unwrap_or_default();
    for dir in env::split_paths(&path) {
        for ext in ["", ".exe"] {
            let candidate: PathBuf = dir.join(format!("{name}{ext}"));
            if candidate.is_file() {
                return Some(candidate);
            }
        }
    }
    None
}

/// Prefer an explicit env override, then fall back to PATH lookup.
fn resolve_with_env(env_keys: &[&str], path_names: &[&str]) -> Option<PathBuf> {
    for key in env_keys {
        if let Ok(v) = env::var(key) {
            let p = PathBuf::from(&v);
            if p.is_file() {
                return Some(p);
            }
        }
    }
    for n in path_names {
        if let Some(p) = which(n) {
            return Some(p);
        }
    }
    None
}

fn resolve_ffmpeg() -> Option<PathBuf> {
    resolve_with_env(&["FFMPEG_BIN", "NICHE_FFMPEG"], &["ffmpeg"])
}

fn resolve_blender() -> Option<PathBuf> {
    // Honour the legacy BLENDER_CMD used by the old converter.
    resolve_with_env(&["BLENDER_CMD", "NICHE_BLENDER"], &["blender"])
}

fn resolve_occt() -> Option<PathBuf> {
    resolve_with_env(
        &["FREECAD_CMD", "OCCT_BIN", "NICHE_OCCT"],
        &["freecadcmd", "DRAWEXE", "occt"],
    )
}

fn resolve_calibre() -> Option<PathBuf> {
    resolve_with_env(&["CALIBRE_BIN", "NICHE_CALIBRE"], &["ebook-convert", "calibre"])
}

fn resolve_python() -> Option<PathBuf> {
    resolve_with_env(&["PYTHON_BIN", "NICHE_PYTHON"], &["python", "py"])
}
