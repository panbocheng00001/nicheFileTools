mod converters;
mod errors;
mod key_reflow;

use converters::Converter;
use errors::{AppError, AppErrorPayload};
use key_reflow::{QuotaInfo, TokenResponse};
use serde::Serialize;

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
) -> Result<ConvertOutput, AppErrorPayload> {
    key_reflow::consume_quota(&app)?;

    let converter = converters::get_converter(&slug)
        .ok_or_else(|| AppErrorPayload::from(AppError::UnsupportedTool(slug)))?;

    let size = converter
        .convert(
            std::path::Path::new(&input_path),
            std::path::Path::new(&output_path),
        )
        .map_err(AppErrorPayload::from)?;

    Ok(ConvertOutput { output_path, size })
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_log::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            convert,
            get_quota,
            request_token,
            redeem_key
        ])
        .run(tauri::generate_context!())
        .expect("error while running nichefiletools desktop");
}
