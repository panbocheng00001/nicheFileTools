use serde::{Deserialize, Serialize};

/// A single tool descriptor — the **desktop single source of truth** (技术文档 §3.4).
///
/// This mirrors `tools.json`, which is embedded into the binary at compile time
/// and also consumed by the desktop UI. It is intentionally separate from the
/// web app (no SEO fields, no cross-repo sync).
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ToolMeta {
    pub slug: String,
    pub name: String,
    /// A / B / C classification.
    #[serde(default)]
    pub class: String,
    /// Engine slugs, e.g. `["rust-native"]` or `["calibre"]`.
    #[serde(default)]
    pub engines: Vec<String>,
    /// Accepted source extensions, e.g. `[".raw", ".img"]`.
    #[serde(default)]
    pub source: Vec<String>,
    /// Output extension, e.g. `.iso`.
    #[serde(default)]
    pub target: String,
    /// How the converter writes output: `"file"` (single output path) or
    /// `"dir"` (extracts into a directory, e.g. WAD). Drives batch output-path
    /// derivation on the frontend (P3 批量队列).
    #[serde(default = "default_output_kind")]
    pub output_kind: String,
    /// Optional user-facing guidance (e.g. "需安装 Calibre").
    #[serde(default)]
    pub guide: Option<String>,
    /// Optional UI grouping category.
    #[serde(default)]
    pub category: Option<String>,
}

fn default_output_kind() -> String {
    "file".to_string()
}

#[derive(Clone, Debug, Serialize, Deserialize)]
struct Manifest {
    tools: Vec<ToolMeta>,
}

/// `tools.json` lives next to this source file and is compiled into the binary,
/// so the UI and engine resolver always agree.
const MANIFEST_JSON: &str = include_str!("../../tools.json");

static MANIFEST: std::sync::OnceLock<Manifest> = std::sync::OnceLock::new();

fn manifest() -> &'static Manifest {
    MANIFEST.get_or_init(|| {
        serde_json::from_str(MANIFEST_JSON).expect("tools.json must be valid JSON")
    })
}

/// All registered tools (read-only view).
pub fn tools() -> &'static [ToolMeta] {
    &manifest().tools
}

/// Look up a tool by slug.
pub fn tool(slug: &str) -> Option<&'static ToolMeta> {
    tools().iter().find(|t| t.slug == slug)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;

    #[test]
    fn manifest_declares_expected_tool_count() {
        assert_eq!(tools().len(), 15);
    }

    #[test]
    fn slugs_are_unique() {
        let mut seen = HashSet::new();
        for t in tools() {
            assert!(
                seen.insert(t.slug.as_str()),
                "duplicate slug `{}` in tools.json",
                t.slug
            );
        }
    }

    /// The UI derives file filters, output paths and sidebar grouping from these
    /// fields. A malformed entry surfaces as a broken tool at runtime rather than
    /// a load error, so it must be caught here.
    #[test]
    fn every_tool_has_wellformed_metadata() {
        for t in tools() {
            assert!(!t.slug.is_empty());
            assert!(!t.name.is_empty(), "`{}` has no name", t.slug);
            assert!(
                matches!(t.class.as_str(), "A" | "B" | "C"),
                "`{}` has invalid class `{}`",
                t.slug,
                t.class
            );
            assert!(!t.engines.is_empty(), "`{}` declares no engines", t.slug);
            assert!(!t.source.is_empty(), "`{}` declares no source ext", t.slug);
            for s in &t.source {
                assert!(
                    s.starts_with('.'),
                    "`{}` source `{}` must start with '.'",
                    t.slug,
                    s
                );
            }
            assert!(
                t.target.starts_with('.'),
                "`{}` target `{}` must start with '.'",
                t.slug,
                t.target
            );
            assert!(
                matches!(t.output_kind.as_str(), "file" | "dir"),
                "`{}` has invalid output_kind `{}`",
                t.slug,
                t.output_kind
            );
            assert!(
                t.category.is_some(),
                "`{}` has no category — sidebar grouping would break",
                t.slug
            );
        }
    }

    #[test]
    fn tool_lookup_hits_and_misses() {
        let wad = tool("wad-extractor").expect("wad-extractor must exist");
        assert_eq!(wad.output_kind, "dir", "WAD extracts into a directory");
        assert!(tool("nope-does-not-exist").is_none());
    }

    /// Only the extractor writes a directory; everything else must default to a
    /// single output file (the frontend branches on this to build output paths).
    #[test]
    fn output_kind_defaults_to_file() {
        for t in tools() {
            if t.slug == "wad-extractor" {
                continue;
            }
            assert_eq!(
                t.output_kind, "file",
                "`{}` should default to file output",
                t.slug
            );
        }
    }
}
