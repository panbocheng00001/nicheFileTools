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
            AppError::InvalidFile(_) => "invalid_file",
            AppError::QuotaExhausted => "quota_exhausted",
            AppError::Token(_) => "token",
            AppError::InvalidKey(_) => "invalid_key",
            AppError::Json(_) => "json",
            AppError::Other(_) => "other",
        }
        .to_string();
        AppErrorPayload {
            code,
            message: e.to_string(),
        }
    }
}
