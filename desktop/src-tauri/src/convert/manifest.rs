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
