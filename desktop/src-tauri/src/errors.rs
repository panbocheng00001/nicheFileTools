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

    /// The tool has no active unlock. Codes are per tool and refresh on the
    /// hour; copy the current one from that tool's page on nichefiletools.com.
    #[error("This tool is locked. Copy the current unlock code from its page on nichefiletools.com to unlock it for the next hour.")]
    LicenseRequired(String),

    /// The pasted code did not match this tool's code for the current hour.
    #[error("That code is not valid for this tool right now. Codes refresh on the hour — copy the latest one from the tool's page.")]
    InvalidCode,

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
            AppError::LicenseRequired(_) => "license_required",
            AppError::InvalidCode => "invalid_code",
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
    /// branches on these exact strings (e.g. `license_required` switches the
    /// tool card into its locked state), so a silent rename here would break UX
    /// without failing to compile.
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
            (
                AppError::LicenseRequired("t".into()),
                "license_required",
            ),
            (AppError::InvalidCode, "invalid_code"),
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
            "license_required",
            "invalid_code",
            "json",
            "sidecar_spawn",
            "sidecar_failed",
            "other",
        ];
        let mut seen = std::collections::HashSet::new();
        for c in codes {
            assert!(seen.insert(c), "duplicate error code `{c}`");
        }
        assert_eq!(seen.len(), 12);
    }

    /// The locked-tool copy must name the site, because the whole flow depends
    /// on the user knowing where to fetch a code.
    #[test]
    fn license_required_message_points_at_the_site() {
        let payload: AppErrorPayload = AppError::LicenseRequired("kfx-to-epub".into()).into();
        assert_eq!(payload.code, "license_required");
        assert!(
            payload.message.contains("nichefiletools.com"),
            "message must tell the user where to get a code, got: {}",
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
