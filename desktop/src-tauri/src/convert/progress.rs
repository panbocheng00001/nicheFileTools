use std::io::{Read, Seek, SeekFrom, Write};

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

/// `Seek` is delegated to the inner writer so `ProgressWriter` can back sinks that
/// require it (e.g. `zip::ZipWriter`, which needs `W: Write + Seek`). Seeking does
/// not update the progress counter — zip only seeks while finalizing the central
/// directory, where byte progress is irrelevant.
impl<'a, W: Write + Seek> Seek for ProgressWriter<'a, W> {
    fn seek(&mut self, pos: SeekFrom) -> std::io::Result<u64> {
        self.inner.seek(pos)
    }
}

/// Copy `reader` -> `writer` in 64 KB chunks, reporting `phase` progress.
/// Returns total bytes written. Reusable helper for converters that stream the
/// input straight to the output (e.g. a future RAW → WAV path); the current
/// streaming tools wire `ProgressWriter` directly, so this is kept as a helper.
#[allow(dead_code)]
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::convert::converter::{NoopSink, ProgressPhase, ProgressSink};
    use std::io::Cursor;
    use std::sync::Mutex;

    /// Records every report so tests can assert the byte channel behaves.
    #[derive(Default)]
    struct Capture {
        events: Mutex<Vec<(String, u64, u64)>>,
    }
    impl ProgressSink for Capture {
        fn report(&self, phase: ProgressPhase, processed: u64, total: u64) {
            self.events
                .lock()
                .unwrap()
                .push((phase.as_str().to_string(), processed, total));
        }
    }

    #[test]
    fn progress_writer_final_report_equals_bytes_written() {
        let sink = Capture::default();
        let total = 1024 * 1024u64; // 1 MiB
        {
            let mut w = ProgressWriter::new(Vec::new(), &sink, ProgressPhase::Writing, total);
            let chunk = vec![0u8; 64 * 1024];
            for _ in 0..16 {
                w.write_all(&chunk).unwrap();
            }
            w.flush().unwrap();
        }
        let events = sink.events.lock().unwrap();
        assert!(!events.is_empty(), "no progress reported");
        let last = events.last().unwrap();
        assert_eq!(last.1, total, "final processed must equal bytes written");
        assert_eq!(last.0, "writing", "should report the writing phase");
    }

    /// Throttling keeps the UI smooth: a large stream must produce ~50 updates,
    /// not one event per write (which would flood the IPC channel).
    #[test]
    fn progress_writer_throttles_events() {
        let sink = Capture::default();
        let total = 8 * 1024 * 1024u64;
        {
            let mut w = ProgressWriter::new(Vec::new(), &sink, ProgressPhase::Writing, total);
            let chunk = vec![0u8; 64 * 1024];
            for _ in 0..128 {
                w.write_all(&chunk).unwrap();
            }
        }
        let n = sink.events.lock().unwrap().len();
        assert!(n <= 64, "expected a throttled stream (~50 events), got {n}");
        assert!(n >= 2, "expected several progress updates, got {n}");
    }

    /// Unknown total (0) means the UI shows an indeterminate bar — we must still
    /// report continuously rather than going silent.
    #[test]
    fn progress_writer_reports_with_unknown_total() {
        let sink = Capture::default();
        {
            let mut w = ProgressWriter::new(Vec::new(), &sink, ProgressPhase::Writing, 0);
            for i in 0..5u8 {
                w.write_all(&[i; 1024]).unwrap();
            }
        }
        let events = sink.events.lock().unwrap();
        assert_eq!(
            events.len(),
            5,
            "every write should report when total is unknown"
        );
        assert!(events.iter().all(|e| e.2 == 0), "total must stay 0");
    }

    #[test]
    fn copy_with_progress_streams_and_reports() {
        let src: Vec<u8> = (0..200u32).map(|i| (i % 251) as u8).collect();
        let sink = Capture::default();
        let mut dst = Vec::new();
        let n = copy_with_progress(
            Cursor::new(&src),
            &mut dst,
            src.len() as u64,
            &sink,
            ProgressPhase::Reading,
        )
        .unwrap();
        assert_eq!(n, src.len() as u64);
        assert_eq!(dst, src, "copied bytes must match the source");

        let events = sink.events.lock().unwrap();
        assert_eq!(events.first().unwrap().1, 0, "should announce the start");
        assert_eq!(
            events.last().unwrap().1,
            src.len() as u64,
            "should finish at the total"
        );
        assert!(events.iter().all(|e| e.0 == "reading"));
    }

    /// Seeking must be forwarded so `ProgressWriter` can back `ZipWriter`
    /// (which requires `W: Write + Seek`) — used by OPF→EPUB.
    #[test]
    fn progress_writer_forwards_seek() {
        let mut w = ProgressWriter::new(
            Cursor::new(Vec::new()),
            &NoopSink,
            ProgressPhase::Writing,
            0,
        );
        w.write_all(b"abcd").unwrap();
        assert_eq!(w.seek(SeekFrom::Start(0)).unwrap(), 0);
    }
}
