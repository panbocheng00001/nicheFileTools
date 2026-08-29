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
    quota_info(&load(app))
}

/// Pure projection of the persisted store -> API-facing quota state.
fn quota_info(s: &Store) -> QuotaInfo {
    QuotaInfo {
        free_quota_remaining: s.free_quota_remaining,
        unlocked: s.free_quota_remaining > 0 || s.paid,
        paid: s.paid,
    }
}

/// Pure quota decision (monetization gate). Mutates `store` and returns whether
/// it actually changed, so the caller knows if a persist is needed.
///
/// Extracted from [`consume_quota_batch`] so the gate is unit-testable without a
/// live `AppHandle`. Returns `Ok(false)` when nothing is consumed (count 0, or a
/// paid license), `Err(QuotaExhausted)` when the free quota can't cover `count`.
fn apply_quota(store: &mut Store, count: u32) -> Result<bool, AppError> {
    if count == 0 || store.paid {
        return Ok(false);
    }
    if store.free_quota_remaining < count {
        return Err(AppError::QuotaExhausted);
    }
    store.free_quota_remaining -= count;
    Ok(true)
}

/// Gate for every desktop conversion (密钥回流 doc §3.1 / §4.1).
/// Decrements the free quota on use; paid licenses bypass the limit.
pub fn consume_quota(app: &tauri::AppHandle) -> Result<(), AppErrorPayload> {
    consume_quota_batch(app, 1)
}

/// Batch variant (P3 批量队列): gate the whole batch up front — if the remaining
/// free quota cannot cover `count` conversions, reject before any work begins.
/// Paid licenses bypass the limit. One atomic decrement keeps the store consistent.
pub fn consume_quota_batch(app: &tauri::AppHandle, count: u32) -> Result<(), AppErrorPayload> {
    let mut s = load(app);
    if apply_quota(&mut s, count).map_err(AppErrorPayload::from)? {
        save(app, &s).map_err(AppErrorPayload::from)?;
    }
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
        .map_err(|e| AppErrorPayload::from(AppError::Token(format!("request failed: {e}"))))?;

    // ureq 2.x returns the HTTP status as a plain `u16` (not `http::StatusCode`),
    // so there is no `.as_u16()` here.
    let http_status = resp.status();
    if http_status != 200 {
        return Err(AppError::Token(format!("backend returned {http_status}")).into());
    }
    let tr: TokenResponse = resp
        .into_json()
        .map_err(|e| AppErrorPayload::from(AppError::Token(format!("bad response: {e}"))))?;
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
        .map_err(|e| AppErrorPayload::from(AppError::Token(format!("redeem failed: {e}"))))?;

    let http_status = resp.status();
    if http_status != 200 {
        return Err(AppError::InvalidKey("key rejected by server".into()).into());
    }

    let mut s = load(app);
    s.redeemed = true;
    s.free_quota_remaining = FREE_QUOTA;
    s.key = Some(key.to_string());
    save(app, &s)?;
    Ok(get_quota(app))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn store_with(remaining: u32, paid: bool) -> Store {
        Store {
            device_id: Some("dev-1".into()),
            free_quota_remaining: remaining,
            redeemed: remaining > 0,
            paid,
            key: None,
        }
    }

    /// A batch must be rejected **before any work starts** when the free quota
    /// cannot cover it — and the quota must not be partially decremented.
    #[test]
    fn batch_rejected_when_quota_cannot_cover_it() {
        let mut s = store_with(1, false);
        match apply_quota(&mut s, 3) {
            Err(AppError::QuotaExhausted) => {}
            other => panic!("expected QuotaExhausted, got {other:?}"),
        }
        assert_eq!(s.free_quota_remaining, 1, "quota must not be decremented on rejection");
    }

    #[test]
    fn exact_quota_is_fully_consumed() {
        let mut s = store_with(2, false);
        assert!(apply_quota(&mut s, 2).unwrap());
        assert_eq!(s.free_quota_remaining, 0);
        // Once spent, any further conversion is rejected.
        assert!(matches!(
            apply_quota(&mut s, 1),
            Err(AppError::QuotaExhausted)
        ));
    }

    #[test]
    fn quota_decrements_by_batch_size() {
        let mut s = store_with(5, false);
        assert!(apply_quota(&mut s, 3).unwrap());
        assert_eq!(s.free_quota_remaining, 2);
        assert!(apply_quota(&mut s, 2).unwrap());
        assert_eq!(s.free_quota_remaining, 0);
    }

    /// Zero-item batches must be a no-op (the UI can invoke with an empty queue).
    #[test]
    fn zero_count_is_a_no_op() {
        let mut s = store_with(0, false);
        assert!(!apply_quota(&mut s, 0).unwrap(), "nothing consumed -> no persist needed");
        assert_eq!(s.free_quota_remaining, 0);
    }

    /// Paid licenses bypass the free-quota limit entirely.
    #[test]
    fn paid_license_bypasses_quota() {
        let mut s = store_with(0, true);
        assert!(!apply_quota(&mut s, 100).unwrap(), "paid -> no persist needed");
        assert_eq!(s.free_quota_remaining, 0, "paid quota must stay untouched");
    }

    #[test]
    fn quota_info_unlocked_semantics() {
        let locked = quota_info(&store_with(0, false));
        assert!(!locked.unlocked && !locked.paid);

        let unlocked = quota_info(&store_with(1, false));
        assert!(unlocked.unlocked && !unlocked.paid);
        assert_eq!(unlocked.free_quota_remaining, 1);

        let paid = quota_info(&store_with(0, true));
        assert!(paid.unlocked && paid.paid);
    }

    /// A fresh install starts locked with no quota.
    #[test]
    fn default_store_is_locked() {
        let info = quota_info(&Store::default());
        assert_eq!(info.free_quota_remaining, 0);
        assert!(!info.unlocked);
        assert!(!info.paid);
    }

    /// The free grant is part of the product contract (密钥回流 doc §4.3).
    #[test]
    fn free_quota_grant_is_two() {
        assert_eq!(FREE_QUOTA, 2);
    }
}
