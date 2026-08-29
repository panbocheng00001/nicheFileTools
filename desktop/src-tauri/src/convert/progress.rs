use std::io::{Read, Write};

use crate::convert::converter::{ProgressPhase, ProgressSink};
use crate::errors::AppError;

/// A `Write` adapter that reports byte progress on every chunk, throttled to
/// ~50 updates per phase so the UI stays smooth without flooding the event bus.
///
/// Wrap any output `File` (or `BufWriter`) with this when a converter writes
/// its output so the UI can show a determinate byte-level bar. Pass
/// `total == 0` when the final size is unknown (UI shows indeterminate).
pub struct ProgressWriter<'a, W: Write> {
    inner: W,
    sink: &'a dyn ProgressSink,
    phase: ProgressPhase,
    total: u64,
    written: u64,
    last: u64,
    step: u64,
}

impl<'a, W: Write> ProgressWriter<'a, W> {
    pub fn new(inner: W, sink: &'a dyn ProgressSink, phase: ProgressPhase, total: u64) -> Self {
        let step = if total == 0 {
            0
        } else {
            (total / 50).clamp(32 * 1024, 8 * 1024 * 1024).max(1)
        };
        Self {
            inner,
            sink,
            phase,
            total,
            written: 0,
            last: 0,
            step,
        }
    }
}

impl<'a, W: Write> Write for ProgressWriter<'a, W> {
    fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
        let n = self.inner.write(buf)?;
        self.written += n as u64;
        if self.step == 0 || self.written - self.last >= self.step || self.written >= self.total {
            self.sink.report(self.phase, self.written, self.total);
            self.last = self.written;
        }
        Ok(n)
    }
    fn flush(&mut self) -> std::io::Result<()> {
        self.inner.flush()
    }
}

/// Copy `reader` -> `writer` in 64 KB chunks, reporting `phase` progress.
/// Returns total bytes written. Used by converters that stream the input
/// straight to the output (e.g. RAW → WAV).
pub fn copy_with_progress<R: Read, W: Write>(
    mut reader: R,
    mut writer: W,
    total: u64,
    sink: &dyn ProgressSink,
    phase: ProgressPhase,
) -> Result<u64, AppError> {
    let mut buf = [0u8; 64 * 1024];
    let mut processed: u64 = 0;
    let step = if total == 0 {
        0
    } else {
        (total / 50).clamp(32 * 1024, 8 * 1024 * 1024).max(1)
    };
    let mut last = 0u64;
    sink.report(phase, 0, total);
    loop {
        let n = reader
            .read(&mut buf)
            .map_err(|e| AppError::Other(format!("read failed: {e}")))?;
        if n == 0 {
            break;
        }
        writer
            .write_all(&buf[..n])
            .map_err(|e| AppError::Other(format!("write failed: {e}")))?;
        processed += n as u64;
        if step == 0 || processed - last >= step || processed >= total {
            sink.report(phase, processed, total);
            last = processed;
        }
    }
    sink.report(phase, processed, total);
    Ok(processed)
}
