pub mod converter;
pub mod engine;
pub mod manifest;
pub mod progress;
pub mod sidecar;
pub mod tools;

use std::path::Path;

use serde::Serialize;

use crate::convert::converter::Converter;
use crate::convert::engine::EngineResolver;
use crate::errors::AppError;

use tools::blend_to_glb::BlendToGlbConverter;
use tools::eot_to_ttf::EotToTtfConverter;
use tools::exr_to_png::ExrToPngConverter;
use tools::glb_to_gltf::GlbToGltfConverter;
use tools::gsm_to_wav::GsmToWavConverter;
use tools::kfx_to_epub::KfxToEpubConverter;
use tools::mts_to_mp4::MtsToMp4Converter;
use tools::opf_to_epub::OpfToEpubConverter;
use tools::pfm_to_ttf::PfmToTtfConverter;
use tools::pvr_to_png::PvrToPngConverter;
use tools::raw_to_iso::RawToIsoConverter;
use tools::raw_to_wav::RawToWavConverter;
use tools::sav_to_csv::SavToCsvConverter;
use tools::step_to_stl::StepToStlConverter;
use tools::wad_extractor::WadExtractor;

/// Every desktop converter, registered in one place.
///
/// Adding a tool is now: drop a module in `tools/`, add one line here, add one
/// record to `tools.json`. The UI and engine resolver read the manifest — the
/// main program does not need to know about individual tools (技术文档 §3.3).
pub fn all() -> &'static [&'static dyn Converter] {
    &[
        &RawToIsoConverter,
        &RawToWavConverter,
        &EotToTtfConverter,
        &GlbToGltfConverter,
        &ExrToPngConverter,
        &OpfToEpubConverter,
        &SavToCsvConverter,
        &WadExtractor,
        &PvrToPngConverter,
        &GsmToWavConverter,
        &MtsToMp4Converter,
        &BlendToGlbConverter,
        &KfxToEpubConverter,
        &StepToStlConverter,
        &PfmToTtfConverter,
    ]
}

/// Resolve a converter by slug.
pub fn get(slug: &str) -> Option<&'static dyn Converter> {
    all().iter().copied().find(|c| c.slug() == slug)
}

/// Dispatch a conversion: lookup → engine pre-check → run.
///
/// `sink` receives byte-level progress (see `converter::ProgressSink`). The batch
/// command passes a live event sink; the single-file command passes `NoopSink`.
pub fn convert(
    slug: &str,
    input: &Path,
    output: &Path,
    opts: Option<&serde_json::Value>,
    sink: &dyn converter::ProgressSink,
) -> Result<u64, AppError> {
    let tool = get(slug).ok_or_else(|| AppError::UnsupportedTool(slug.to_string()))?;

    // Centralized engine-gate: any missing external engine => EngineMissing so the
    // UI can guide installation instead of failing silently.
    let resolver = EngineResolver::detect();
    for e in tool.engines() {
        if !resolver.is_available(*e) {
            return Err(AppError::EngineMissing(e.label().to_string()));
        }
    }

    tool.convert_with_progress(input, output, opts, sink)
}

/// Serializable list of tools for the desktop UI (the single source of truth).
pub fn list_tools() -> Vec<manifest::ToolMeta> {
    manifest::tools().to_vec()
}

/// Serializable per-tool engine availability, used to prompt installs.
#[derive(Serialize)]
pub struct EngineInfo {
    pub engine: String,
    pub label: String,
    pub url: String,
}

#[derive(Serialize)]
pub struct EngineStatus {
    pub slug: String,
    pub available: bool,
    pub missing: Vec<EngineInfo>,
    pub guide: Option<String>,
}

/// Whether the engines required by `slug` are installed on this machine.
pub fn engine_status(slug: &str) -> EngineStatus {
    let mut missing = Vec::new();
    let mut available = true;
    if let Some(tool) = get(slug) {
        let resolver = EngineResolver::detect();
        for e in tool.engines() {
            if !resolver.is_available(*e) {
                available = false;
                missing.push(EngineInfo {
                    engine: e.as_str().to_string(),
                    label: e.label().to_string(),
                    url: e.install_url().to_string(),
                });
            }
        }
    }
    let guide = manifest::tool(slug).and_then(|m| m.guide.clone());
    EngineStatus {
        slug: slug.to_string(),
        available,
        missing,
        guide,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::convert::converter::NoopSink;
    use crate::convert::engine::{Engine, EngineResolver};
    use crate::errors::AppError;
    use std::path::Path;

    /// Project `test-fixtures/` relative to the crate manifest.
    fn fixtures_dir() -> std::path::PathBuf {
        Path::new(env!("CARGO_MANIFEST_DIR")).join("../../../test-fixtures")
    }

    /// On real `.exr` fixtures the pure-Rust EXR→PNG path must produce a valid,
    /// non-empty PNG. Skips silently when fixtures are absent (e.g. CI).
    #[test]
    fn exr_to_png_real_fixtures() {
        let dir = fixtures_dir();
        if !dir.exists() {
            return;
        }
        let mut tested = 0u32;
        for entry in std::fs::read_dir(&dir).expect("read test-fixtures") {
            let path = match entry {
                Ok(e) => e.path(),
                Err(_) => continue,
            };
            if path.extension().and_then(|e| e.to_str()) != Some("exr") {
                continue;
            }
            let out = std::env::temp_dir().join(format!("niche_exr_{tested}.png"));
            let size = convert("exr-to-png", &path, &out, None, &NoopSink)
                .unwrap_or_else(|e| panic!("exr convert failed for {:?}: {e}", path));
            assert!(size > 0, "empty PNG written for {:?}", path);
            let bytes = std::fs::read(&out).expect("read png output");
            assert_eq!(
                &bytes[0..8],
                b"\x89PNG\r\n\x1a\n",
                "output is not a PNG for {:?}",
                path
            );
            tested += 1;
        }
        assert!(tested > 0, "expected at least one .exr fixture to exercise");
    }

    /// Sidecar tools must short-circuit with `EngineMissing` (never panic, never
    /// touch the file) when their external engine is absent. When an engine is
    /// present we skip the assertion (it would proceed to read the input).
    #[test]
    fn sidecar_tools_gate_engine_missing() {
        let resolver = EngineResolver::detect();
        let cases: &[(&str, Engine)] = &[
            ("gsm-to-wav", Engine::Ffmpeg),
            ("mts-to-mp4", Engine::Ffmpeg),
            ("blend-to-glb", Engine::Blender),
            ("kfx-to-epub", Engine::Calibre),
            ("step-to-stl", Engine::Occt),
            ("pfm-to-ttf", Engine::PythonFonttools),
            ("sav-to-csv", Engine::PythonFonttools),
        ];
        for (slug, eng) in cases {
            if resolver.is_available(*eng) {
                continue; // engine present — the gate is not under test here
            }
            let dummy_in = std::env::temp_dir().join("niche_dummy_input.bin");
            let dummy_out = std::env::temp_dir().join("niche_dummy_out.bin");
            match convert(slug, &dummy_in, &dummy_out, None, &NoopSink) {
                Err(AppError::EngineMissing(_)) => {}
                other => panic!(
                    "expected EngineMissing for `{slug}` (engine absent), got {other:?}"
                ),
            }
        }
    }
}
