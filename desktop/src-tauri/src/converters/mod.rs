use std::path::Path;

use crate::errors::AppError;

/// Unified converter interface for the desktop app (mirrors the web `IConverter`).
pub trait Converter {
    /// Stable tool slug, e.g. `raw-to-iso`.
    fn slug(&self) -> &'static str;
    /// A / B / C classification (see 技术需求文档 §3).
    fn class_type(&self) -> &'static str;
    /// Perform the conversion, writing output to `output`. Returns bytes written.
    fn convert(&self, input: &Path, output: &Path) -> Result<u64, AppError>;
}

mod raw_to_iso;
mod pvr_to_png;
mod prt_to_stl;
mod blend_to_glb;
mod kfx_to_epub;

/// All registered converters.
pub fn all() -> Vec<Box<dyn Converter>> {
    vec![
        Box::new(raw_to_iso::RawToIsoConverter),
        Box::new(pvr_to_png::PvrToPngConverter),
        Box::new(prt_to_stl::PrtToStlConverter),
        Box::new(blend_to_glb::BlendToGlbConverter),
        Box::new(kfx_to_epub::KfxToEpubConverter),
    ]
}

/// Resolve a converter by slug.
pub fn get_converter(slug: &str) -> Option<Box<dyn Converter>> {
    all().into_iter().find(|c| c.slug() == slug)
}
