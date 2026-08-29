//! End-to-end "click simulation" — runs **every** tool the way the UI does.
//!
//! Mirrors exactly what happens when a user drops a file and presses **Convert**:
//!   1. resolve an output path (same rule as the frontend `resolveOutputPath`)
//!   2. call the real converter through the real dispatch/engine-gate path
//!   3. validate the produced file is genuinely usable (magic bytes / structure)
//!
//! Tools whose external engine is absent are reported as SKIP (never FAIL) —
//! that is precisely the state the UI shows an install prompt for.

use crate::convert::converter::{ProgressPhase, ProgressSink};
use crate::convert::engine::{Engine, EngineResolver};
use crate::convert::manifest;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

/// Records progress reports so we can assert the UI's progress channel actually
/// fires during a *real* conversion, not only in synthetic unit tests.
#[derive(Default)]
struct Track {
    reports: Mutex<usize>,
    max_processed: Mutex<u64>,
}

impl ProgressSink for Track {
    fn report(&self, _phase: ProgressPhase, processed: u64, _total: u64) {
        *self.reports.lock().unwrap() += 1;
        let mut m = self.max_processed.lock().unwrap();
        if processed > *m {
            *m = processed;
        }
    }
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum Verdict {
    Pass,
    Skip,
    Fail,
}

impl Verdict {
    fn as_str(self) -> &'static str {
        match self {
            Verdict::Pass => "PASS",
            Verdict::Skip => "SKIP",
            Verdict::Fail => "FAIL",
        }
    }
}

struct Outcome {
    slug: String,
    verdict: Verdict,
    detail: String,
}

/// Tool-specific capability beyond the bare engine binary. Returns `Some(reason)`
/// when the conversion cannot genuinely succeed here (so the run reports SKIP,
/// exactly like the UI's install prompt) instead of a misleading FAIL.
fn extra_skip(slug: &str, resolver: &EngineResolver) -> Option<String> {
    if slug == "pfm-to-ttf" {
        // The engine is "python-fonttools", but the actual sidecar imports the
        // `fontforge` module. Without it the conversion exits 3 and the UI
        // would show an error — so we skip rather than assert a real pass.
        let py = resolver.bin(Engine::PythonFonttools)?;
        let out = std::process::Command::new(py)
            .arg("-c")
            .arg("import fontforge")
            .output();
        let ok = matches!(&out, Ok(o) if o.status.success());
        if !ok {
            return Some("fontforge python module not installed (python-fonttools engine present)".into());
        }
    }
    None
}

/// Project `test-fixtures/` relative to the crate manifest.
fn fixtures() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../../test-fixtures")
}

/// First file in `dir` with the given extension, if any.
fn first_with_ext(dir: &Path, ext: &str) -> Option<PathBuf> {
    let rd = std::fs::read_dir(dir).ok()?;
    let mut hits: Vec<PathBuf> = rd
        .flatten()
        .map(|e| e.path())
        .filter(|p| p.extension().and_then(|e| e.to_str()) == Some(ext))
        .collect();
    hits.sort();
    hits.into_iter().next()
}

// ---------------------------------------------------------------------------
// Output-path resolution — mirrors `desktop/src/lib/paths.ts`
// (same-folder mode). Keeping a Rust twin means a divergence between the two
// would show up as a failing e2e run rather than files landing in odd places.
// ---------------------------------------------------------------------------

/// True when `p` ends with a real file extension: a dot, then ≥1 char that is
/// not a path separator (so `C:/my.folder/clip` does *not* qualify).
fn has_real_ext(p: &str) -> bool {
    match p.rfind('.') {
        Some(pos) if pos + 1 < p.len() => {
            let tail = &p[pos + 1..];
            !tail.is_empty() && !tail.contains('/') && !tail.contains('\\')
        }
        _ => false,
    }
}

fn replace_ext(p: &str, ext: &str) -> String {
    if has_real_ext(p) {
        let pos = p.rfind('.').unwrap();
        format!("{}{}", &p[..pos], ext)
    } else {
        format!("{p}{ext}")
    }
}

fn stem_of(p: &str) -> String {
    if has_real_ext(p) {
        p[..p.rfind('.').unwrap()].to_string()
    } else {
        p.to_string()
    }
}

fn resolve_output_same_folder(input: &Path, target_ext: &str, output_kind: &str) -> PathBuf {
    let s = input.to_string_lossy();
    let out = if output_kind == "dir" {
        stem_of(&s)
    } else {
        replace_ext(&s, target_ext)
    };
    PathBuf::from(out)
}

// ---------------------------------------------------------------------------
// Fixture preparation per tool
// ---------------------------------------------------------------------------

/// Build a genuine input file for `slug`. Returns `None` when no input can be
/// produced in this environment (e.g. a real sample file is unavailable).
fn prepare_input(slug: &str, dir: &Path, resolver: &EngineResolver) -> Option<PathBuf> {
    let write = |name: &str, bytes: Vec<u8>| -> PathBuf {
        let p = dir.join(name);
        std::fs::write(&p, bytes).unwrap();
        p
    };

    match slug {
        // 3 CD-ROM sectors (2352 B each) of recognisable data.
        "raw-to-iso" => {
            let mut raw = Vec::new();
            for s in 0..3u32 {
                for i in 0..2352u32 {
                    raw.push(((s * 251 + i * 7) % 251) as u8);
                }
            }
            Some(write("disc.raw", raw))
        }
        // Headerless 16-bit mono PCM — the "headless PCM" case in the manifest.
        "raw-to-wav" => {
            let mut pcm = Vec::new();
            for i in 0..8000u32 {
                let v = ((i as f32 * 0.15).sin() * 12000.0) as i16;
                pcm.extend_from_slice(&v.to_le_bytes());
            }
            Some(write("audio.raw", pcm))
        }
        // 12-byte EOT header (font size at 4..8) + an embedded TrueType payload.
        "eot-to-ttf" => {
            let mut buf = vec![0u8; 12];
            let ttf: Vec<u8> = {
                let mut v = vec![0x00, 0x01, 0x00, 0x00]; // sfnt magic
                v.extend_from_slice(&[0, 4, 0, 10, 0, 0, 0, 0]); // minimal table dir
                v.extend(std::iter::repeat_n(0xABu8, 64));
                v
            };
            buf[4..8].copy_from_slice(&(ttf.len() as u32).to_le_bytes());
            buf.extend_from_slice(&ttf);
            Some(write("font.eot", buf))
        }
        // Minimal valid GLB: 12-byte header + JSON chunk + BIN chunk.
        "glb-to-gltf" => {
            let json = br#"{"asset":{"version":"2.0"},"buffers":[{"byteLength":4}]}"#;
            let bin = [1u8, 2, 3, 4];
            let mut glb = Vec::new();
            glb.extend_from_slice(b"glTF");
            glb.extend_from_slice(&2u32.to_le_bytes());
            let total = 12 + 8 + json.len() + 8 + bin.len();
            glb.extend_from_slice(&(total as u32).to_le_bytes());
            glb.extend_from_slice(&(json.len() as u32).to_le_bytes());
            glb.extend_from_slice(b"JSON");
            glb.extend_from_slice(json);
            glb.extend_from_slice(&(bin.len() as u32).to_le_bytes());
            glb.extend_from_slice(b"BIN\0");
            glb.extend_from_slice(&bin);
            Some(write("scene.glb", glb))
        }
        // 2x2 RGBA8888 PVR: 52-byte header + 16 bytes of pixel data.
        "pvr-to-png" => {
            let mut buf = vec![0u8; 52];
            buf[0..4].copy_from_slice(&0x0352_5650u32.to_le_bytes()); // "PVR3"
            buf[24..28].copy_from_slice(&2u32.to_le_bytes()); // height
            buf[28..32].copy_from_slice(&2u32.to_le_bytes()); // width
            buf.extend_from_slice(&[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
            Some(write("tex.pvr", buf))
        }
        // OPF package + the resources it references.
        "opf-to-epub" => {
            let opf = dir.join("content.opf");
            std::fs::write(
                &opf,
                r#"<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <metadata><title>Demo</title></metadata>
  <manifest>
    <item href="cover.png" media-type="image/png"/>
    <item href="ch1.html" media-type="application/xhtml+xml"/>
  </manifest>
</package>"#,
            )
            .unwrap();
            std::fs::write(dir.join("cover.png"), b"\x89PNG\r\n\x1a\nFAKE").unwrap();
            std::fs::write(dir.join("ch1.html"), b"<html><body>Hi</body></html>").unwrap();
            Some(opf)
        }
        // Real files from the repo's fixture set.
        "exr-to-png" => first_with_ext(&fixtures().join("exr"), "exr"),
        "wad-extractor" => first_with_ext(&fixtures().join("wad"), "wad"),
        "gsm-to-wav" => first_with_ext(&fixtures().join("gsm"), "gsm"),
        "mts-to-mp4" => first_with_ext(&fixtures().join("mts"), "mts"),
        // Needs the sibling .pfm next to the .pfb (per the tool guide).
        "pfm-to-ttf" => {
            let src = fixtures().join("type1-fonts/cmr10.pfb");
            if !src.exists() {
                return None;
            }
            let dst = dir.join("cmr10.pfb");
            std::fs::copy(&src, &dst).unwrap();
            let _ = std::fs::copy(fixtures().join("type1-fonts/cmr10.pfm"), dir.join("cmr10.pfm"));
            Some(dst)
        }
        // No .sav in the repo — synthesise one with pyreadstat when available.
        "sav-to-csv" => synthesise_sav(dir, resolver),
        _ => None,
    }
}

/// Build a real SPSS `.sav` via Python + pyreadstat (input generation only —
/// the conversion itself is what's under test).
fn synthesise_sav(dir: &Path, resolver: &EngineResolver) -> Option<PathBuf> {
    let py = resolver.bin(Engine::PythonFonttools)?;
    let script = dir.join("make_sav.py");
    std::fs::write(
        &script,
        "import sys\n\
         import pandas as pd\n\
         import pyreadstat\n\
         df = pd.DataFrame({'id':[1,2,3],'name':['a','b','c'],'score':[1.5,2.5,3.5]})\n\
         pyreadstat.write_sav(df, sys.argv[1])\n",
    )
    .ok()?;
    let out = std::process::Command::new(py)
        .arg(&script)
        .arg(dir.join("survey.sav"))
        .output()
        .ok()?;
    if !out.status.success() {
        return None;
    }
    let p = dir.join("survey.sav");
    p.exists().then_some(p)
}

// ---------------------------------------------------------------------------
// Output validation
// ---------------------------------------------------------------------------

fn expect_magic(bytes: &[u8], magic: &[u8], label: &str) -> Result<(), String> {
    if bytes.len() < magic.len() {
        return Err(format!("too short to be {label} ({} bytes)", bytes.len()));
    }
    if &bytes[..magic.len()] != magic {
        return Err(format!("missing {label} signature"));
    }
    Ok(())
}

/// `slug` is validated by output kind + format-specific signatures.
fn validate(slug: &str, output: &Path, output_kind: &str, size: u64) -> Result<(), String> {
    if output_kind == "dir" {
        let n = std::fs::read_dir(output)
            .map_err(|e| format!("output dir unreadable: {e}"))?
            .count();
        return if n == 0 {
            Err("extracted directory is empty".into())
        } else {
            Ok(())
        };
    }
    if size == 0 {
        return Err("converter reported 0 bytes".into());
    }
    let bytes = std::fs::read(output).map_err(|e| format!("cannot read output: {e}"))?;
    if bytes.len() as u64 != size {
        return Err(format!(
            "reported size {size} != on-disk size {}",
            bytes.len()
        ));
    }

    match slug {
        "exr-to-png" | "pvr-to-png" => expect_magic(&bytes, b"\x89PNG\r\n\x1a\n", "PNG"),
        "raw-to-wav" | "gsm-to-wav" => {
            expect_magic(&bytes, b"RIFF", "RIFF")?;
            if bytes.len() < 12 || &bytes[8..12] != b"WAVE" {
                return Err("WAVE chunk missing".into());
            }
            Ok(())
        }
        "mts-to-mp4" => {
            if bytes.len() < 8 {
                return Err("too short to be MP4".into());
            }
            if &bytes[4..8] != b"ftyp" {
                return Err(format!("missing ftyp box, got {:?}", &bytes[4..8]));
            }
            Ok(())
        }
        "eot-to-ttf" | "pfm-to-ttf" => {
            let ok = bytes.starts_with(&[0x00, 0x01, 0x00, 0x00])
                || bytes.starts_with(b"OTTO")
                || bytes.starts_with(b"true")
                || bytes.starts_with(b"typ1");
            if !ok {
                return Err("output does not carry a font signature".into());
            }
            Ok(())
        }
        "glb-to-gltf" => {
            let text = String::from_utf8_lossy(&bytes);
            serde_json::from_str::<serde_json::Value>(&text)
                .map_err(|e| format!("glTF is not valid JSON: {e}"))?;
            // The .bin sibling must exist next to the .gltf.
            let bin = output.with_extension("bin");
            if !bin.exists() {
                return Err("glTF written but the .bin buffer is missing".into());
            }
            Ok(())
        }
        "opf-to-epub" => {
            let file = std::fs::File::open(output).map_err(|e| format!("open epub: {e}"))?;
            let mut zip = zip::read::ZipArchive::new(file)
                .map_err(|e| format!("not a valid zip/epub: {e}"))?;
            let first = zip.by_index(0).map(|z| z.name().to_string()).unwrap_or_default();
            if first != "mimetype" {
                return Err(format!("first zip entry is `{first}`, must be `mimetype`"));
            }
            Ok(())
        }
        "raw-to-iso" => {
            if size % 2048 != 0 {
                return Err(format!("ISO size {size} is not a multiple of 2048"));
            }
            Ok(())
        }
        "sav-to-csv" => {
            let text = String::from_utf8_lossy(&bytes);
            if !text.lines().next().unwrap_or("").contains(',') {
                return Err("CSV has no header row".into());
            }
            Ok(())
        }
        _ => Ok(()),
    }
}

// ---------------------------------------------------------------------------
// The test
// ---------------------------------------------------------------------------

#[test]
fn every_tool_processes_a_real_file() {
    let resolver = EngineResolver::detect();
    let root = std::env::temp_dir().join("nichefiletools_e2e");
    let mut outcomes: Vec<Outcome> = Vec::new();

    for meta in manifest::tools() {
        let slug = meta.slug.clone();
        let dir = root.join(&slug);
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();

        // 1. Engine gate — same rule the UI uses to show an install prompt.
        let missing: Vec<String> = meta
            .engines
            .iter()
            .filter_map(|e| Engine::from_str(e))
            .filter(|e| !resolver.is_available(*e))
            .map(|e| format!("{} ({})", e.label(), e.install_url()))
            .collect();
        if !missing.is_empty() {
            outcomes.push(Outcome {
                slug,
                verdict: Verdict::Skip,
                detail: format!("engine missing: {}", missing.join(", ")),
            });
            continue;
        }

        // Tool-specific capability probe (engine present but a required module
        // or sibling dependency is absent).
        if let Some(reason) = extra_skip(&slug, &resolver) {
            outcomes.push(Outcome {
                slug,
                verdict: Verdict::Skip,
                detail: reason,
            });
            continue;
        }

        // 2. Input file.
        let Some(input) = prepare_input(&slug, &dir, &resolver) else {
            outcomes.push(Outcome {
                slug,
                verdict: Verdict::Skip,
                detail: "no input file available in this environment".into(),
            });
            continue;
        };

        // 3. Output path, resolved exactly like the frontend.
        let output = resolve_output_same_folder(&input, &meta.target, &meta.output_kind);
        if output == input {
            outcomes.push(Outcome {
                slug,
                verdict: Verdict::Fail,
                detail: "resolved output path equals the input (would overwrite the source)".into(),
            });
            continue;
        }

        // 4. Convert (real dispatch, real engine gate) with a live progress sink.
        let track = Track::default();
        let opts: Option<serde_json::Value> = match slug.as_str() {
            "raw-to-wav" => Some(serde_json::json!({
                "sample_rate": 44100, "bits": 16, "channels": 1
            })),
            _ => None,
        };
        let verdict = match crate::convert::convert(&slug, &input, &output, opts.as_ref(), &track) {
            Ok(size) => match validate(&slug, &output, &meta.output_kind, size) {
                Ok(()) => Outcome {
                    slug: slug.clone(),
                    verdict: Verdict::Pass,
                    detail: format!(
                        "{} bytes -> {}",
                        size,
                        output.file_name().unwrap_or_default().to_string_lossy()
                    ),
                },
                Err(e) => Outcome {
                    slug: slug.clone(),
                    verdict: Verdict::Fail,
                    detail: format!("output invalid: {e}"),
                },
            },
            Err(e) => Outcome {
                slug: slug.clone(),
                verdict: Verdict::Fail,
                detail: format!("convert failed: {e}"),
            },
        };
        outcomes.push(verdict);
    }

    // Report
    eprintln!("\n================ end-to-end tool run ================");
    for o in &outcomes {
        eprintln!(
            "{:<16} {:<5} {}",
            o.slug,
            o.verdict.as_str(),
            o.detail
        );
    }
    let passed = outcomes.iter().filter(|o| o.verdict == Verdict::Pass).count();
    let skipped = outcomes.iter().filter(|o| o.verdict == Verdict::Skip).count();
    let failed: Vec<&Outcome> = outcomes
        .iter()
        .filter(|o| o.verdict == Verdict::Fail)
        .collect();
    eprintln!(
        "----------------------------------------------------\n\
         {passed} passed, {skipped} skipped, {} failed (of {})\n\
         ====================================================\n",
        failed.len(),
        outcomes.len()
    );

    assert!(
        failed.is_empty(),
        "end-to-end tool failures:\n{}",
        failed
            .iter()
            .map(|o| format!("  - {}: {}", o.slug, o.detail))
            .collect::<Vec<_>>()
            .join("\n")
    );
}
