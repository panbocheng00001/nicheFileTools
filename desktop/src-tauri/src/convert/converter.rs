use std::path::Path;

use crate::convert::engine::Engine;
use crate::errors::AppError;

/// Phase of a conversion, reported to the UI so it can render a granular bar.
/// `Reading`/`Converting`/`Done` are part of the protocol surface (emitted as
/// strings by the batch command and available to future converters) even though
/// the current streaming tools only report `Writing`.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[allow(dead_code)]
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

#[cfg(test)]
mod tests {
    use super::*;

    /// These strings are the wire protocol for the `convert-progress` event; the
    /// frontend renders a phase label from them.
    #[test]
    fn progress_phase_as_str_is_stable() {
        assert_eq!(ProgressPhase::Reading.as_str(), "reading");
        assert_eq!(ProgressPhase::Converting.as_str(), "converting");
        assert_eq!(ProgressPhase::Writing.as_str(), "writing");
        assert_eq!(ProgressPhase::Done.as_str(), "done");
    }

    /// A tool that only implements the simple `convert` must still be reachable
    /// through the progress-aware entry point (it simply reports nothing).
    #[test]
    fn default_convert_with_progress_delegates_to_convert() {
        struct Simple;
        impl Converter for Simple {
            fn slug(&self) -> &'static str {
                "simple"
            }
            fn class_type(&self) -> &'static str {
                "A"
            }
            fn engines(&self) -> &'static [Engine] {
                &[Engine::RustNative]
            }
            fn convert(&self, _input: &Path, _output: &Path) -> Result<u64, AppError> {
                Ok(42)
            }
        }
        assert_eq!(
            Simple
                .convert_with_progress(Path::new("in"), Path::new("out"), None, &NoopSink)
                .unwrap(),
            42
        );
    }

    /// Symmetrically, the simple entry point must route through the
    /// progress-aware one with a no-op sink, so a streaming tool stays correct
    /// even when called without a sink.
    #[test]
    fn default_convert_delegates_to_convert_with_progress() {
        struct Streaming;
        impl Converter for Streaming {
            fn slug(&self) -> &'static str {
                "streaming"
            }
            fn class_type(&self) -> &'static str {
                "A"
            }
            fn engines(&self) -> &'static [Engine] {
                &[Engine::RustNative]
            }
            fn convert_with_progress(
                &self,
                _input: &Path,
                _output: &Path,
                _opts: Option<&serde_json::Value>,
                sink: &dyn ProgressSink,
            ) -> Result<u64, AppError> {
                sink.report(ProgressPhase::Writing, 7, 7);
                Ok(7)
            }
        }
        assert_eq!(Streaming.convert(Path::new("in"), Path::new("out")).unwrap(), 7);
    }
}
