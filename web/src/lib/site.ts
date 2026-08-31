/** Site-wide constants and category metadata (cross-document consistency comparison table #1/#2: brand nichefiletools / domain name nichefiletools.com)*/
export const SITE = "https://nichefiletools.com";
export const BRAND = "nichefiletools";
export const SUPPORT_EMAIL = "support@nichefiletools.com";
export const HELLO_EMAIL = "hello@nichefiletools.com";

/**
 * Open-source repository — single source of truth for every GitHub link on the
 * site (footer, about, docs, Schema.org `sameAs`).
 *
 * Entity SEO: Google resolves `Organization.sameAs` against this profile to
 * disambiguate "nichefiletools" from other entities, so the URL must appear in
 * the structured data **and** as a crawlable `<a href>` with real anchor text —
 * an icon-only link carries no anchor text and is worth far less.
 */
export const REPO_URL = "https://github.com/panbocheng00001/nicheFileTools";
export const REPO_ISSUES_URL = `${REPO_URL}/issues`;
export const REPO_OWNER = "panbocheng00001";
export const REPO_NAME = "nicheFileTools";
/** Canonical license of the project's own source (MIT). Used by SoftwareSourceCode schema. */
export const LICENSE_URL = `${REPO_URL}/blob/main/LICENSE`;

export interface CategoryMeta {
  slug: string;
  label: string;
  /** H1: Free [Category] Converters Online */
  headline: string;
  /** Original review of category pages (§2.13: Pure link lists are prohibited)*/
  intro: string;
  /** One sentence selection tip (Which ... do you need?)*/
  pickHint: string;
}

export const CATEGORIES: CategoryMeta[] = [
  {
    slug: "ebook",
    label: "eBook",
    headline: "Free eBook Converters Online",
    intro:
      "Ebook formats are locked to specific ecosystems: Amazon KFX only opens on Kindle devices and apps, while EPUB is the open standard every other reader uses. These converters rebuild ebook files locally in your browser — no upload, no account, and your library stays private.",
    pickHint:
      "Moving a DRM-free Kindle book to Apple Books or Kobo? Convert KFX to EPUB.",
  },
  {
    slug: "3d",
    label: "3D / CAD",
    headline: "Free 3D & CAD Converters Online",
    intro:
      "CAD part files (PRT) and Blender projects (BLEND) are rich, proprietary formats; STL and GLB are the exchange formats that slicers, game engines, and web viewers actually read. These tools tessellate and re-package your geometry entirely on your device — large assemblies stay private and nothing is uploaded.",
    pickHint:
      "Preparing a Creo part for 3D printing? Use PRT to STL. Shipping a Blender scene to the web? Use BLEND to GLB.",
  },
  {
    slug: "image",
    label: "Image",
    headline: "Free Image & Texture Converters Online",
    intro:
      "GPU texture formats like PVR are built for mobile GPUs, not for image editors. Decoding them to PNG lets artists inspect compression artifacts, recover game assets, and debug texture pipelines. Decoding runs client-side with WebAssembly, so even commercial assets never leave your machine.",
    pickHint:
      "Need to inspect or reuse a compressed game texture? Convert PVR to PNG.",
  },
  {
    slug: "video",
    label: "Video",
    headline: "Free Video Converters Online",
    intro:
      "AVCHD camcorders and Blu-ray recorders write MTS/M2TS streams that most editors and sharing sites won't accept. Remuxing to MP4 (H.264/AAC) in your browser keeps quality intact while making the file playable everywhere — nothing is uploaded, and FFmpeg runs entirely on your device.",
    pickHint:
      "Need to edit or share camcorder footage? Convert MTS to MP4.",
  },
  {
    slug: "archive",
    label: "Disc Image",
    headline: "Disc Image Converters",
    intro:
      "RAW disc images preserve all 2352 bytes of every sector — perfect for 1:1 backups, but too large for browsers to process. The desktop app handles RAW to ISO natively with unlimited file sizes, batch queues, and MD5 verification.",
    pickHint:
      "Mounting or re-burning a RAW/BIN image? Convert it to standard ISO with the desktop app.",
  },
  {
    slug: "audio",
    label: "Audio",
    headline: "Free Audio Converters Online",
    intro:
      "Headerless audio is more common than you'd think: DSP chips, telephony recorders, and data-recovery extractions all emit raw PCM streams that no player will open. Wrapping them in a WAV header is a lossless, instant operation — and because it runs locally in your browser, sensitive recordings never leave your machine.",
    pickHint:
      "Have a headerless .raw/.pcm/.bin stream from a recorder or DSP? Wrap it as WAV with RAW to WAV.",
  },
  {
    slug: "font",
    label: "Font",
    headline: "Free Font Converters Online",
    intro:
      "Legacy web-font wrappers outlived the browsers they were built for: EOT files still sit in @font-face stacks of pre-2015 sites and in archived design kits. Extracting the embedded sfnt font back to TTF/OTF is a lossless unboxing that runs entirely on your device — no upload of licensed assets to any server.",
    pickHint:
      "Recovering a font from an old site's .eot? Extract the embedded TTF/OTF with EOT to TTF.",
  },
  {
    slug: "data",
    label: "Data",
    headline: "Free Data File Converters Online",
    intro:
      "Research data locked in proprietary statistical formats is data nobody else can read. Converting SPSS .sav files (including compressed .zsav) to plain CSV in the browser means survey and clinical datasets open in Excel, pandas, and R instantly — with a UTF-8 BOM so international characters survive, and nothing ever uploaded.",
    pickHint:
      "Sharing SPSS data with non-SPSS users? Export it as CSV with SAV to CSV.",
  },
];

export function getCategory(slug: string): CategoryMeta | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}
