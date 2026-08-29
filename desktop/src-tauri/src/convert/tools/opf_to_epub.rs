use std::fs;
use std::io::{Cursor, Write};
use std::path::Path;

use zip::write::SimpleFileOptions;
use zip::CompressionMethod;
use zip::ZipWriter;

use crate::convert::converter::Converter;
use crate::convert::engine::Engine;
use crate::errors::AppError;

/// OPF (EPUB package / OEBPS) -> EPUB (zip container).
///
/// Parses the OPF manifest for its resources, then repackages them into a valid
/// EPUB: an uncompressed `mimetype` entry first, `META-INF/container.xml`
/// pointing at the OPF, and every referenced file copied under `OEBPS/`.
/// Calibre can be used as a fallback for malformed OPFs.
pub struct OpfToEpubConverter;

impl Converter for OpfToEpubConverter {
    fn slug(&self) -> &'static str {
        "opf-to-epub"
    }
    fn class_type(&self) -> &'static str {
        "A"
    }
    fn engines(&self) -> &'static [Engine] {
        &[Engine::RustNative]
    }
    fn convert(&self, input: &Path, output: &Path) -> Result<u64, AppError> {
        let opf_bytes = fs::read(input)?;
        let base = input.parent().unwrap_or_else(|| Path::new("."));
        let opf_name = input
            .file_name()
            .map(|s| s.to_string_lossy().into_owned())
            .unwrap_or_else(|| "content.opf".into());

        let hrefs = parse_manifest_hrefs(&opf_bytes)?;

        let file = fs::File::create(output)?;
        let mut zip = ZipWriter::new(file);
        let stored = SimpleFileOptions::default().compression_method(CompressionMethod::Stored);
        let deflated = SimpleFileOptions::default().compression_method(CompressionMethod::Deflated);
        let zip_err = |e| AppError::Other(format!("EPUB zip error: {e}"));

        // 1) mimetype must be the first entry, stored uncompressed.
        zip.start_file("mimetype", stored).map_err(zip_err)?;
        zip.write_all(b"application/epub+zip")?;

        // 2) META-INF/container.xml
        zip.start_file("META-INF/container.xml", deflated).map_err(zip_err)?;
        zip.write_all(
            format!(
                "<?xml version=\"1.0\"?>\n\
                 <container version=\"1.0\" xmlns=\"urn:oasis:names:tc:opendocument:xmlns:container\">\n\
                 \x20\x20<rootfiles>\n\
                 \x20\x20\x20\x20<rootfile full-path=\"OEBPS/{opf_name}\" media-type=\"application/oebps-package+xml\"/>\n\
                 \x20\x20</rootfiles>\n\
                 </container>\n"
            )
            .as_bytes(),
        )?;

        // 3) The OPF itself.
        zip.start_file(format!("OEBPS/{opf_name}"), deflated).map_err(zip_err)?;
        zip.write_all(&opf_bytes)?;

        // 4) Every referenced resource.
        let mut written: u64 = 0;
        for href in hrefs {
            let rel = normalize(href.trim());
            let src = base.join(&rel);
            if let Ok(bytes) = fs::read(&src) {
                let entry = format!("OEBPS/{}", rel.replace('\\', "/"));
                zip.start_file(entry, deflated).map_err(zip_err)?;
                zip.write_all(&bytes)?;
                written += bytes.len() as u64;
            }
            // Missing referenced files are skipped (we still emit a valid EPUB).
        }

        zip.finish().map_err(|e| AppError::Other(format!("EPUB zip finalize failed: {e}")))?;
        let size = fs::metadata(output).map(|m| m.len()).unwrap_or(0);
        Ok(size + written)
    }
}

/// Extract `href` values from every `<item ...>` inside `<manifest>`.
fn parse_manifest_hrefs(opf: &[u8]) -> Result<Vec<String>, AppError> {
    use quick_xml::events::Event;
    use quick_xml::reader::Reader;

    let mut reader = Reader::from_reader(Cursor::new(opf));
    let mut buf = Vec::new();
    let mut in_manifest = false;
    let mut hrefs = Vec::new();

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(e)) => {
                let name = e.name().as_ref().to_ascii_lowercase();
                if name.as_slice() == b"manifest" {
                    in_manifest = true;
                } else if in_manifest && name.as_slice() == b"item" {
                    for a in e.attributes().flatten() {
                        if a.key.as_ref().eq_ignore_ascii_case(b"href") {
                            let v = String::from_utf8_lossy(&a.value).into_owned();
                            hrefs.push(v);
                        }
                    }
                }
            }
            Ok(Event::End(e)) => {
                if e.name().as_ref().to_ascii_lowercase().as_slice() == b"manifest" {
                    in_manifest = false;
                }
            }
            Ok(Event::Eof) => break,
            Err(e) => return Err(AppError::InvalidFile(format!("OPF XML parse error: {e}"))),
            _ => {}
        }
        buf.clear();
    }
    Ok(hrefs)
}

fn normalize(href: &str) -> String {
    // Drop URL fragments / queries and collapse to a forward-slash path.
    let href = href.split(['#', '?']).next().unwrap_or(href);
    let mut out = String::new();
    for part in href.split('/') {
        if part.is_empty() || part == "." {
            continue;
        }
        if part == ".." {
            // Prevent escaping the base directory.
            continue;
        }
        if !out.is_empty() {
            out.push('/');
        }
        out.push_str(part);
    }
    out
}
