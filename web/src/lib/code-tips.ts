/**
 * Hourly rotating tips for the DesktopCodeCard.
 *
 * Why: the unlock-card is the page desktop users revisit every hour. A card
 * that only shows a code earns ~5 seconds of attention; a card with a real,
 * format-specific tip turns that revisit into a 30-second read (strategy:
 * "make the code page worth staying on" — the highest-leverage change to the
 * hourly-return mechanism).
 *
 * Rules (content red lines apply):
 *  - Every tip must be TRUE and tool-specific — distilled from the verified
 *    `formatDeep` / `troubleshooting` / `batchLarge` fields in
 *    `convert-content.ts`. No generic filler ("backup your files!").
 *  - Tips rotate deterministically with the same UTC hour bucket as the code
 *    itself: `tip = tips[bucket % tips.length]`. No server, no randomness —
 *    the tip changes exactly when the code does ("new hour, new tip").
 */

export const CODE_TIPS: Record<string, string[]> = {
  "kfx-to-epub": [
    "DRM-protected books cannot be converted by any tool — if the file only opens in Kindle apps, it is locked.",
    "Chapter order comes from the book's spine, not filenames — the converted EPUB keeps the original reading order.",
    "Amazon's Enhanced Typesetting (dynamic hyphenation, floating elements) rebuilds as standard EPUB CSS — expect typography, not text, to differ.",
  ],
  "prt-to-stl": [
    "Creo's own STL export lets you set chord height directly — use 0.05 mm for SLA, 0.1–0.2 mm for FDM.",
    "STEP AP214 keeps colors and structure; AP203 is smaller and fine for pure geometry-to-STL jobs.",
    "A faceted print is tessellation resolution, not a broken file — tighten the chord tolerance and re-export.",
  ],
  "pvr-to-png": [
    "The web decoder exports the largest mipmap by default — check the header's mipmap count if the output looks blurry.",
    "Compressed PVRs (PVRTC/ETC/ASTC) are rejected honestly — re-export the texture uncompressed from Unity/Unreal to convert it here.",
    "PVR v3 files start with the bytes 'PVR!' in a hex editor — a quick way to spot renamed DDS/KTX files.",
  ],
  "raw-to-iso": [
    "Mode 1 conversion discards sync/EDC/ECC bytes — the ISO comes out ~13% smaller than the RAW image. That is normal.",
    "PS1 games with subchannel data should keep the original RAW for emulation; use the ISO for mounting and archiving.",
    "A 4 GB image converts in seconds on an SSD — desktop streaming I/O has no browser memory ceiling.",
  ],
  "blend-to-glb": [
    "Run File → Clean Up → Purge in Blender first — project files often carry years of orphaned data-blocks and ship far heavier than needed.",
    "Procedural textures (Noise, Voronoi) don't exist in glTF — bake them to image maps before converting.",
    "Clearcoat and transmission have no standard glTF equivalent — expect material differences in the GLB.",
  ],
  "raw-to-wav": [
    "Don't know the parameters? Start with 44100 Hz / 16-bit / stereo — that covers most consumer recordings.",
    "Loud static means a byte-order or bit-depth mismatch — flip the bit depth first, then check endianness.",
    "Telephony dumps are usually 8000 Hz, VoIP 16000 Hz, video gear 48000 Hz — pitch shifts are proportional to the error.",
  ],
  "glb-to-gltf": [
    "The output is ~33% bigger than the GLB — base64 encodes 3 bytes as 4. Keep the GLB if size matters more than editability.",
    "Need the classic .gltf + .bin + textures set? Run the output through Microsoft's gltf-pipeline with --separate.",
    "A JSON file renamed to .glb doesn't need converting — it's already a .gltf. Check for the 'glTF' magic bytes.",
  ],
  "eot-to-ttf": [
    "Many EOTs were subset to the old page's character set — if accented glyphs are missing, they were never in the file.",
    "After recovering the TTF, fonttools takes it the rest of the way: pyftsubset for a modern charset, then WOFF2 compress.",
    "The rare MicroType compression (flag 0x4) has no open decoder — those files need the original font or an IE-era machine.",
  ],
  "opf-to-epub": [
    "Every manifest href must match the archive path exactly — case-sensitively. Most 'missing image' bugs are Cover.png vs cover.png.",
    "Reading order comes from the OPF's spine itemrefs, not file names — edit the spine to fix chapter order.",
    "Validate the output with epubcheck — it catches path and nav issues no converter can silently fix.",
  ],
  "sav-to-csv": [
    "Value labels (1=Male, 2=Female) don't exist in CSV — run Automatic Recode in SPSS first if you need the label text.",
    "SPSS dates are seconds since 1582-10-14 — format them in SPSS or R before export, or the CSV carries raw numbers.",
    "Strings longer than 255 characters split into segment columns by design — re-join them in pandas with a concat.",
  ],
  "pfm-to-ttf": [
    "A PFM alone has no glyph shapes — find the matching .pfb on the original install media. They share a filename prefix.",
    "Cubic-to-quadratic approximation holds within 0.1% of the em — only sub-8pt hinting may shift slightly.",
    "Composite glyphs (à, ö) are rebuilt as TrueType composites — if one is off, the source .pfb may use a non-standard encoding.",
  ],
  "exr-to-png": [
    "Too dark or too bright? Raise exposure (try 2.0–3.0) or switch from Reinhard to ACES for softer highlight roll-off.",
    "The web tool emits 8-bit sRGB — the desktop app exports 16-bit PNG or TIFF when you need more headroom.",
    "Depth, normal, and motion vectors live in separate channels — the desktop app can export each as its own false-color PNG.",
  ],
  "gsm-to-wav": [
    "GSM is telephone-band (300–3400 Hz) — the decode is exact, but no tool can recover frequencies the codec discarded.",
    "Archive workflow: GSM → WAV (lossless decode) → FLAC (lossless compression). MP3 would add another lossy generation.",
    "The tool detects GSM by frame structure, not extension — a renamed .dat with valid frames still decodes.",
  ],
  "mts-to-mp4": [
    "The default is a remux — video copies bit-for-bit, only AC3 audio re-encodes to AAC. Quality is identical.",
    "A camcorder SD card is a folder of hundreds of clips — the desktop app batch-remuxes them with NVENC/QSV acceleration.",
    "Only the first audio track survives in the web tool — use the desktop app's advanced options for multi-track output.",
  ],
  "wad-extractor": [
    "Selective extraction beats unpacking: pull just MAP01 or the sprite set out of a 4 GB archive instead of all of it.",
    "DOOM's source is GPL since 1997, but the assets stay protected — extracted content is personal-use only.",
    "Steam installs keep WADs under SteamApps/common — DOOM Classic in base/doom.wad, Quake in id1/.",
  ],
};

/** Deterministic tip for the current hour bucket — rotates with the code. */
export function getCodeTip(slug: string, bucket: number): string | null {
  const tips = CODE_TIPS[slug];
  if (!tips || tips.length === 0) return null;
  return tips[Math.abs(bucket) % tips.length];
}
