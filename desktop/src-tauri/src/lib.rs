mod convert;
mod errors;
mod key_reflow;

#[cfg(test)]
mod e2e;

use errors::{AppError, AppErrorPayload};
use key_reflow::{QuotaInfo, TokenResponse};
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::Emitter;

use crate::convert::converter::{ProgressPhase, ProgressSink};

#[derive(Serialize)]
struct ConvertOutput {
    output_path: String,
    size: u64,
}

/// Convert a file using the registered desktop converter for `slug`.
/// Gated behind the free-unlock quota (密钥回流 doc §3.1).
/// Convert a single file using the registered desktop converter for `slug`.
/// Gated behind the free-unlock quota (密钥回流 doc §3.1). Streams real-time
/// byte-level progress through `EmitSink` (the single-file path previously used
/// `NoopSink` and reported nothing), keyed by an optional `rid` so a caller can
/// correlate events from `onConvertProgress`.
#[tauri::command]
fn convert(
    app: tauri::AppHandle,
    slug: String,
    input_path: String,
    output_path: String,
    options: Option<String>,
    rid: Option<String>,
) -> Result<ConvertOutput, AppErrorPayload> {
    key_reflow::consume_quota(&app)?;

    let opts: Option<serde_json::Value> = match options {
        Some(s) => serde_json::from_str(&s).ok(),
        None => None,
    };

    let sink = EmitSink {
        app: app.clone(),
        index: 0,
        total: 1,
        slug: slug.clone(),
        input_path: input_path.clone(),
        rid: rid.clone(),
    };

    let size = convert::convert(
        &slug,
        std::path::Path::new(&input_path),
        std::path::Path::new(&output_path),
        opts.as_ref(),
        &sink,
    )
    .map_err(AppErrorPayload::from)?;

    // Final "done" marker so the UI can flip to a completed state with size.
    let _ = app.emit(
        "convert-progress",
        BatchProgress {
            index: 0,
            total: 1,
            slug,
            input_path,
            status: "done".to_string(),
            bytes_processed: size,
            bytes_total: size,
            phase: "done".to_string(),
            size,
            error: None,
            rid,
        },
    );

    Ok(ConvertOutput { output_path, size })
}

/// A single item in a batch conversion (P3 批量队列).
#[derive(Deserialize)]
struct BatchItem {
    slug: String,
    input_path: String,
    output_path: String,
    options: Option<String>,
}

/// Result of one item in a batch.
#[derive(Serialize, Clone)]
struct BatchResult {
    slug: String,
    input_path: String,
    output_path: String,
    ok: bool,
    size: u64,
    error: Option<String>,
}

/// Live progress emitted per item so the UI can render a queue with status and
/// a byte-level bar. `bytes_total == 0` means the size is unknown (indeterminate).
#[derive(Serialize, Clone)]
struct BatchProgress {
    index: usize,
    total: usize,
    slug: String,
    input_path: String,
    status: String, // "running" | "done" | "error" | "cancelled"
    bytes_processed: u64,
    bytes_total: u64,
    phase: String, // reading | converting | writing | done
    size: u64,
    error: Option<String>,
    /// Correlation id for single-file conversions; `None` for batch items.
    rid: Option<String>,
}

/// Bridges a converter's [`ProgressSink`] to a Tauri `convert-progress` event.
struct EmitSink {
    app: tauri::AppHandle,
    index: usize,
    total: usize,
    slug: String,
    input_path: String,
    rid: Option<String>,
}

impl ProgressSink for EmitSink {
    fn report(&self, phase: ProgressPhase, processed: u64, total: u64) {
        let _ = self.app.emit(
            "convert-progress",
            BatchProgress {
                index: self.index,
                total: self.total,
                slug: self.slug.clone(),
                input_path: self.input_path.clone(),
                status: "running".to_string(),
                bytes_processed: processed,
                bytes_total: total,
                phase: phase.as_str().to_string(),
                size: 0,
                error: None,
                rid: self.rid.clone(),
            },
        );
    }
}

/// Shared, atomic control flags for an in-flight batch. The UI drives these from
/// separate command invocations (which run concurrently with the blocking batch
/// loop): `paused` holds the loop *between* items, `cancel` stops it before the
/// next item. Both are `Arc<AtomicBool>` so clones can be handed to the loop and
/// the control commands mutate the same flags.
struct BatchControl {
    cancel: Arc<AtomicBool>,
    paused: Arc<AtomicBool>,
}

impl BatchControl {
    fn new() -> Self {
        Self {
            cancel: Arc::new(AtomicBool::new(false)),
            paused: Arc::new(AtomicBool::new(false)),
        }
    }
}

/// Error message carried on cancelled (not-yet-started) batch items. The UI maps
/// this exact string to a dedicated "cancelled" status instead of "error".
const CANCELLED: &str = "Cancelled";

#[tauri::command]
fn pause_batch(ctrl: tauri::State<BatchControl>) {
    ctrl.paused.store(true, Ordering::SeqCst);
}

#[tauri::command]
fn resume_batch(ctrl: tauri::State<BatchControl>) {
    ctrl.paused.store(false, Ordering::SeqCst);
}

#[tauri::command]
fn cancel_batch(ctrl: tauri::State<BatchControl>) {
    ctrl.cancel.store(true, Ordering::SeqCst);
    // Wake a paused loop so it can observe `cancel` and break instead of waiting.
    ctrl.paused.store(false, Ordering::SeqCst);
}

/// Convert many files in one call (P3 批量队列). Emits a `convert-progress`
/// event before/after each item (with byte-level progress during conversion via
/// [`EmitSink`]); returns a per-item summary. The whole batch is gated by the free
/// quota up front (see `consume_quota_batch`).
///
/// Honors [`BatchControl`]: cancel stops before the next item; pause holds between
/// items (the current item always finishes). Unstarted items are reported as
/// `cancelled` so the UI can reflect the interruption.
#[tauri::command]
fn convert_batch(
    app: tauri::AppHandle,
    ctrl: tauri::State<BatchControl>,
    items: Vec<BatchItem>,
) -> Result<Vec<BatchResult>, AppErrorPayload> {
    key_reflow::consume_quota_batch(&app, items.len() as u32)?;

    // Fresh flags so a previous cancel/pause can't leak into this run.
    ctrl.cancel.store(false, Ordering::SeqCst);
    ctrl.paused.store(false, Ordering::SeqCst);

    let total = items.len();
    let mut results = Vec::with_capacity(total);
    for i in 0..total {
        // Honour cancellation before starting the next item.
        if ctrl.cancel.load(Ordering::SeqCst) {
            break;
        }
        // Honour pause: hold between items until resumed (or cancelled).
        while ctrl.paused.load(Ordering::SeqCst) && !ctrl.cancel.load(Ordering::SeqCst) {
            std::thread::sleep(Duration::from_millis(120));
        }
        if ctrl.cancel.load(Ordering::SeqCst) {
            break;
        }

        let item = &items[i];
        // Signal "this item is now running" so the UI flips to a working bar
        // immediately (before the first byte-level report arrives).
        let _ = app.emit(
            "convert-progress",
            BatchProgress {
                index: i,
                total,
                slug: item.slug.clone(),
                input_path: item.input_path.clone(),
                status: "running".to_string(),
                bytes_processed: 0,
                bytes_total: 0,
                phase: "converting".to_string(),
                size: 0,
                error: None,
                rid: None,
            },
        );

        let sink = EmitSink {
            app: app.clone(),
            index: i,
            total,
            slug: item.slug.clone(),
            input_path: item.input_path.clone(),
            rid: None,
        };

        let opts: Option<serde_json::Value> =
            item.options.as_ref().and_then(|s| serde_json::from_str(s).ok());
        match convert::convert(
            &item.slug,
            Path::new(&item.input_path),
            Path::new(&item.output_path),
            opts.as_ref(),
            &sink,
        ) {
            Ok(size) => {
                let _ = app.emit(
                    "convert-progress",
                    BatchProgress {
                        index: i,
                        total,
                        slug: item.slug.clone(),
                        input_path: item.input_path.clone(),
                        status: "done".to_string(),
                        bytes_processed: size,
                        bytes_total: size,
                        phase: "done".to_string(),
                        size,
                        error: None,
                        rid: None,
                    },
                );
                results.push(BatchResult {
                    slug: item.slug.clone(),
                    input_path: item.input_path.clone(),
                    output_path: item.output_path.clone(),
                    ok: true,
                    size,
                    error: None,
                });
            }
            Err(e) => {
                let msg = e.to_string();
                let _ = app.emit(
                    "convert-progress",
                    BatchProgress {
                        index: i,
                        total,
                        slug: item.slug.clone(),
                        input_path: item.input_path.clone(),
                        status: "error".to_string(),
                        bytes_processed: 0,
                        bytes_total: 0,
                        phase: "done".to_string(),
                        size: 0,
                        error: Some(msg.clone()),
                        rid: None,
                    },
                );
                results.push(BatchResult {
                    slug: item.slug.clone(),
                    input_path: item.input_path.clone(),
                    output_path: item.output_path.clone(),
                    ok: false,
                    size: 0,
                    error: Some(msg),
                });
            }
        }
    }

    // Every unprocessed item becomes a `cancelled` result so the queue reflects
    // the interruption rather than looking stuck.
    for j in results.len()..total {
        let item = &items[j];
        let _ = app.emit(
            "convert-progress",
            BatchProgress {
                index: j,
                total,
                slug: item.slug.clone(),
                input_path: item.input_path.clone(),
                status: "cancelled".to_string(),
                bytes_processed: 0,
                bytes_total: 0,
                phase: "done".to_string(),
                size: 0,
                error: Some(CANCELLED.to_string()),
                rid: None,
            },
        );
        results.push(BatchResult {
            slug: item.slug.clone(),
            input_path: item.input_path.clone(),
            output_path: item.output_path.clone(),
            ok: false,
            size: 0,
            error: Some(CANCELLED.to_string()),
        });
    }

    Ok(results)
}

/// List every tool the desktop supports (driven by `tools.json`).
#[tauri::command]
fn list_tools() -> Vec<convert::manifest::ToolMeta> {
    convert::list_tools()
}

/// Report whether the engines a tool needs are installed, for install prompts.
#[tauri::command]
fn engine_status(slug: String) -> convert::EngineStatus {
    convert::engine_status(&slug)
}

#[tauri::command]
fn get_quota(app: tauri::AppHandle) -> QuotaInfo {
    key_reflow::get_quota(&app)
}

#[tauri::command]
fn request_token(
    app: tauri::AppHandle,
    api_base: Option<String>,
) -> Result<TokenResponse, AppErrorPayload> {
    key_reflow::request_token(&app, api_base.as_deref())
}

#[tauri::command]
fn redeem_key(
    app: tauri::AppHandle,
    token: String,
    key: String,
    api_base: Option<String>,
) -> Result<QuotaInfo, AppErrorPayload> {
    key_reflow::redeem_key(&app, &token, &key, api_base.as_deref())
}

/// Open a converted file with the OS default application (e.g. play the .wav,
/// view the .png). Dependency-free — shells out to the platform opener.
#[tauri::command]
fn open_file(path: String) -> Result<(), AppErrorPayload> {
    run_os_open(&path, false).map_err(|e| AppError::Other(e).into())
}

/// Reveal a file (or its output folder) in the system file manager, selecting it.
#[tauri::command]
fn reveal_file(path: String) -> Result<(), AppErrorPayload> {
    run_os_open(&path, true).map_err(|e| AppError::Other(e).into())
}

/// Recursively collect files matching `exts` from a set of `roots` (mixed
/// files and directories). Powers the "Add folder" button and drag-and-drop of
/// whole directories — a dropped directory is recursed, a dropped file is kept
/// only if its extension matches.
#[tauri::command]
fn collect_files(roots: Vec<String>, exts: Vec<String>) -> Vec<String> {
    let needles: Vec<String> = exts
        .iter()
        .map(|e| e.trim_start_matches('.').to_lowercase())
        .collect();
    let mut out = Vec::new();
    for root in roots {
        let p = std::path::Path::new(&root);
        if p.is_dir() {
            walk_dir(p, &needles, &mut out);
        } else if let Some(ext) = p.extension().and_then(|s| s.to_str()) {
            if needles.iter().any(|n| n == &ext.to_lowercase()) {
                out.push(root);
            }
        }
    }
    out.sort();
    out
}

fn walk_dir(dir: &std::path::Path, needles: &[String], out: &mut Vec<String>) {
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_dir() {
                walk_dir(&p, needles, out);
            } else if let Some(ext) = p.extension().and_then(|s| s.to_str()) {
                let e = ext.to_lowercase();
                if needles.iter().any(|n| n == &e) {
                    out.push(p.to_string_lossy().into_owned());
                }
            }
        }
    }
}

/// Platform opener. `reveal` selects the file in the file manager when supported.
#[cfg(target_os = "windows")]
fn run_os_open(path: &str, reveal: bool) -> Result<(), String> {
    let status = if reveal {
        std::process::Command::new("explorer")
            .arg(format!("/select,\"{}\"", path))
            .status()
    } else {
        std::process::Command::new("cmd")
            .args(["/c", "start", "", &format!("\"{}\"", path)])
            .status()
    };
    status
        .map_err(|e| format!("无法打开文件: {e}"))
        .and_then(|s| {
            if s.success() {
                Ok(())
            } else {
                Err(format!("打开失败 (exit {})", s.code().unwrap_or(-1)))
            }
        })
}

#[cfg(target_os = "macos")]
fn run_os_open(path: &str, reveal: bool) -> Result<(), String> {
    let mut cmd = std::process::Command::new("open");
    if reveal {
        cmd.arg("-R");
    }
    cmd.arg(path);
    cmd.status()
        .map_err(|e| format!("无法打开文件: {e}"))
        .and_then(|s| {
            if s.success() {
                Ok(())
            } else {
                Err(format!("打开失败 (exit {})", s.code().unwrap_or(-1)))
            }
        })
}

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
fn run_os_open(path: &str, reveal: bool) -> Result<(), String> {
    let target = if reveal {
        std::path::Path::new(path)
            .parent()
            .map(|p| p.to_string_lossy().into_owned())
            .unwrap_or_else(|| path.to_string())
    } else {
        path.to_string()
    };
    std::process::Command::new("xdg-open")
        .arg(target)
        .status()
        .map_err(|e| format!("无法打开文件: {e}"))
        .and_then(|s| {
            if s.success() {
                Ok(())
            } else {
                Err(format!("打开失败 (exit {})", s.code().unwrap_or(-1)))
            }
        })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_log::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            convert,
            convert_batch,
            pause_batch,
            resume_batch,
            cancel_batch,
            list_tools,
            engine_status,
            get_quota,
            request_token,
            redeem_key,
            open_file,
            reveal_file,
            collect_files
        ])
        .manage(BatchControl::new())
        .run(tauri::generate_context!())
        .expect("error while running nichefiletools desktop");
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tmp(name: &str) -> std::path::PathBuf {
        let d = std::env::temp_dir()
            .join("nichefiletools_lib_tests")
            .join(name);
        let _ = std::fs::remove_dir_all(&d);
        std::fs::create_dir_all(&d).unwrap();
        d
    }

    /// `collect_files` (drag-drop of whole folders) relies on `walk_dir`
    /// recursing and matching extensions case-insensitively at any depth.
    #[test]
    fn walk_dir_recurses_and_matches_case_insensitively() {
        let root = tmp("walk");
        std::fs::create_dir_all(root.join("a/b")).unwrap();
        std::fs::write(root.join("top.exr"), b"x").unwrap();
        std::fs::write(root.join("a/mid.exr"), b"x").unwrap();
        std::fs::write(root.join("a/b/deep.EXR"), b"x").unwrap();
        std::fs::write(root.join("a/decoy.txt"), b"x").unwrap();

        let needles = vec!["exr".to_string()];
        let mut out = Vec::new();
        walk_dir(&root, &needles, &mut out);
        out.sort();

        assert_eq!(
            out.len(),
            3,
            "should match .exr at any depth, any case: {out:?}"
        );
        assert!(out.iter().all(|p| p.to_lowercase().ends_with(".exr")));
        assert!(
            out.iter().any(|p| p.contains("deep")),
            "nested file must be found"
        );
        assert!(
            !out.iter().any(|p| p.ends_with(".txt")),
            "decoy must be excluded"
        );
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn walk_dir_returns_nothing_when_no_extension_matches() {
        let root = tmp("walk_nomatch");
        std::fs::write(root.join("a.txt"), b"x").unwrap();
        std::fs::write(root.join("b.png"), b"x").unwrap();
        let mut out = Vec::new();
        walk_dir(&root, &["exr".to_string()], &mut out);
        assert!(out.is_empty(), "unexpected matches: {out:?}");
        let _ = std::fs::remove_dir_all(&root);
    }

    /// A brand-new batch must start un-paused and un-cancelled, otherwise the
    /// very first conversion would be skipped.
    #[test]
    fn batch_control_starts_clear() {
        let c = BatchControl::new();
        assert!(!c.cancel.load(Ordering::SeqCst));
        assert!(!c.paused.load(Ordering::SeqCst));
    }

    /// The UI maps the literal string "Cancelled" to a dedicated queue status in
    /// `ToolConverter`. Renaming this constant would silently turn cancelled
    /// items into red "error" rows.
    #[test]
    fn cancelled_marker_matches_frontend_contract() {
        assert_eq!(CANCELLED, "Cancelled");
    }
}
