use serde::Serialize;

/// Error type used across the desktop conversion / key-reflow layers.
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Unsupported tool: {0}")]
    UnsupportedTool(String),

    #[error("Not implemented on desktop yet: {0}")]
    NotImplemented(String),

    #[error("Missing dependency: {0}")]
    MissingDependency(String),

    #[error("Required engine not installed: {0}")]
    EngineMissing(String),

    #[error("Invalid or corrupted file: {0}")]
    InvalidFile(String),

    #[error("Free quota exhausted. Unlock with a free desktop key to continue.")]
    QuotaExhausted,

    #[error("Token / network error: {0}")]
    Token(String),

    #[error("Invalid key: {0}")]
    InvalidKey(String),

    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("Failed to launch external engine: {0}")]
    SidecarSpawn(String),

    #[error("External engine failed: {0}")]
    SidecarFailed(String),

    #[error("{0}")]
    Other(String),
}

/// Serializable payload returned to the frontend (Tauri requires `Serialize`).
#[derive(Serialize)]
pub struct AppErrorPayload {
    pub code: String,
    pub message: String,
}

impl From<AppError> for AppErrorPayload {
    fn from(e: AppError) -> Self {
        let code = match e {
            AppError::Io(_) => "io",
            AppError::UnsupportedTool(_) => "unsupported_tool",
            AppError::NotImplemented(_) => "not_implemented",
            AppError::MissingDependency(_) => "missing_dependency",
            AppError::EngineMissing(_) => "engine_missing",
            AppError::InvalidFile(_) => "invalid_file",
            AppError::QuotaExhausted => "quota_exhausted",
            AppError::Token(_) => "token",
            AppError::InvalidKey(_) => "invalid_key",
            AppError::Json(_) => "json",
            AppError::SidecarSpawn(_) => "sidecar_spawn",
            AppError::SidecarFailed(_) => "sidecar_failed",
            AppError::Other(_) => "other",
        }
        .to_string();
        AppErrorPayload {
            code,
            message: e.to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Every variant must keep its stable, snake_case `code`. The frontend
    /// branches on these exact strings (e.g. `quota_exhausted` opens the unlock
    /// modal), so a silent rename here would break UX without failing to compile.
    #[test]
    fn every_variant_maps_to_a_stable_code() {
        let json_err = serde_json::from_str::<u32>("not a number").unwrap_err();
        let cases: Vec<(AppError, &str)> = vec![
            (
                AppError::Io(std::io::Error::new(std::io::ErrorKind::NotFound, "gone")),
                "io",
            ),
            (AppError::UnsupportedTool("t".into()), "unsupported_tool"),
            (AppError::NotImplemented("t".into()), "not_implemented"),
            (AppError::MissingDependency("t".into()), "missing_dependency"),
            (AppError::EngineMissing("ffmpeg".into()), "engine_missing"),
            (AppError::InvalidFile("t".into()), "invalid_file"),
            (AppError::QuotaExhausted, "quota_exhausted"),
            (AppError::Token("t".into()), "token"),
            (AppError::InvalidKey("t".into()), "invalid_key"),
            (AppError::Json(json_err), "json"),
            (AppError::SidecarSpawn("t".into()), "sidecar_spawn"),
            (AppError::SidecarFailed("t".into()), "sidecar_failed"),
            (AppError::Other("t".into()), "other"),
        ];
        for (err, expected) in cases {
            let payload: AppErrorPayload = err.into();
            assert_eq!(payload.code, expected, "unstable code for `{expected}`");
        }
    }

    /// Codes must all be unique — a duplicate would make the frontend branch
    /// ambiguous.
    #[test]
    fn codes_are_unique() {
        let codes = [
            "io",
            "unsupported_tool",
            "not_implemented",
            "missing_dependency",
            "engine_missing",
            "invalid_file",
            "quota_exhausted",
            "token",
            "invalid_key",
            "json",
            "sidecar_spawn",
            "sidecar_failed",
            "other",
        ];
        let mut seen = std::collections::HashSet::new();
        for c in codes {
            assert!(seen.insert(c), "duplicate error code `{c}`");
        }
        assert_eq!(seen.len(), 13);
    }

    /// `ToolConverter.runBatch` detects quota exhaustion with `/quota exhausted/i`
    /// on the error *message*. Keep the user-facing copy in sync with that check.
    #[test]
    fn quota_message_matches_frontend_detection() {
        let payload: AppErrorPayload = AppError::QuotaExhausted.into();
        assert_eq!(payload.code, "quota_exhausted");
        assert!(
            payload.message.to_lowercase().contains("quota exhausted"),
            "message must contain \"quota exhausted\", got: {}",
            payload.message
        );
    }

    /// The payload must carry the underlying detail so failures are debuggable.
    #[test]
    fn payload_message_carries_detail() {
        let payload: AppErrorPayload = AppError::EngineMissing("FFmpeg".into()).into();
        assert!(payload.message.contains("FFmpeg"));
    }
}
