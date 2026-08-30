//! Per-tool, time-boxed desktop licensing.
//!
//! Model:
//!   * every tool is locked by default;
//!   * the matching page on nichefiletools.com shows a code for the current
//!     UTC hour; pasting it unlocks **that one tool** until the top of the hour;
//!   * when it lapses the tool locks again and the user goes back to the page.
//!
//! The code is derived by a public, deterministic algorithm
//! ([`crate::desktop_code`]) so no server, no database and no network call is
//! needed — the desktop app verifies it offline against the system clock.

use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use tauri::Manager;

use crate::desktop_code;
use crate::errors::{AppError, AppErrorPayload};

const STORE_FILE: &str = "licensing.json";

/// One active unlock for a single tool.
#[derive(Serialize, Deserialize, Default, Clone, Debug, PartialEq)]
struct Activation {
    /// Hour bucket the accepted code belonged to. Kept for debugging/support.
    bucket: i64,
    /// Epoch ms at which this unlock lapses.
    expires_at: i64,
}

#[derive(Serialize, Deserialize, Default, Clone, Debug)]
struct Store {
    /// tool slug -> activation. Expired entries are pruned on load.
    tools: HashMap<String, Activation>,
}

/// What the UI renders: locked vs. unlocked + how long is left.
#[derive(Serialize, Clone, Debug, PartialEq)]
pub struct LicenseInfo {
    pub slug: String,
    pub unlocked: bool,
    /// Epoch ms at which the unlock lapses; 0 while locked.
    pub expires_at: i64,
    /// Milliseconds left; 0 while locked.
    pub remaining_ms: i64,
}

fn now_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
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
    let mut store: Store = match store_path(app) {
        Ok(p) => fs::read_to_string(&p)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default(),
        Err(_) => Store::default(),
    };
    // Drop lapsed unlocks so the file doesn't grow without bound.
    let now = now_ms();
    store.tools.retain(|_, a| a.expires_at > now);
    store
}

fn save(app: &tauri::AppHandle, store: &Store) -> Result<(), AppError> {
    let p = store_path(app)?;
    let s = serde_json::to_string_pretty(store).map_err(AppError::Json)?;
    fs::write(&p, s).map_err(AppError::Io)?;
    Ok(())
}

/// Pure projection of the persisted store -> UI-facing state.
fn status_of(store: &Store, slug: &str, now: i64) -> LicenseInfo {
    match store.tools.get(slug) {
        Some(a) if a.expires_at > now => LicenseInfo {
            slug: slug.to_string(),
            unlocked: true,
            expires_at: a.expires_at,
            remaining_ms: a.expires_at - now,
        },
        _ => LicenseInfo {
            slug: slug.to_string(),
            unlocked: false,
            expires_at: 0,
            remaining_ms: 0,
        },
    }
}

/// The unlock code pasted by the user is derived from the slug of the matching
/// **web** page (`/tools/{web_slug}`), which differs from the desktop slug for
/// `step-to-stl` → `/tools/prt-to-stl`. Verification must use the web slug or
/// codes copied from the site never match (auth spec §3.3.1). The store stays
/// keyed by the desktop slug, so `ensure_unlocked` / `convert` are unchanged.
fn verification_slug(slug: &str) -> &str {
    match crate::convert::manifest::tool(slug) {
        Some(t) => t.web_slug.as_deref().unwrap_or(slug),
        None => slug,
    }
}

/// Pure activation. Mutates `store` only when the code verifies.
fn apply_activation(
    store: &mut Store,
    slug: &str,
    code: &str,
    now: i64,
) -> Result<LicenseInfo, AppError> {
    match desktop_code::verify_code(verification_slug(slug), code, now) {
        Some(expires_at) => {
            store.tools.insert(
                slug.to_string(),
                Activation {
                    bucket: desktop_code::bucket_index(now),
                    expires_at,
                },
            );
            Ok(status_of(store, slug, now))
        }
        None => Err(AppError::InvalidCode),
    }
}

/// Gate for every desktop conversion. Called before any work starts.
fn require_unlocked(store: &Store, slug: &str, now: i64) -> Result<(), AppError> {
    if status_of(store, slug, now).unlocked {
        Ok(())
    } else {
        Err(AppError::LicenseRequired(slug.to_string()))
    }
}

/// Read-only status for one tool.
pub fn license_status(app: &tauri::AppHandle, slug: &str) -> LicenseInfo {
    status_of(&load(app), slug, now_ms())
}

/// Status for every tool in one round trip (the sidebar shows a lock per tool).
pub fn license_status_all(app: &tauri::AppHandle, slugs: &[String]) -> Vec<LicenseInfo> {
    let store = load(app);
    let now = now_ms();
    slugs.iter().map(|s| status_of(&store, s, now)).collect()
}

/// Verify a pasted code and persist the unlock.
pub fn activate_tool(
    app: &tauri::AppHandle,
    slug: &str,
    code: &str,
) -> Result<LicenseInfo, AppErrorPayload> {
    let mut store = load(app);
    let info = apply_activation(&mut store, slug, code, now_ms())
        .map_err(AppErrorPayload::from)?;
    save(app, &store).map_err(AppErrorPayload::from)?;
    Ok(info)
}

/// Gate used by `convert` / `convert_batch`.
pub fn ensure_unlocked(app: &tauri::AppHandle, slug: &str) -> Result<(), AppErrorPayload> {
    require_unlocked(&load(app), slug, now_ms()).map_err(AppErrorPayload::from)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn code_for(slug: &str, bucket: i64) -> String {
        desktop_code::code_for_bucket(slug, bucket)
    }

    fn at(bucket: i64, offset_ms: i64) -> i64 {
        desktop_code::bucket_start_ms(bucket) + offset_ms
    }

    fn store_with(slug: &str, expires_at: i64) -> Store {
        let mut tools = HashMap::new();
        tools.insert(
            slug.to_string(),
            Activation {
                bucket: 0,
                expires_at,
            },
        );
        Store { tools }
    }

    /// A fresh install is locked for every tool.
    #[test]
    fn empty_store_is_locked() {
        let s = Store::default();
        let info = status_of(&s, "kfx-to-epub", at(497_100, 0));
        assert!(!info.unlocked);
        assert_eq!(info.expires_at, 0);
        assert_eq!(info.remaining_ms, 0);
    }

    /// Desktop `step-to-stl` fetches its code from `/tools/prt-to-stl`, so the
    /// pasted code is derived from the **web** slug. Verification must accept
    /// it while the store stays keyed by the desktop slug, and the conversion
    /// gate must still pass (auth spec §3.3.1).
    #[test]
    fn activation_verifies_against_the_web_slug() {
        let mut s = Store::default();
        let code = code_for("prt-to-stl", 497_100);
        let info = apply_activation(&mut s, "step-to-stl", &code, at(497_100, 1_000))
            .expect("code copied from /tools/prt-to-stl must unlock step-to-stl");
        assert!(info.unlocked);
        assert_eq!(info.slug, "step-to-stl");
        assert!(require_unlocked(&s, "step-to-stl", at(497_100, 2_000)).is_ok());

        // A code derived from the desktop slug is NOT what the web page shows,
        // so it must be rejected.
        let wrong = code_for("step-to-stl", 497_100);
        let mut s2 = Store::default();
        assert!(apply_activation(&mut s2, "step-to-stl", &wrong, at(497_100, 1_000)).is_err());
    }

    /// Accepting the current code unlocks the tool until the top of the hour.
    #[test]
    fn current_code_unlocks_for_the_rest_of_the_hour() {
        let mut s = Store::default();
        let now = at(497_100, 1_000);
        let code = code_for("kfx-to-epub", 497_100);
        let info = apply_activation(&mut s, "kfx-to-epub", &code, now).unwrap();
        assert!(info.unlocked);
        assert_eq!(info.expires_at, desktop_code::bucket_end_ms(497_100));
        assert_eq!(info.remaining_ms, desktop_code::HOUR_MS - 1_000);
    }

    /// Codes are per tool: another tool's code must not unlock this one.
    #[test]
    fn another_tools_code_is_rejected() {
        let mut s = Store::default();
        let now = at(497_100, 1_000);
        let wrong = code_for("wad-extractor", 497_100);
        assert!(matches!(
            apply_activation(&mut s, "kfx-to-epub", &wrong, now),
            Err(AppError::InvalidCode)
        ));
        // And the rejected attempt must not have persisted anything.
        assert!(s.tools.is_empty());
    }

    /// A stale code (previous hour) is rejected.
    #[test]
    fn stale_code_is_rejected() {
        let mut s = Store::default();
        let stale = code_for("kfx-to-epub", 497_100);
        assert!(matches!(
            apply_activation(&mut s, "kfx-to-epub", &stale, at(497_101, 1_000)),
            Err(AppError::InvalidCode)
        ));
    }

    /// Pasting is forgiving about case and separators.
    #[test]
    fn activation_is_case_and_separator_insensitive() {
        let mut s = Store::default();
        let now = at(497_100, 1_000);
        let code = code_for("kfx-to-epub", 497_100).to_lowercase();
        assert!(apply_activation(&mut s, "kfx-to-epub", &code, now).is_ok());
        let spaced = code_for("kfx-to-epub", 497_100).replace('-', " ");
        assert!(apply_activation(&mut s, "kfx-to-epub", &spaced, now).is_ok());
    }

    /// Garbage input is rejected without panicking.
    #[test]
    fn junk_code_is_rejected() {
        let mut s = Store::default();
        for junk in ["", "   ", "xxxx", "!!!!", "ABCD-EFGH"] {
            assert!(matches!(
                apply_activation(&mut s, "kfx-to-epub", junk, at(497_100, 0)),
                Err(AppError::InvalidCode)
            ));
        }
    }

    /// The moment the hour rolls over, the tool locks again.
    #[test]
    fn unlock_lapses_exactly_at_the_boundary() {
        let boundary = desktop_code::bucket_end_ms(497_100);
        let s = store_with("kfx-to-epub", boundary);
        assert!(status_of(&s, "kfx-to-epub", boundary - 1).unlocked);
        assert!(!status_of(&s, "kfx-to-epub", boundary).unlocked);
    }

    /// The gate blocks conversion while locked, passes while unlocked.
    #[test]
    fn gate_blocks_locked_tools_only() {
        let s = store_with("kfx-to-epub", desktop_code::bucket_end_ms(497_100));
        assert!(matches!(
            require_unlocked(&s, "kfx-to-epub", at(497_101, 0)),
            Err(AppError::LicenseRequired(_))
        ));
        assert!(matches!(
            require_unlocked(&s, "wad-extractor", at(497_100, 0)),
            Err(AppError::LicenseRequired(_))
        ));
        assert!(require_unlocked(&s, "kfx-to-epub", at(497_100, 0)).is_ok());
    }

    /// The gate error names the tool so the UI can point at the right page.
    #[test]
    fn gate_error_carries_the_slug() {
        let s = Store::default();
        match require_unlocked(&s, "mts-to-mp4", at(497_100, 0)) {
            Err(AppError::LicenseRequired(slug)) => assert_eq!(slug, "mts-to-mp4"),
            other => panic!("expected LicenseRequired, got {other:?}"),
        }
    }

    /// Unlocking one tool leaves its neighbours locked.
    #[test]
    fn activations_are_independent() {
        let mut s = Store::default();
        let now = at(497_100, 0);
        apply_activation(&mut s, "kfx-to-epub", &code_for("kfx-to-epub", 497_100), now).unwrap();
        assert!(status_of(&s, "kfx-to-epub", now).unlocked);
        assert!(!status_of(&s, "wad-extractor", now).unlocked);
    }

    /// Re-activating extends the unlock instead of piling up entries.
    #[test]
    fn reactivating_replaces_the_entry() {
        let mut s = Store::default();
        let first = at(497_100, 0);
        let later = at(497_101, 0);
        apply_activation(&mut s, "kfx-to-epub", &code_for("kfx-to-epub", 497_100), first).unwrap();
        apply_activation(&mut s, "kfx-to-epub", &code_for("kfx-to-epub", 497_101), later).unwrap();
        assert_eq!(s.tools.len(), 1);
        assert_eq!(
            s.tools["kfx-to-epub"].expires_at,
            desktop_code::bucket_end_ms(497_101)
        );
    }

    /// Expired entries are dropped when the store is read back, keeping the
    /// on-disk file small.
    #[test]
    fn expired_entries_are_pruned_on_read() {
        let boundary = desktop_code::bucket_end_ms(497_100);
        let mut s = store_with("kfx-to-epub", boundary);
        s.tools.insert(
            "wad-extractor".to_string(),
            Activation {
                bucket: 0,
                expires_at: boundary + 1,
            },
        );
        let now = boundary;
        s.tools.retain(|_, a| a.expires_at > now);
        assert_eq!(s.tools.len(), 1, "only the still-valid unlock survives");
        assert!(s.tools.contains_key("wad-extractor"));
    }
}
