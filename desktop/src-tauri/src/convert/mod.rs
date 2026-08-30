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
/// main program does not need to know about individual tools (technical document §3.3).
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
    use crate::convert::converter::{NoopSink, ProgressPhase, ProgressSink};
    use crate::convert::engine::{Engine, EngineResolver};
    use crate::errors::AppError;
    use std::io::Read;
    use std::path::Path;
    use std::sync::Mutex;
    use zip::read::ZipArchive;

    /// Test sink that records every progress report so tests can assert the
    /// byte-level channel actually fired and landed on the right final value.
    struct Capture {
        events: Mutex<Vec<(String, u64, u64)>>,
    }
    impl ProgressSink for Capture {
        fn report(&self, phase: ProgressPhase, processed: u64, total: u64) {
            self.events
                .lock()
                .unwrap()
                .push((phase.as_str().to_string(), processed, total));
        }
    }

    /// Project `test-fixtures/` relative to the crate manifest.
    fn fixtures_dir() -> std::path::PathBuf {
        Path::new(env!("CARGO_MANIFEST_DIR")).join("../../test-fixtures")
    }

    /// On real `.exr` fixtures the pure-Rust EXR→PNG path must produce a valid,
    /// non-empty PNG. Skips silently when fixtures are absent (e.g. CI).
    ///
    /// Real-world EXR files vary; the `exr` crate cannot decode every sample
    /// (e.g. unusual channel sampling → "zero sampling factor"). Those are a
    /// known decoder limitation, logged as `unsupported` rather than failing the
    /// suite — but we still require at least one real fixture to convert, which
    /// proves the happy path works on genuine data.
    #[test]
    fn exr_to_png_real_fixtures() {
        let dir = fixtures_dir().join("exr");
        if !dir.exists() {
            return;
        }
        let mut ok = 0u32;
        let mut unsupported = 0u32;
        let mut i = 0u32;
        for entry in std::fs::read_dir(&dir).expect("read test-fixtures/exr") {
            let path = match entry {
                Ok(e) => e.path(),
                Err(_) => continue,
            };
            if path.extension().and_then(|e| e.to_str()) != Some("exr") {
                continue;
            }
            let out = std::env::temp_dir().join(format!("niche_exr_{i}.png"));
            i += 1;
            match convert("exr-to-png", &path, &out, None, &NoopSink) {
                Ok(size) => {
                    assert!(size > 0, "empty PNG written for {:?}", path);
                    let bytes = std::fs::read(&out).expect("read png output");
                    assert_eq!(
                        &bytes[0..8],
                        b"\x89PNG\r\n\x1a\n",
                        "output is not a PNG for {:?}",
                        path
                    );
                    ok += 1;
                }
                Err(e) => {
                    let msg = e.to_string();
                    let is_decode_limit = msg.contains("decode")
                        || msg.contains("EXR")
                        || msg.contains("Invalid or corrupted");
                    if is_decode_limit {
                        unsupported += 1;
                        eprintln!("  exr unsupported by decoder: {} -> {msg}", path.display());
                    } else {
                        panic!("exr convert failed unexpectedly for {:?}: {e}", path);
                    }
                }
            }
        }
        assert!(ok > 0, "expected at least one real .exr fixture to convert");
        eprintln!("exr fixtures: {ok} converted, {unsupported} unsupported by decoder");
    }

    /// Every sidecar-backed tool must short-circuit with `EngineMissing` when its
    /// external engine is absent — derived dynamically from the registry so adding
    /// a new sidecar tool is automatically covered. Tools whose engine IS installed
    /// are skipped here (the gate is not under test; real runs are covered by the
    /// guarded `*_real_when_*_present` tests).
    #[test]
    fn sidecar_tools_gate_engine_missing() {
        let resolver = EngineResolver::detect();
        let dummy_in = std::env::temp_dir().join("niche_dummy_input.bin");
        let dummy_out = std::env::temp_dir().join("niche_dummy_out.bin");
        for tool in crate::convert::all() {
            for eng in tool.engines() {
                if *eng == Engine::RustNative {
                    continue;
                }
                if resolver.is_available(*eng) {
                    continue; // engine present — gate not under test; real run covered elsewhere
                }
                match convert(tool.slug(), &dummy_in, &dummy_out, None, &NoopSink) {
                    Err(AppError::EngineMissing(_)) => {}
                    other => panic!(
                        "expected EngineMissing for `{}` (engine {} absent), got {:?}",
                        tool.slug(),
                        eng.as_str(),
                        other
                    ),
                }
            }
        }
    }

    /// The byte-level progress channel must actually fire during conversion: a
    /// streaming tool (RAW→WAV) reports `Writing` progress whose final value
    /// equals the output size. Catches regressions where the sink is never called.
    #[test]
    fn convert_reports_byte_progress() {
        struct CaptureSink {
            max_processed: Mutex<u64>,
            phases: Mutex<Vec<String>>,
        }
        impl ProgressSink for CaptureSink {
            fn report(&self, phase: ProgressPhase, processed: u64, _total: u64) {
                let mut m = self.max_processed.lock().unwrap();
                if processed > *m {
                    *m = processed;
                }
                self.phases.lock().unwrap().push(phase.as_str().to_string());
            }
        }

        let dir = std::env::temp_dir().join("nichefiletools_tests");
        let _ = std::fs::create_dir_all(&dir);
        let inp = dir.join("prog.raw");
        let outp = dir.join("prog.wav");
        // 20 KB > one 64 KB chunk, so multiple progress reports are emitted.
        std::fs::write(&inp, vec![0u8; 20 * 1024]).unwrap();

        let sink = CaptureSink {
            max_processed: Mutex::new(0),
            phases: Mutex::new(Vec::new()),
        };
        let size = convert("raw-to-wav", &inp, &outp, None, &sink).unwrap();
        assert!(size > 0);

        let max = *sink.max_processed.lock().unwrap();
        assert!(max > 0, "sink should have received byte progress");
        assert_eq!(max, size, "final reported bytes should equal output size");
        let phases = sink.phases.lock().unwrap();
        assert!(
            phases.iter().any(|p| p == "writing"),
            "should report a writing phase, got {phases:?}"
        );

        let _ = std::fs::remove_file(&inp);
        let _ = std::fs::remove_file(&outp);
    }

    // ======================================================================
    // Helpers for the integration tests below.
    // ======================================================================
    fn workdir() -> std::path::PathBuf {
        let d = std::env::temp_dir().join("nichefiletools_tests");
        let _ = std::fs::create_dir_all(&d);
        d
    }

    const OPF_BODY: &str = r#"<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <metadata><title>Demo</title></metadata>
  <manifest>
    <item href="cover.png" media-type="image/png"/>
    <item href="ch1.html" media-type="application/xhtml+xml"/>
  </manifest>
</package>"#;

    /// Build a small OPF package (OPF + two referenced resources) and return the
    /// OPF path plus the intended `.epub` output path.
    ///
    /// `case` must be unique per test: cargo runs tests in parallel threads, and
    /// sharing one directory meant one test's `remove_dir_all` could wipe the
    /// fixture another test was mid-way through reading (a real flake we hit).
    fn make_opf_case(case: &str) -> (std::path::PathBuf, std::path::PathBuf) {
        let d = workdir().join(format!("opf_case_{case}"));
        let _ = std::fs::remove_dir_all(&d);
        std::fs::create_dir_all(&d).unwrap();
        let opf = d.join("content.opf");
        std::fs::write(&opf, OPF_BODY).unwrap();
        std::fs::write(d.join("cover.png"), b"\x89PNG\r\n\x1a\nFAKE").unwrap();
        std::fs::write(d.join("ch1.html"), b"<html><body>Hi</body></html>").unwrap();
        let outp = d.join("book.epub");
        (opf, outp)
    }

    /// Whether the detected Python interpreter can `import` the named module.
    fn python_has_module(name: &str) -> bool {
        let Some(py) = EngineResolver::detect().python_bin.clone() else {
            return false;
        };
        std::process::Command::new(py)
            .args(["-c", &format!("import {name}")])
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }

    // ======================================================================
    // Manifest <-> registry consistency (guards against drift between
    // tools.json and the Rust converter registry).
    // ======================================================================
    #[test]
    fn manifest_and_registry_consistent() {
        let manifest = crate::convert::manifest::tools();
        let converters = crate::convert::all();
        assert_eq!(manifest.len(), 15, "tools.json should declare 15 tools");
        assert_eq!(converters.len(), 15, "registry should register 15 tools");

        for m in manifest {
            assert!(
                crate::convert::get(&m.slug).is_some(),
                "no converter registered for manifest slug `{}`",
                m.slug
            );
        }
        for c in converters {
            let slug = c.slug();
            let m = crate::convert::manifest::tool(slug)
                .unwrap_or_else(|| panic!("manifest missing entry for converter `{slug}`"));
            let mut conv_engines: Vec<&str> = c.engines().iter().map(|e| e.as_str()).collect();
            let mut manifest_engines: Vec<&str> = m.engines.iter().map(|s| s.as_str()).collect();
            conv_engines.sort_unstable();
            manifest_engines.sort_unstable();
            assert_eq!(
                conv_engines, manifest_engines,
                "engine mismatch for `{slug}`: converter {conv_engines:?} vs manifest {manifest_engines:?}"
            );
        }
    }

    // ======================================================================
    // Pure-Rust happy paths (these always run — no external engine needed).
    // ======================================================================
    #[test]
    fn raw_to_iso_sectors() {
        // 3 sectors of 2352 bytes -> 3*2048 output bytes; each block equals the
        // input's 16..2064 user-data slice.
        let sector = [0xABu8; 2352];
        let mut raw = Vec::new();
        for _ in 0..3 {
            raw.extend_from_slice(&sector);
        }
        let d = workdir();
        let inp = d.join("iso_in.raw");
        let outp = d.join("iso_out.iso");
        std::fs::write(&inp, &raw).unwrap();
        let n = convert("raw-to-iso", &inp, &outp, None, &NoopSink).unwrap();
        assert_eq!(n, 3 * 2048);
        let out = std::fs::read(&outp).unwrap();
        assert_eq!(out.len(), 3 * 2048);
        for i in 0..3 {
            assert_eq!(
                &out[i * 2048..(i + 1) * 2048],
                &raw[i * 2352 + 16..i * 2352 + 2064]
            );
        }
        let _ = std::fs::remove_file(&inp);
        let _ = std::fs::remove_file(&outp);
    }

    #[test]
    fn raw_to_iso_rejects_non_sector_size() {
        let d = workdir();
        let inp = d.join("iso_bad.raw");
        let outp = d.join("iso_bad.iso");
        std::fs::write(&inp, vec![0u8; 100]).unwrap(); // 100 is not a multiple of 2352
        match convert("raw-to-iso", &inp, &outp, None, &NoopSink) {
            Err(AppError::InvalidFile(_)) => {}
            other => panic!("expected InvalidFile for bad RAW size, got {other:?}"),
        }
        let _ = std::fs::remove_file(&inp);
    }

    #[test]
    fn opf_to_epub_builds_valid_epub() {
        let (opf, outp) = make_opf_case("valid");
        let _ = convert("opf-to-epub", &opf, &outp, None, &NoopSink).unwrap();

        let file = std::fs::File::open(&outp).unwrap();
        let mut archive = ZipArchive::new(file).unwrap();
        let mut names = Vec::new();
        for i in 0..archive.len() {
            names.push(archive.by_index(i).unwrap().name().to_string());
        }
        // EPUB requires `mimetype` as the very first, stored, uncompressed entry.
        assert_eq!(names.first().map(|s| s.as_str()), Some("mimetype"));
        let mimetype = {
            let mut mt = archive.by_name("mimetype").unwrap();
            let mut buf = String::new();
            mt.read_to_string(&mut buf).unwrap();
            buf
        };
        assert_eq!(mimetype, "application/epub+zip");
        assert!(archive.by_name("META-INF/container.xml").is_ok());
        assert!(archive.by_name("OEBPS/content.opf").is_ok());
        assert!(archive.by_name("OEBPS/cover.png").is_ok());
        assert!(archive.by_name("OEBPS/ch1.html").is_ok());
        let _ = std::fs::remove_dir_all(workdir().join("opf_case_valid"));
    }

    #[test]
    fn opf_to_epub_reports_progress() {
        let (opf, outp) = make_opf_case("progress");
        let cap = Capture {
            events: Mutex::new(Vec::new()),
        };
        let _ = convert("opf-to-epub", &opf, &outp, None, &cap).unwrap();
        let evs = cap.events.lock().unwrap();
        assert!(!evs.is_empty(), "no progress events emitted for opf->epub");
        assert!(
            evs.iter().any(|e| e.0 == "writing"),
            "opf->epub should report a writing phase, got {evs:?}"
        );
        let _ = std::fs::remove_dir_all(workdir().join("opf_case_progress"));
    }

    #[test]
    fn pvr_to_png_rgba8888() {
        // 2x2 RGBA8888: 52-byte header (metaDataSize=0) + 16 bytes of pixel data.
        let mut buf = vec![0u8; 52];
        buf[0..4].copy_from_slice(&0x0352_5650u32.to_le_bytes()); // PVR3 magic
        buf[24..28].copy_from_slice(&2u32.to_le_bytes()); // height
        buf[28..32].copy_from_slice(&2u32.to_le_bytes()); // width
        buf.extend_from_slice(&[1u8, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
        let d = workdir();
        let inp = d.join("pvr_in.pvr");
        let outp = d.join("pvr_out.png");
        std::fs::write(&inp, &buf).unwrap();
        let n = convert("pvr-to-png", &inp, &outp, None, &NoopSink).unwrap();
        assert!(n > 0);
        let out = std::fs::read(&outp).unwrap();
        assert_eq!(&out[0..8], b"\x89PNG\r\n\x1a\n");
        let _ = std::fs::remove_file(&inp);
        let _ = std::fs::remove_file(&outp);
    }

    #[test]
    fn pvr_to_png_rejects_bad_magic() {
        let d = workdir();
        let inp = d.join("pvr_bad.pvr");
        let outp = d.join("pvr_bad.png");
        std::fs::write(&inp, vec![0u8; 80]).unwrap();
        match convert("pvr-to-png", &inp, &outp, None, &NoopSink) {
            Err(AppError::InvalidFile(_)) => {}
            other => panic!("expected InvalidFile for bad PVR magic, got {other:?}"),
        }
        let _ = std::fs::remove_file(&inp);
    }

    #[test]
    fn pvr_to_png_rejects_unsupported_layout() {
        // 2x2 but 20 bytes of data (matches none of 4/3/1 * 4) -> NotImplemented.
        let mut buf = vec![0u8; 52];
        buf[0..4].copy_from_slice(&0x0352_5650u32.to_le_bytes());
        buf[24..28].copy_from_slice(&2u32.to_le_bytes());
        buf[28..32].copy_from_slice(&2u32.to_le_bytes());
        buf.extend_from_slice(&[0u8; 20]);
        let d = workdir();
        let inp = d.join("pvr_layout.pvr");
        let outp = d.join("pvr_layout.png");
        std::fs::write(&inp, &buf).unwrap();
        match convert("pvr-to-png", &inp, &outp, None, &NoopSink) {
            Err(AppError::NotImplemented(_)) => {}
            other => panic!("expected NotImplemented for unsupported PVR layout, got {other:?}"),
        }
        let _ = std::fs::remove_file(&inp);
    }

    #[test]
    fn wad_extractor_real_fixtures() {
        let dir = fixtures_dir().join("wad");
        if !dir.exists() {
            return;
        }
        let d = workdir();
        let mut tested = 0u32;
        for entry in std::fs::read_dir(&dir).unwrap() {
            let path = entry.unwrap().path();
            if path.extension().and_then(|e| e.to_str()) != Some("wad") {
                continue;
            }
            let out_dir = d.join(format!("wad_fix_{tested}"));
            let _ = std::fs::remove_dir_all(&out_dir);
            let n = convert("wad-extractor", &path, &out_dir.join("extracted"), None, &NoopSink)
                .unwrap_or_else(|e| panic!("wad extract failed for {:?}: {e}", path));
            assert!(n > 0, "wad extracted zero bytes for {:?}", path);
            let count = std::fs::read_dir(&out_dir.join("extracted"))
                .unwrap()
                .count();
            assert!(count > 0, "no lumps written for {:?}", path);
            tested += 1;
        }
        assert!(tested > 0, "expected at least one .wad fixture");
    }

    // ======================================================================
    // Byte-progress channel (streaming pure-Rust tools must actually emit).
    // ======================================================================
    #[test]
    fn raw_to_iso_reports_byte_progress() {
        let sector = [0u8; 2352];
        let mut raw = Vec::new();
        for _ in 0..5 {
            raw.extend_from_slice(&sector);
        }
        let d = workdir();
        let inp = d.join("iso_p.raw");
        let outp = d.join("iso_p.iso");
        std::fs::write(&inp, &raw).unwrap();
        let cap = Capture {
            events: Mutex::new(Vec::new()),
        };
        let total_out = (5 * 2048) as u64;
        let _ = convert("raw-to-iso", &inp, &outp, None, &cap).unwrap();
        let evs = cap.events.lock().unwrap();
        assert!(!evs.is_empty(), "no progress events emitted for raw->iso");
        assert!(evs.iter().any(|e| e.0 == "writing"));
        let last = evs.last().unwrap();
        assert_eq!(last.1, total_out, "final processed must equal output size");
        let _ = std::fs::remove_file(&inp);
        let _ = std::fs::remove_file(&outp);
    }

    #[test]
    fn wad_extractor_reports_progress() {
        // Tiny valid IWAD: 2 lumps (4 + 8 bytes); directory sits at offset 52,
        // after the 40-byte header region + both lumps.
        let mut buf = Vec::new();
        buf.extend_from_slice(b"IWAD");
        buf.extend_from_slice(&2u32.to_le_bytes());
        buf.extend_from_slice(&52u32.to_le_bytes());
        while buf.len() < 40 {
            buf.push(0);
        }
        let lump1 = [1u8, 2, 3, 4];
        let off1 = 40u32;
        buf.extend_from_slice(&lump1);
        let lump2 = [9u8, 8, 7, 6, 5, 4, 3, 2];
        let off2 = buf.len() as u32; // 44
        buf.extend_from_slice(&lump2);
        // directory entry 1
        buf.extend_from_slice(&off1.to_le_bytes());
        buf.extend_from_slice(&4u32.to_le_bytes());
        let mut n1 = [0u8; 8];
        n1[..1].copy_from_slice(b"A");
        buf.extend_from_slice(&n1);
        // directory entry 2
        buf.extend_from_slice(&off2.to_le_bytes());
        buf.extend_from_slice(&8u32.to_le_bytes());
        let mut n2 = [0u8; 8];
        n2[..1].copy_from_slice(b"B");
        buf.extend_from_slice(&n2);

        let d = workdir();
        let inp = d.join("wad_p.wad");
        let outd = d.join("wad_p_extract");
        let _ = std::fs::remove_dir_all(&outd);
        std::fs::write(&inp, &buf).unwrap();
        let cap = Capture {
            events: Mutex::new(Vec::new()),
        };
        let _ = convert("wad-extractor", &inp, &outd.join("extracted"), None, &cap).unwrap();
        let evs = cap.events.lock().unwrap();
        assert!(!evs.is_empty(), "no progress events emitted for wad extract");
        assert!(evs.iter().any(|e| e.0 == "writing"));
        let last = evs.last().unwrap();
        assert_eq!(last.1, 12, "final processed must equal total lump bytes (4+8); events: {evs:?}");
        let _ = std::fs::remove_file(&inp);
        let _ = std::fs::remove_dir_all(&outd);
    }

    // ======================================================================
    // Guarded sidecar real runs — only execute when the engine is installed.
    // On a bare CI these skip (the gate test above already covers the absent
    // case); on a provisioned machine they exercise the real conversion path.
    // ======================================================================
    #[test]
    fn gsm_to_wav_real_when_ffmpeg_present() {
        let dir = fixtures_dir().join("gsm");
        if !dir.exists() || EngineResolver::detect().ffmpeg_bin.is_none() {
            return;
        }
        let gsm = dir.join("tone-440hz.gsm");
        if !gsm.exists() {
            return;
        }
        let outp = workdir().join("tone-440hz.wav");
        let _ = convert("gsm-to-wav", &gsm, &outp, None, &NoopSink).unwrap();
        let out = std::fs::read(&outp).unwrap();
        assert_eq!(&out[0..4], b"RIFF");
    }

    #[test]
    fn mts_to_mp4_real_when_ffmpeg_present() {
        let dir = fixtures_dir().join("mts");
        if !dir.exists() || EngineResolver::detect().ffmpeg_bin.is_none() {
            return;
        }
        let mts = std::fs::read_dir(&dir)
            .unwrap()
            .filter_map(|e| {
                let p = e.ok()?.path();
                (p.extension().and_then(|x| x.to_str()) == Some("mts")).then_some(p)
            })
            .next();
        let Some(mts) = mts else { return; };
        let outp = workdir().join("out.mp4");
        let _ = convert("mts-to-mp4", &mts, &outp, None, &NoopSink).unwrap();
        let out = std::fs::read(&outp).unwrap();
        assert_eq!(&out[4..8], b"ftyp");
    }

    #[test]
    fn pfm_to_ttf_real_when_fontforge_present() {
        let dir = fixtures_dir().join("type1-fonts");
        if !dir.exists() || !python_has_module("fontforge") {
            return;
        }
        let pfb = dir.join("cmr10.pfb");
        if !pfb.exists() {
            return;
        }
        let outp = workdir().join("cmr10.ttf");
        let _ = convert("pfm-to-ttf", &pfb, &outp, None, &NoopSink).unwrap();
        let out = std::fs::read(&outp).unwrap();
        assert!(out.len() > 0);
        let looks_like_font = out.starts_with(b"typ1")
            || out.starts_with(b"OTTO")
            || out.starts_with(&[0x00, 0x01, 0x00, 0x00]);
        assert!(looks_like_font, "output does not look like a font");
    }
}
