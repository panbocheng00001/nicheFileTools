use std::path::Path;

use crate::convert::engine::Engine;
use crate::errors::AppError;

/// Phase of a conversion, reported to the UI so it can render a granular bar.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ProgressPhase {
    /// Reading / parsing the input file.
    Reading,
    /// CPU-bound transform with no clean byte metric — UI shows indeterminate.
    Converting,
    /// Writing the output file.
    Writing,
    /// Finished.
    Done,
}

impl ProgressPhase {
    pub fn as_str(self) -> &'static str {
        match self {
            ProgressPhase::Reading => "reading",
            ProgressPhase::Converting => "converting",
            ProgressPhase::Writing => "writing",
            ProgressPhase::Done => "done",
        }
    }
}

/// Sink a converter reports byte-level progress into. The batch command wires
/// this to a Tauri `convert-progress` event; single-file conversions use
/// [`NoopSink`]. `Send + Sync` so it can be shared across the converter call.
pub trait ProgressSink: Send + Sync {
    /// `processed`/`total` are bytes for the current `phase`. A `total` of 0
    /// means the size is unknown (UI renders an indeterminate bar).
    fn report(&self, phase: ProgressPhase, processed: u64, total: u64);
}

/// No-op progress sink. Used when callers don't care about byte progress (e.g.
/// the single-file `convert` command, or a tool that reports nothing).
pub struct NoopSink;
impl ProgressSink for NoopSink {
    fn report(&self, _phase: ProgressPhase, _processed: u64, _total: u64) {}
}

/// Unified converter interface for the desktop app.
///
/// Every tool (pure-Rust or sidecar-backed) implements this trait. The router
/// in `mod.rs` dispatches by `slug`, pre-checks `engines()` against the
/// `EngineResolver`, then calls `convert_with_progress`. Converters that can
/// report byte progress override `convert_with_progress` and call
/// `sink.report(...)`; the rest override the simple `convert` and the UI falls
/// back to an indeterminate "working" bar.
pub trait Converter: Send + Sync {
    /// Stable tool slug, e.g. `raw-to-iso`. Must match `tools.json`.
    fn slug(&self) -> &'static str;

    /// A / B / C classification (see 技术需求文档 §5).
    #[allow(dead_code)]
    fn class_type(&self) -> &'static str;

    /// Engines this tool depends on. `RustNative` is always satisfied.
    fn engines(&self) -> &'static [Engine];

    /// Primary entry point. Reports byte progress through `sink`; accepts optional
    /// IPC `opts`. Defaults to the simple [`Converter::convert`] (no progress).
    fn convert_with_progress(
        &self,
        input: &Path,
        output: &Path,
        opts: Option<&serde_json::Value>,
        sink: &dyn ProgressSink,
    ) -> Result<u64, AppError> {
        let _ = (opts, sink);
        self.convert(input, output)
    }

    /// Simple conversion without progress. Defaults to the progress-aware path
    /// with a no-op sink. Tools that want byte progress override
    /// [`Converter::convert_with_progress`] instead.
    fn convert(&self, input: &Path, output: &Path) -> Result<u64, AppError> {
        self.convert_with_progress(input, output, None, &NoopSink)
    }
}
