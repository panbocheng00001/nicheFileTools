use std::fs;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use tauri::Manager;

use crate::errors::{AppError, AppErrorPayload};

/// Free conversions granted after redeeming a desktop key (密钥回流 doc §4.3).
const FREE_QUOTA: u32 = 2;
const STORE_FILE: &str = "keyreflow.json";
const DEFAULT_API_BASE: &str = "https://nichefiletools.com";

#[derive(Serialize, Deserialize, Default, Clone)]
struct Store {
    device_id: Option<String>,
    free_quota_remaining: u32,
    redeemed: bool,
    paid: bool,
    key: Option<String>,
}

#[derive(Serialize)]
pub struct QuotaInfo {
    pub free_quota_remaining: u32,
    pub unlocked: bool,
    pub paid: bool,
}

#[derive(Serialize, Deserialize)]
pub struct TokenResponse {
    pub token: String,
    pub expires_at: String,
}

fn store_path(app: &tauri::AppHandle) -> Result<PathBuf, AppError> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Other(format!("app data dir: {e}")))?;
    let _ = fs::create_dir_all(&dir);
    Ok(dir.join(STORE_FILE))
}

fn load(app: &tauri::AppHandle) -> Store {
    match store_path(app) {
        Ok(p) => fs::read_to_string(&p)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default(),
        Err(_) => Store::default(),
    }
}

fn save(app: &tauri::AppHandle, store: &Store) -> Result<(), AppError> {
    let p = store_path(app)?;
    let s = serde_json::to_string_pretty(store).map_err(AppError::Json)?;
    fs::write(&p, s).map_err(AppError::Io)?;
    Ok(())
}

fn ensure_device_id(app: &tauri::AppHandle, store: &mut Store) -> Result<String, AppError> {
    if let Some(id) = &store.device_id {
        return Ok(id.clone());
    }
    let id = uuid::Uuid::new_v4().to_string();
    store.device_id = Some(id.clone());
    save(app, store)?;
    Ok(id)
}

pub fn get_quota(app: &tauri::AppHandle) -> QuotaInfo {
    let s = load(app);
    QuotaInfo {
        free_quota_remaining: s.free_quota_remaining,
        unlocked: s.free_quota_remaining > 0 || s.paid,
        paid: s.paid,
    }
}

/// Gate for every desktop conversion (密钥回流 doc §3.1 / §4.1).
/// Decrements the free quota on use; paid licenses bypass the limit.
pub fn consume_quota(app: &tauri::AppHandle) -> Result<(), AppErrorPayload> {
    let mut s = load(app);
    if s.paid {
        return Ok(());
    }
    if s.free_quota_remaining == 0 {
        return Err(AppError::QuotaExhausted.into());
    }
    s.free_quota_remaining -= 1;
    save(app, &s).map_err(AppErrorPayload::from)?;
    Ok(())
}

/// Requests a server-generated, single-use token (密钥回流 doc §4.1).
/// Token generation MUST happen server-side; this calls the backend contract.
pub fn request_token(
    app: &tauri::AppHandle,
    api_base: Option<&str>,
) -> Result<TokenResponse, AppErrorPayload> {
    let base = api_base.unwrap_or(DEFAULT_API_BASE);
    let mut s = load(app);
    let device_id = ensure_device_id(app, &mut s)?;

    let url = format!("{}/api/desktop-token", base.trim_end_matches('/'));
    let resp = ureq::post(&url)
        .send_json(ureq::json!({ "device_id": device_id }))
        .map_err(|e| AppError::Token(format!("request failed: {e}")).into())?;

    if resp.status().as_u16() != 200 {
        return Err(AppError::Token(format!("backend returned {}", resp.status().as_u16())).into());
    }
    let tr: TokenResponse = resp
        .into_json()
        .map_err(|e| AppError::Token(format!("bad response: {e}")).into())?;
    Ok(tr)
}

/// Verifies a pasted key with the backend and grants the 2 free conversions
/// (密钥回流 doc §4.3). Key is bound to the device.
pub fn redeem_key(
    app: &tauri::AppHandle,
    token: &str,
    key: &str,
    api_base: Option<&str>,
) -> Result<QuotaInfo, AppErrorPayload> {
    let base = api_base.unwrap_or(DEFAULT_API_BASE);
    let device_id = load(app)
        .device_id
        .ok_or_else(|| AppError::InvalidKey("no device id; request a token first".into()))?;

    let url = format!("{}/api/desktop-redeem", base.trim_end_matches('/'));
    let resp = ureq::post(&url)
        .send_json(ureq::json!({ "token": token, "key": key, "device_id": device_id }))
        .map_err(|e| AppError::Token(format!("redeem failed: {e}")).into())?;

    if resp.status().as_u16() != 200 {
        return Err(AppError::InvalidKey("key rejected by server".into()).into());
    }

    let mut s = load(app);
    s.redeemed = true;
    s.free_quota_remaining = FREE_QUOTA;
    s.key = Some(key.to_string());
    save(app, &s)?;
    Ok(get_quota(app))
}
