mod convert;
mod errors;
mod key_reflow;

use errors::{AppError, AppErrorPayload};
use key_reflow::{QuotaInfo, TokenResponse};
use serde::{Deserialize, Serialize};
use std::path::Path;
use tauri::Emitter;

use crate::convert::converter::{NoopSink, ProgressPhase, ProgressSink};

#[derive(Serialize)]
struct ConvertOutput {
    output_path: String,
    size: u64,
}

/// Convert a file using the registered desktop converter for `slug`.
/// Gated behind the free-unlock quota (密钥回流 doc §3.1).
#[tauri::command]
fn convert(
    app: tauri::AppHandle,
    slug: String,
    input_path: String,
    output_path: String,
    options: Option<String>,
) -> Result<ConvertOutput, AppErrorPayload> {
    key_reflow::consume_quota(&app)?;

    let opts: Option<serde_json::Value> = match options {
        Some(s) => serde_json::from_str(&s).ok(),
        None => None,
    };

    let size = convert::convert(
        &slug,
        std::path::Path::new(&input_path),
        std::path::Path::new(&output_path),
        opts.as_ref(),
        &NoopSink,
    )
    .map_err(AppErrorPayload::from)?;

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
    status: String, // "running" | "done" | "error"
    bytes_processed: u64,
    bytes_total: u64,
    phase: String, // reading | converting | writing | done
    size: u64,
    error: Option<String>,
}

/// Bridges a converter's [`ProgressSink`] to a Tauri `convert-progress` event.
struct EmitSink {
    app: tauri::AppHandle,
    index: usize,
    total: usize,
    slug: String,
    input_path: String,
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
            },
        );
    }
}

/// Convert many files in one call (P3 批量队列). Emits a `convert-progress`
/// event before/after each item (with byte-level progress during conversion via
/// [`EmitSink`]); returns a per-item summary. The whole batch is gated by the free
/// quota up front (see `consume_quota_batch`).
#[tauri::command]
fn convert_batch(
    app: tauri::AppHandle,
    items: Vec<BatchItem>,
) -> Result<Vec<BatchResult>, AppErrorPayload> {
    key_reflow::consume_quota_batch(&app, items.len() as u32)?;

    let total = items.len();
    let mut results = Vec::with_capacity(total);
    for (i, item) in items.into_iter().enumerate() {
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
            },
        );

        let sink = EmitSink {
            app: app.clone(),
            index: i,
            total,
            slug: item.slug.clone(),
            input_path: item.input_path.clone(),
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
                    },
                );
                results.push(BatchResult {
                    slug: item.slug,
                    input_path: item.input_path,
                    output_path: item.output_path,
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
                    },
                );
                results.push(BatchResult {
                    slug: item.slug,
                    input_path: item.input_path,
                    output_path: item.output_path,
                    ok: false,
                    size: 0,
                    error: Some(msg),
                });
            }
        }
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
            list_tools,
            engine_status,
            get_quota,
            request_token,
            redeem_key,
            open_file,
            reveal_file,
            collect_files
        ])
        .run(tauri::generate_context!())
        .expect("error while running nichefiletools desktop");
}
