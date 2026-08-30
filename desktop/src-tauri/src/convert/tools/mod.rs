// Desktop converter modules. One file per tool (technical document §3.1).
// Adding a tool: add a `pub mod` line here and a line in `convert/mod.rs::all()`.
pub mod blend_to_glb;
pub mod eot_to_ttf;
pub mod exr_to_png;
pub mod glb_to_gltf;
pub mod gsm_to_wav;
pub mod kfx_to_epub;
pub mod mts_to_mp4;
pub mod opf_to_epub;
pub mod pfm_to_ttf;
pub mod pvr_to_png;
pub mod raw_to_iso;
pub mod raw_to_wav;
pub mod sav_to_csv;
pub mod step_to_stl;
pub mod wad_extractor;
