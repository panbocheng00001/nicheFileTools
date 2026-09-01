/**
* /convert/[slug] Tutorial page content — Site-wide specifications §2.2
* Division of labor with /tools/*: The tools page focuses on "execution", and this page focuses on "method comparison + desktop tutorial + troubleshooting".
* Red line: Do not reuse the body paragraphs of the /tools page (repetition <30%); the steps must be true.
 */

import { REPO_ISSUES_URL } from "./site";

export interface ConvertMethod {
  name: string;
  bestFor: string;
  price: string;
  limit: string;
  notes: string;
}

/** §3.2 实操截图：一张图挂在某一 tutorial step 上（step 省略表示全篇通用） */
export interface GuideScreenshot {
  /** 文件名，位于 /public/guides/ 下 */
  file: string;
  alt: string;
  step?: number;
}

export interface ConvertGuide {
  slug: string;
  title: string; //≤60 characters (including brand template suffix)
  metaDescription: string; //≤155 characters
  quickAnswer: string;
  /** §3.2 格式深度解析：定义 + 行业应用 + 优缺点（原创，与 /tools/ whatIs 重复 <30%） */
  formatDeep: string;
  methods: ConvertMethod[];
  /** §3.2 在线操作步骤（仅网页转换器真实可用时填写） */
  onlineSteps?: string[];
  /** Step-by-step tutorial section title (default "... on Desktop"); online tool tools use online step titles*/
  stepsTitle?: string;
  desktopSteps: string[];
  desktopNote?: string;
  troubleshooting: { problem: string; fix: string }[];
  /** §3.2 批量 / 大文件专属方案 */
  batchLarge: string;
  /** §3.2 页级 FAQ（与 /tools/ 页 FAQ 差异化，2 条为宜） */
  faqs?: { question: string; answer: string }[];
  /** §7.1 最后更新日期（页脚标注 + Article dateModified） */
  updated?: string;
  /** §三.2 实操截图清单（5-8 张/篇，按步骤挂载） */
  screenshots?: GuideScreenshot[];
  conclusion: string;
}

export const CONVERT_GUIDES: ConvertGuide[] = [
  {
    slug: "kfx-to-epub",
    title: "How to Convert KFX to EPUB — Free 2026 Guide",
    metaDescription:
      "Convert KFX to EPUB with the free desktop app or Calibre. DRM-free files only. Batch mode, no size limit, and fixes for common errors.",
    quickAnswer:
      "Yes — you can convert DRM-free KFX to EPUB in about a minute with the free nichefiletools desktop app (hourly unlock code on the tool page). Calibre with the KFX Input plugin is another free route. DRM-protected KFX files cannot be converted by any legitimate tool, ours included.",
    formatDeep:
      "KFX is what Amazon delivers to modern Kindles (2017+): an Enhanced Typesetting container that splits a book into positionally-addressed fragments so each device can reflow typography its own way. EPUB is the IDPF/W3C open standard every non-Kindle reader uses — Apple Books, Kobo, Google Play Books. The trade-off when moving between them is typographic, not textual: Amazon's dynamic hyphenation and floating elements rebuild as standard EPUB CSS, while text, chapter order, and the table of contents carry over intact. Teams that archive or re-edit purchased DRM-free books standardize on EPUB because every downstream tool — editors, validators, repositories — reads it.",
    batchLarge:
      "Whole-library jobs are where the desktop app earns its keep: point it at a folder of DRM-free KFX files and the batch queue rebuilds each book with chapter order and table of contents intact — no per-file cap, nothing uploaded. The hourly unlock code covers the entire batch, so a shelf of fifty books is one paste, one click, one wait.",
    methods: [
      {
        name: "nichefiletools desktop app",
        bestFor: "Single books, batches, and large libraries",
        price: "Free (hourly unlock code)",
        limit: "No file-size limit",
        notes: "Rebuilds the fragmented KFX structure into a standard EPUB package — chapter order and table of contents intact — while your library stays on your own disk the entire time.",
      },
      {
        name: "Calibre + KFX Input plugin",
        bestFor: "Existing Calibre users",
        price: "Free, open source",
        limit: "DRM-free files only",
        notes: "Calibre can import KFX with the KFX Input plugin and convert it with its own pipeline. Heavier setup, but a good fit if your whole library already lives in Calibre. It cannot remove DRM.",
      },
    ],
    desktopSteps: [
      "Install the free nichefiletools desktop app on Windows or macOS and launch it — KFX decoding rides on a free Calibre engine, and the app tells you if that's missing.",
      "Open KFX to EPUB from the sidebar tool list.",
      "Select your .kfx file and choose where to save the .epub output.",
      "Click Convert — the app reports progress and writes the EPUB next to your chosen path.",
    ],
    desktopNote:
      "First time using the desktop app? Every tool unlocks for an hour with a free code copied from its page here — paste it, convert, and the tool re-locks on the hour. Codes are always free; grab a fresh one from the same page any time.",
    troubleshooting: [
      {
        problem: "Conversion stops with an encryption error",
        fix: "The file is DRM-protected. Only DRM-free KFX files — personal documents, manuscripts you exported, or public-domain books — can be converted. There is no legitimate workaround, and we don't offer one.",
      },
      {
        problem: "The EPUB opens but the layout looks different",
        fix: "Amazon's Enhanced Typesetting features (dynamic hyphenation, floating elements) have no direct EPUB equivalent. Text, chapters, and the table of contents are preserved; fine typography is rebuilt with standard EPUB CSS.",
      },
      {
        problem: "My book is very large (image-heavy comic compilation)",
        fix: "No problem — the desktop app has no size cap and processes the same conversion natively regardless of file size. This is exactly why KFX stays a desktop-only conversion.",
      },
    ],
    conclusion:
      "For one DRM-free book, copy the free hourly code from the KFX to EPUB tool page, paste it in the desktop app, and convert. For a whole shelf, batch mode saves an evening of dragging files — and Calibre users get the same result with the KFX Input plugin.",
    updated: "2026-09-01",
    faqs: [
      {
        question: "Why does the desktop app ask for an hourly unlock code?",
        answer:
          "It's a free throttle against abuse, not a paywall: every tool page publishes a fresh code each hour, you paste it once, and the tool stays unlocked for that hour. Convert as many files as you like — codes are always free and there's no account or payment.",
      },
      {
        question: "I bought a KFX book on Amazon — can I convert it to EPUB?",
        answer:
          "Only if it's DRM-free. Amazon applies DRM to most purchased KFX titles, and no legitimate tool — ours included — can remove it. Personal documents you uploaded, manuscripts you exported, or public-domain books are DRM-free and convert cleanly.",
      },
    ],
    screenshots: [
      { file: "kfx-to-epub-hourly-unlock-code.webp", alt: "The free hourly unlock code published on the KFX to EPUB tool page" },
      { file: "kfx-to-epub-desktop-app-install.webp", alt: "Installing the free nichefiletools desktop app on Windows", step: 1 },
      { file: "kfx-to-epub-tool-sidebar.webp", alt: "Selecting KFX to EPUB from the desktop app sidebar tool list", step: 2 },
      { file: "kfx-to-epub-file-pick.webp", alt: "Picking a DRM-free .kfx file for conversion", step: 3 },
      { file: "kfx-to-epub-convert-progress.webp", alt: "Conversion progress as the fragmented KFX structure rebuilds into an EPUB package", step: 4 },
    ],
  },
  {
    slug: "prt-to-stl",
    title: "How to Convert PRT to STL — Free 2026 Guide",
    metaDescription:
      "Convert PRT (Creo/Pro-E) parts to STL via STEP export: the free desktop STEP-to-STL tool or Creo's own exporter. Tessellation settings and fixes.",
    quickAnswer:
      "PRT stores exact parametric geometry; STL stores a triangle approximation, so every PRT→STL conversion is a tessellation. Creo's PRT is a closed format no third-party tool reads directly — the reliable route is to export STEP from Creo (lossless geometry), then tessellate it with the desktop app's STEP to STL tool, or use Creo's own STL export if it's installed.",
    formatDeep:
      "PRT is PTC Creo/Pro-ENGINEER's native part format: an exact parametric B-Rep model — NURBS surfaces, features, and feature history. STL is none of that: a raw triangle soup with unit-less vertices, no assembly structure, and no materials. Every PRT→STL conversion is therefore a tessellation (a chord-tolerance approximation), which is fine for 3D printing and mesh analysis but lossy by definition. Engineers exchange STEP between CAD systems precisely because it carries exact geometry; STL is the handoff format for slicers, not for design round-trips.",
    batchLarge:
      "Print farms and assemblies are the volume case: export each Creo part as STEP, drop the whole folder into the desktop app's batch queue, and every file meshes at the 0.1 mm chord tolerance in one run. Complex parts can take 10–30 seconds each to tessellate — batch mode keeps the queue moving unattended, with no size cap on individual files.",
    methods: [
      {
        name: "STEP export + nichefiletools desktop app",
        bestFor: "Anyone without Creo's exporter at hand",
        price: "Free (hourly unlock code)",
        limit: "No file-size limit",
        notes: "In Creo: File → Save a Copy → STEP AP214. The desktop STEP to STL tool then tessellates the exact B-Rep geometry with a 0.1 mm default chord tolerance — the sweet spot for FDM printing — and outputs binary or ASCII STL.",
      },
      {
        name: "Creo native export",
        bestFor: "Anyone with a Creo license",
        price: "Included with Creo",
        limit: "Requires Creo installed",
        notes: "In Creo, File → Save a Copy → STL exposes chord height and angle control directly. Use it when you need a very specific tolerance for SLA/DLP printing.",
      },
      {
        name: "Why no direct PRT converter exists",
        bestFor: "Understanding the limit",
        price: "—",
        limit: "PRT is PTC's closed native format",
        notes: "No third-party geometry kernel — browser or desktop — parses PRT directly; sites that advertise direct PRT upload are quietly running a STEP bridge like this one. The STEP export from Creo is lossless for geometry, and everything downstream works on the STEP file.",
      },
    ],
    desktopSteps: [
      "In Creo, export your part: File → Save a Copy → STEP AP214 (.stp).",
      "Grab the free nichefiletools desktop app — its tessellation kernel (FreeCAD/OpenCASCADE) installs separately, and the app links you to it on first run.",
      "In the app's sidebar, choose STEP to STL.",
      "Select the exported .stp file and choose the output .stl location.",
      "Click Convert — tessellation of complex parts can take 10–30 seconds; the app shows progress while it meshes.",
    ],
    troubleshooting: [
      {
        problem: "The exported STEP file won't open",
        fix: "Re-export with Creo's default STEP profile (AP214 or AP242). AP203 works too — it carries no colors, which is irrelevant for STL. Avoid renaming or emailing the file through tools that re-encode attachments.",
      },
      {
        problem: "The printed part looks faceted",
        fix: "That's tessellation resolution, not a conversion error. 0.1–0.2 mm chord tolerance suits FDM; for SLA/DLP use 0.05 mm or finer. Finer tolerances multiply the triangle count and file size.",
      },
      {
        problem: "Colors and materials are missing in the slicer",
        fix: "The STL format stores geometry only — no color, materials, or textures exist in it. If you need color, export to 3MF or OBJ instead (Creo's own exporter supports both).",
      },
    ],
    conclusion:
      "Export STEP once from Creo, and the desktop app turns it into print-ready STL in seconds — production batches included. Creo users can also write STL directly at Save a Copy when a specific tolerance is needed.",
    updated: "2026-09-01",
    faqs: [
      {
        question: "Why STEP AP214 instead of AP203 or AP242?",
        answer:
          "AP214 is Creo's default export profile and carries everything STL needs. AP242 works identically; AP203 also tessellates fine but drops colors, which STL can't hold anyway. Any of the three converts.",
      },
      {
        question: "Binary or ASCII STL for printing?",
        answer:
          "Binary — roughly 6× smaller with identical geometry, and every slicer reads it. ASCII only helps if you plan to hand-read the triangle list.",
      },
    ],
    screenshots: [
      { file: "prt-to-stl-creo-step-export.webp", alt: "Creo's Save a Copy dialog exporting a PRT part as STEP AP214", step: 1 },
      { file: "prt-to-stl-desktop-app-freecad-check.webp", alt: "The nichefiletools desktop app checking for the FreeCAD engine on launch", step: 2 },
      { file: "prt-to-stl-tool-selected.webp", alt: "STEP to STL selected in the desktop app sidebar for PRT to STL conversion", step: 3 },
      { file: "prt-to-stl-stp-file-chosen.webp", alt: "The exported .stp CAD file loaded into the STEP to STL tool", step: 4 },
      { file: "prt-to-stl-tessellation-progress.webp", alt: "Tessellation progress as the PRT-derived geometry meshes to STL", step: 5 },
      { file: "prt-to-stl-stl-in-slicer.webp", alt: "The finished STL from the PRT part opened in a slicer for 3D printing" },
    ],
  },
  {
    slug: "pvr-to-png",
    title: "How to Convert PVR to PNG — Free 2026 Guide",
    metaDescription:
      "Decode PVR textures (PVRTC/ETC/ASTC) to PNG: free online tool, desktop batch mode, or PVRTexTool. Auto format detection and common fixes.",
    quickAnswer:
      "Decoding PVR to PNG is a decompression step, so it's fast and lossless at the pixel level: the PNG shows exactly what the compressed texture contains. The online tool auto-detects PVRTC, ETC, and ASTC variants up to 100 MB; texture sets from a real game project belong in the desktop app's batch mode.",
    formatDeep:
      "PVR is the PowerVR texture container: a 52-byte v3 header followed by GPU-ready block-compressed pixels (PVRTC, ETC2, or ASTC). Block compression is why .pvr files are tiny for their resolution — 4 bits per pixel for PVRTC4 — and why decoding is deterministic: the same input always yields the same pixels. PNG is the opposite philosophy: lossless, verbose, readable everywhere. Mobile pipelines standardized on PVR during the iOS PowerVR era; today the format mostly appears in game archives, engine caches, and mod projects that need those textures as ordinary images.",
    batchLarge:
      "Texture sets are the real workload — a character ships as diffuse, normal, and specular PVRs with mip chains. Desktop batch mode converts an entire folder in one queue and exports each file's largest mipmap as a PNG named after its source, which is exactly what asset recovery and inspection work needs.",
    methods: [
      {
        name: "nichefiletools online converter",
        bestFor: "Single textures up to 100 MB",
        price: "Free",
        limit: "100 MB per file (PC) / 30 MB (mobile)",
        notes: "Reads the PVR v3 header, picks the right decoder automatically, and outputs the largest mipmap as PNG — no upload, so commercial assets stay private.",
      },
      {
        name: "nichefiletools desktop app",
        bestFor: "Batch texture sets",
        price: "Free (hourly unlock code)",
        limit: "No file-size limit",
        notes: "A character asset is rarely one file — diffuse, normal, and specular PVRs come in sets. Batch mode converts a whole folder in one queue.",
      },
      {
        name: "PVRTexTool (Imagination Technologies)",
        bestFor: "Texture pipeline work",
        price: "Free with registration",
        limit: "Windows GUI / CLI",
        notes: "The official PowerVR tool both encodes and decodes PVR. Overkill for a quick look, but the right choice if you're rebuilding a compression pipeline.",
      },
    ],
    desktopSteps: [
      "Download and launch the free nichefiletools desktop app.",
      "Pick PVR to PNG from the tool list in the sidebar.",
      "Select your .pvr file (or a whole folder in batch mode) and choose the output location.",
      "Click Convert — each texture decodes to a PNG named after its source file.",
    ],
    troubleshooting: [
      {
        problem: "The file isn't recognized at all",
        fix: "Check the header in a hex editor: PVR v3 files start with the bytes 'PVR!' (0x50 0x56 0x52 0x21). Old v2 files, or textures that were actually renamed DDS/KTX files, use different headers.",
      },
      {
        problem: "A compressed texture is refused",
        fix: "PVRTC/ETC/ASTC data is outside the current decoder's scope — the tool reports a data-size mismatch instead of guessing. Re-export the texture uncompressed from your engine (Unity/Unreal texture settings), or decode compressed files with PVRTexTool.",
      },
      {
        problem: "The output looks blurrier than expected",
        fix: "By default the largest mipmap is exported. If a tool in your pipeline packaged many mip levels, smaller ones are lower resolution by design — inspect the header's mipmap count.",
      },
    ],
    conclusion:
      "Single texture? The browser decoder answers immediately. Recovering a full character set is a desktop batch job, and one hourly code unlocks the entire queue.",
    updated: "2026-09-01",
    faqs: [
      {
        question: "How do I tell which PVR variant I have before uploading?",
        answer:
          "Upload it — rejection is instant and names the problem. Or check the pixel-format field at byte 12 of the PVR v3 header in a hex editor: low values are uncompressed layouts, while PVRTC/ETC/ASTC codes mean the file needs a re-export or PVRTexTool.",
      },
      {
        question: "Will the mipmap chain survive?",
        answer:
          "Only the largest level exports — the full-resolution image, which is what inspection and asset recovery almost always need. The smaller mip levels are downscaled copies of it by definition.",
      },
    ],
    screenshots: [
      { file: "pvr-to-png-online-converter-upload.webp", alt: "Uploading a single PVR texture to the online PVR to PNG converter" },
      { file: "pvr-to-png-desktop-app-launch.webp", alt: "Launching the nichefiletools desktop app for PVR to PNG batch conversion", step: 1 },
      { file: "pvr-to-png-tool-selected.webp", alt: "PVR to PNG highlighted in the desktop converter list", step: 2 },
      { file: "pvr-to-png-texture-folder-batch.webp", alt: "A folder of game PVR textures queued in the desktop batch mode", step: 3 },
      { file: "pvr-to-png-png-output.webp", alt: "Decoded PNG textures named after their source PVR files", step: 4 },
    ],
  },
  {
    slug: "raw-to-iso",
    title: "How to Convert RAW to ISO — Desktop Guide 2026",
    metaDescription:
      "RAW disc images need desktop software — no online tool can process 2352-byte sector images. Free app steps, Mode 1/Mode 2 explained, common fixes.",
    quickAnswer:
      "This conversion cannot happen in a browser: RAW images span hundreds of MB to 50 GB, far beyond browser memory limits, and need byte-exact sector I/O. The free nichefiletools desktop app extracts the 2048-byte user data from every 2352-byte sector and writes a standard ISO 9660 image.",
    formatDeep:
      "A RAW disc image is a sector-for-sector dump of a CD: every 2352-byte sector including sync patterns, headers, and EDC/ECC error-correction bytes. ISO 9660 keeps only the 2048-byte user-data area of each Mode 1 sector — the part an operating system actually mounts. The formats come from different worlds: RAW is what disc drives and dumping hardware produce (preserving copy protection and subchannel data), while ISO is the interchange format emulators, archival tools, and mounting software expect. Converting between them is lossless for user data and intentionally discards the ~13% of the image that is transport overhead.",
    batchLarge:
      "Disc archives are multi-GB by nature, which is exactly why this tool is desktop-only. Native streaming I/O processes a 4 GB image in seconds on an SSD, and batch mode walks a folder of dumps unattended — no browser memory ceiling, no upload, no per-file caps.",
    methods: [
      {
        name: "nichefiletools desktop app",
        bestFor: "Everything — this is the recommended path",
        price: "Free (hourly unlock code)",
        limit: "No file-size limit",
        notes: "Auto-detects Mode 1 and Mode 2 sectors, handles mixed-mode discs, processes .raw/.bin/.img variants, and verifies output integrity.",
      },
      {
        name: "Why no online converter exists",
        bestFor: "Understanding the limit",
        price: "—",
        limit: "Browser ArrayBuffer caps (~4 GB Chrome, less elsewhere)",
        notes: "Any site claiming to convert 10 GB RAW images in a browser tab would first have to upload the entire image to its server — a slow, privacy-destroying process. Native desktop I/O is the honest solution.",
      },
      {
        name: "Manual sector extraction (advanced)",
        bestFor: "Scripting one-off jobs",
        price: "Free",
        limit: "You implement mode detection yourself",
        notes: "Every Mode 1 sector keeps its 2048 user bytes at offset 16, so a short script can slice them out. You lose automatic mode detection, mixed-mode handling, and verification — the desktop app exists so you don't have to maintain that code.",
      },
    ],
    desktopSteps: [
      "Download and launch the free nichefiletools desktop app.",
      "Pick RAW to ISO from the tool list in the sidebar.",
      "Select your .raw / .bin / .img file and choose the output .iso path.",
      "Click Convert — a progress bar tracks sector processing in real time; a multi-GB image finishes in seconds on an SSD.",
    ],
    desktopNote:
      "Each desktop tool unlocks with a free hourly code from its page here — try it on one disc image, then let batch mode walk the rest of your archive. Codes refresh free every hour on the same page.",
    troubleshooting: [
      {
        problem: "A converted game image doesn't boot in an emulator",
        fix: "Discs with subchannel data (many PS1 titles) or non-standard copy schemes store information outside the user-data region. ISO keeps only the 2048-byte user area, so keep the original RAW image for emulation and use the ISO for mounting and archiving.",
      },
      {
        problem: "The ISO is smaller than the source RAW file",
        fix: "Expected behavior. Mode 1 conversion discards sync, header, EDC, and ECC bytes — about 13% of the file. Mode 2 Form 1 shrinks slightly less. The user data itself is untouched.",
      },
      {
        problem: "Mixed-mode disc (data + audio tracks)",
        fix: "The app analyzes each sector and applies the right extraction per track. Audio tracks don't survive into ISO by definition — ISO 9660 covers data only.",
      },
    ],
    conclusion:
      "No browser will ever do this one — the desktop app is the whole workflow. Unlock it with the hour's code from the tool page and point the batch queue at your dump folder; the ISOs write themselves while you're elsewhere.",
    updated: "2026-09-01",
    faqs: [
      {
        question: "Is RAW to ISO lossless?",
        answer:
          "For user data, yes — the 2048-byte payload of every sector is copied exactly. The ~13% that disappears is sync, header, EDC, and ECC transport overhead that ISO 9660 never stores. Keep the original RAW if you need subchannel or copy-protection data.",
      },
      {
        question: "Can I go the other way, ISO back to RAW?",
        answer:
          "Not with this tool — reconstructing sync and error-correction bytes is synthesis, a different job than extraction. Burning software writes those fields itself when you burn an ISO to a physical disc.",
      },
    ],
    screenshots: [
      { file: "raw-to-iso-desktop-tool-open.webp", alt: "RAW to ISO tool open in the nichefiletools desktop app", step: 2 },
      { file: "raw-to-iso-disc-image-select.webp", alt: "Selecting a .raw disc image for RAW to ISO conversion", step: 3 },
      { file: "raw-to-iso-sector-progress.webp", alt: "Sector-by-sector RAW to ISO progress bar with real-time estimate", step: 4 },
      { file: "raw-to-iso-iso-output-mounted.webp", alt: "The converted ISO mounted as a virtual drive" },
      { file: "raw-to-iso-batch-archive-folder.webp", alt: "A folder of disc dumps queued in the desktop batch mode" },
    ],
  },
  {
    slug: "blend-to-glb",
    title: "How to Convert BLEND to GLB — Free 2026 Guide",
    metaDescription:
      "Convert Blender .blend to glTF GLB for the web: the free desktop app for big scenes and batches, or Blender's own exporter. Steps and quality fixes.",
    quickAnswer:
      "Two reliable routes: the free desktop app (no size limit, batch queues, powered by Blender's own runtime) or — if Blender is already installed — its built-in File → Export → glTF 2.0, the reference implementation. There is no in-browser converter: BLEND's DNA structure only parses reliably through Blender's API.",
    formatDeep:
      "A .blend file is Blender's save format: a DNA-structured database of every data-block in the session — meshes, modifiers, node trees, even undo history. GLB is the binary glTF 2.0 container, the de facto 3D format of the web: PBR materials, skeletal animation, and compressed geometry in one file that three.js, Babylon.js, and AR runtimes load natively. The conversion is a projection, not a mirror — parametric modifiers and procedural nodes are evaluated and baked, because glTF has no concept of them. It's the standard handoff from DCC tools to real-time renderers.",
    batchLarge:
      "Scene libraries and product catalogs are batch jobs: the desktop app drives Blender's Python API headless, so a folder of .blend files exports to GLB in one queue with identical settings. Run File → Clean Up → Purge inside Blender first if the files carry years of orphaned data-blocks — old project files often ship far heavier than they need to be.",
    methods: [
      {
        name: "nichefiletools desktop app",
        bestFor: "Large scenes, batch exports, no Blender UI needed",
        price: "Free (hourly unlock code)",
        limit: "No file-size limit",
        notes: "Drives Blender's Python API natively, mapping meshes, UVs, Principled BSDF materials, and transform animations to glTF 2.0 — headless and in batch queues.",
      },
      {
        name: "Blender native exporter",
        bestFor: "Anyone with Blender installed",
        price: "Free, open source",
        limit: "Requires Blender",
        notes: "File → Export → glTF 2.0 inside Blender. It's the most complete path — shape keys, armatures, and custom properties included — and always matches your Blender version.",
      },
      {
        name: "Why there is no online converter",
        bestFor: "Understanding the limit",
        price: "—",
        limit: "BLEND parsing needs Blender's runtime",
        notes: "A .blend is a DNA-structured database that only Blender's own API reads reliably; the desktop app bundles that runtime. A browser tab claiming instant BLEND conversion is really just hoping you never open the file.",
      },
    ],
    desktopSteps: [
      "Download and launch the free nichefiletools desktop app.",
      "Pick BLEND to GLB from the tool list in the sidebar.",
      "Select your .blend file and choose the output .glb path.",
      "Click Convert — parsing and serialization can take from seconds (simple props) to a minute (full scenes); progress is shown per stage.",
    ],
    troubleshooting: [
      {
        problem: "Materials look different in the GLB viewer",
        fix: "glTF uses the PBR metallic-roughness model; Blender's Principled BSDF is close but not identical, and clearcoat or transmission have no standard glTF equivalent. Also compare like with like — Eevee's realtime look never matches a PBR viewer exactly.",
      },
      {
        problem: "Procedural textures are missing",
        fix: "Noise, Voronoi, and other procedural nodes don't exist in glTF. Bake them to image maps first (Blender: bake to image, then reference the image texture) before converting.",
      },
      {
        problem: "A huge scene exhausts memory",
        fix: "Full production scenes can be heavy even natively. Close other apps, and in Blender run File → Clean Up → Purge to remove unused data-blocks before exporting — project files often carry years of orphaned data.",
      },
    ],
    conclusion:
      "Export from Blender when it's already open — it's the reference path. Use the desktop app for batch queues and headless conversion of big scenes; there is no honest browser shortcut for BLEND.",
    updated: "2026-09-01",
    faqs: [
      {
        question: "Why is there no online BLEND to GLB converter?",
        answer:
          "A .blend file is a DNA-structured database that only Blender's own runtime can parse reliably — meshes, modifiers, node trees, even undo history are stored as Blender-internal data-blocks. Any browser tool claiming instant BLEND conversion is hoping you never open the file; the desktop app bundles Blender's Python API to do it for real.",
      },
      {
        question: "What's the difference between GLB and glTF?",
        answer:
          "glTF is the open 3D standard; GLB is its binary container — a single self-contained .glb file with geometry, animations, and PBR materials packed together, versus .gltf plus separate .bin and texture files. GLB is what three.js, Babylon.js, and AR runtimes load natively, which is why it's the web handoff format.",
      },
    ],
    screenshots: [
      { file: "blend-to-glb-desktop-app-launch.webp", alt: "Launching the free nichefiletools desktop app that bundles Blender's runtime", step: 1 },
      { file: "blend-to-glb-tool-list.webp", alt: "Picking BLEND to GLB from the desktop app tool list", step: 2 },
      { file: "blend-to-glb-file-select.webp", alt: "Selecting a .blend scene file and output .glb path", step: 3 },
      { file: "blend-to-glb-converting-progress.webp", alt: "Per-stage progress while Blender's Python API evaluates and serializes the scene", step: 4 },
      { file: "blend-to-glb-pbr-materials.webp", alt: "Principled BSDF materials mapped to the glTF PBR metallic-roughness model in the GLB output" },
    ],
  },

  {
    slug: "raw-to-wav",
    title: "How to Convert RAW to WAV — Free 2026 Guide",
    metaDescription:
      "Wrap headerless PCM/RAW audio in a WAV header: free online tool, Audacity's RAW import, or ffmpeg. Parameter guide and fixes for static noise.",
    quickAnswer:
      "A RAW audio file is just PCM samples with no header, so 'converting' it means declaring the correct sample rate, bit depth, and channels once and letting a tool write the 44-byte WAV header for you. If you don't know the parameters, start with 44100 Hz / 16-bit / stereo — that covers most consumer recordings.",
    formatDeep:
      "RAW audio is PCM with no container: a bare stream of amplitude samples whose meaning depends entirely on three unstated parameters — sample rate, bit depth, and channel count. WAV is the RIFF container that states those parameters in a 44-byte header and wraps the same bytes. Nothing is decoded or re-encoded in the conversion; it is a lossless declaration of metadata the file was missing. Raw PCM appears wherever systems write audio without negotiation: DSP dumps, telephony recorders, oscilloscope captures, and recovered files whose headers were truncated.",
    batchLarge:
      "The three parameters are usually identical across a whole capture session, so batches are mechanical: ffmpeg scripted over a directory wraps thousands of files unattended. The online tool covers one-off files up to 500 MB; scripted or desktop batch work handles the rest.",
    methods: [
      {
        name: "nichefiletools online converter",
        bestFor: "Instant wrapping, up to 500 MB",
        price: "Free",
        limit: "500 MB (PC) / 100 MB (mobile)",
        notes: "Pure I/O operation — pick sample rate, bit depth, and channels in the options panel and the header is written locally in your browser. Nothing is uploaded, so private recordings stay private.",
      },
      {
        name: "Audacity (Import RAW)",
        bestFor: "Interactive parameter guessing",
        price: "Free, open source",
        limit: "Desktop app",
        notes: "File → Import → Raw Audio lets you audition parameters before committing — you can hear whether 8000 Hz mono sounds right, then export as WAV. Slower for many files, but great when you're truly guessing.",
      },
      {
        name: "ffmpeg CLI",
        bestFor: "Scripted batches",
        price: "Free, open source",
        limit: "Command line",
        notes: "ffmpeg -f s16le -ar 44100 -ac 2 -i input.raw output.wav does exactly what the online tool does, and can loop over thousands of files in a shell script.",
      },
    ],
    stepsTitle: "Step-by-Step: Convert RAW to WAV Online",
    desktopSteps: [
      "Gather your .raw / .pcm / .bin audio stream (DSP dump, recorder export, or recovered from a broken WAV).",
      "Determine its parameters: source device docs, a hex editor, or trial and error starting from 44100 Hz / 16-bit / stereo.",
      "Open the RAW to WAV converter, drop the file in, and set sample rate, bit depth, and channels in the options panel.",
      "Click Convert — the header is written and the bytes copied locally; then download the .wav and play it to verify.",
      "If the audio sounds pitched wrong or like static, change one parameter at a time and convert again — the operation is instant and lossless every time.",
    ],
    troubleshooting: [
      {
        problem: "The WAV plays as loud static",
        fix: "Classic byte-order or bit-depth mismatch. Big-endian data read as little-endian produces violent noise; 8-bit data declared as 16-bit gives near-silence. Try the other bit depth first, then check whether the source device documented endianness.",
      },
      {
        problem: "The audio is sped up or slowed down",
        fix: "The sample rate is wrong — the pitch shift is directly proportional to the ratio between declared and true rates. Telephony sources are usually 8000 Hz, VoIP 16000 Hz, video gear 48000 Hz.",
      },
      {
        problem: "Voices are garbled and spatially scrambled",
        fix: "Channel count mismatch: stereo data read as mono interleaves the channels into one stream. Toggle between Mono and Stereo in the options.",
      },
    ],
    conclusion:
      "Name the three parameters once and the wrap is instant and lossless. When you're still guessing them, Audacity's audition loop beats everything; once you know them, ffmpeg owns anything scripted.",
    updated: "2026-09-01",
    faqs: [
      {
        question: "My RAW file plays at half or double speed — which parameter is wrong?",
        answer:
          "Sample rate. Pitch shifts by the ratio of declared to true rate: a 22050 Hz stream declared as 44100 plays twice as fast. Telephony sources are typically 8000 or 16000 Hz; video gear, 48000 Hz.",
      },
      {
        question: "Can the parameters be detected automatically?",
        answer:
          "Not reliably — a headerless file carries no metadata by definition. Audacity's Import RAW preview is the fastest manual method: speech cadence and onsets tell you when the guess is close.",
      },
    ],
    screenshots: [
      { file: "raw-to-wav-hex-editor-parameters.webp", alt: "Checking a RAW audio stream's byte layout in a hex editor", step: 2 },
      { file: "raw-to-wav-audio-drop-zone.webp", alt: "Dropping a headerless RAW audio stream into the online converter", step: 3 },
      { file: "raw-to-wav-parameter-options.webp", alt: "Sample rate, bit depth, and channels options in the RAW to WAV converter", step: 3 },
      { file: "raw-to-wav-convert-button.webp", alt: "The Convert button writing the WAV header locally in the browser", step: 4 },
      { file: "raw-to-wav-wav-playing.webp", alt: "The wrapped WAV playing in a standard media player", step: 5 },
    ],
  },

  {
    slug: "glb-to-gltf",
    title: "How to Convert GLB to GLTF — Free 2026 Guide",
    metaDescription:
      "Unpack GLB into .gltf JSON: free online converter, Microsoft gltf-pipeline CLI, or Blender. What changes (and what doesn't) in the output.",
    quickAnswer:
      "GLB and .gltf hold identical data in different containers, so unpacking is lossless and instant. The online converter outputs a self-contained .gltf (binary buffer embedded as a data URI); if you need the classic .gltf + .bin + textures file set, use Microsoft's gltf-pipeline CLI on it.",
    formatDeep:
      "GLB and .gltf are the same glTF 2.0 asset in two containers: GLB packs the JSON document plus binary buffers into one file with a 12-byte header and chunk table, while .gltf is the JSON alone, referencing buffers by URI. The data model — nodes, meshes, materials, animations — is byte-identical between them, so the conversion is a repack, never a reinterpretation. Pipelines that inspect, diff, or hand-edit scene graphs prefer .gltf because JSON is text; delivery pipelines prefer GLB because one file can't have broken relative paths.",
    batchLarge:
      "Asset QA passes are scriptable: run Microsoft's gltf-pipeline over a directory of GLBs to emit .gltf + .bin pairs and validate each in the same pass, optionally chaining Draco compression for web delivery. The online tool handles one-off inspection; automation belongs to the CLI.",
    methods: [
      {
        name: "nichefiletools online converter",
        bestFor: "One click, up to 200 MB",
        price: "Free",
        limit: "200 MB (PC) / 50 MB (mobile)",
        notes: "Parses the GLB header and chunks in your browser and hands you a text-editable .gltf with the buffer embedded — single file, loads anywhere the GLB did.",
      },
      {
        name: "gltf-pipeline (Microsoft CLI)",
        bestFor: "Separate .bin/.gltf output, automation",
        price: "Free, open source (Node.js)",
        limit: "Command line",
        notes: "npx gltf-pipeline -i model.glb -o model.gltf --separate produces the classic multi-file layout and can re-optimize or Draco-compress in the same pass.",
      },
      {
        name: "Blender",
        bestFor: "Round-tripping through an editor",
        price: "Free, open source",
        limit: "Desktop app",
        notes: "Import the GLB, then File → Export → glTF 2.0 with 'JSON + separate .bin' format. Heavier than needed for a straight conversion, but convenient if you're editing anyway.",
      },
    ],
    stepsTitle: "Step-by-Step: Convert GLB to GLTF Online",
    desktopSteps: [
      "Get the .glb file — exported from Blender, downloaded from Sketchfab, or produced by any glTF 2.0 pipeline.",
      "Open the GLB to GLTF converter and drop the file in (up to 200 MB on desktop).",
      "Click Convert — the header and chunks are parsed and the JSON document extracted, all locally in the browser.",
      "Download the .gltf and open it in a text editor: the scene graph is now readable, with buffers[0].uri as an embedded data URI.",
      "Load it in Three.js, Babylon.js, or a glTF viewer to confirm it behaves exactly like the original GLB.",
    ],
    troubleshooting: [
      {
        problem: "'Not a valid GLB file' error",
        fix: "The first four bytes must be 67 6C 54 46 ('glTF'). A JSON file renamed to .glb doesn't need converting — it's already a .gltf; a version field of 1 means glTF 1.0 binary, whose chunk layout differs and isn't supported.",
      },
      {
        problem: "The .gltf is ~33% bigger than the GLB",
        fix: "Expected: base64 encodes 3 bytes as 4. The JSON adds only formatting. If size matters more than editability, keep the GLB; on the wire, gzip recovers most of the overhead.",
      },
      {
        problem: "Textures are missing in the output",
        fix: "GLB textures live in bufferViews pointing into the binary chunk — they're preserved inside the embedded buffer automatically. If a viewer can't handle data-URI buffers, run gltf-pipeline with --separate to get standalone files.",
      },
      {
        problem: "A viewer warns about Draco compression",
        fix: "The original GLB used KHR_mesh_draco_compression, which passes through untouched — your runtime needs a Draco decoder (Three.js: DRACOLoader). That's a property of the source model, not the conversion.",
      },
    ],
    conclusion:
      "For a quick, editable .gltf, the online converter is the whole job. Want the multi-file layout or optimization? Feed the output through gltf-pipeline in one command.",
    updated: "2026-09-01",
    faqs: [
      {
        question: "Is the converted .gltf still valid glTF 2.0?",
        answer:
          "Yes — same spec, same data, different container. Validators, engines, and viewers treat it identically; the only difference is buffers[0].uri pointing at embedded base64 instead of a sibling .bin file.",
      },
      {
        question: "Can I convert back, .gltf to GLB?",
        answer:
          "Yes, losslessly in both directions — run Microsoft's gltf-pipeline with -i model.gltf -o model.glb on the output, or re-import into Blender and export GLB.",
      },
    ],
    screenshots: [
      { file: "glb-to-gltf-drop-zone.webp", alt: "A .glb model file dropped into the online GLB to GLTF converter", step: 2 },
      { file: "glb-to-gltf-converting-browser.webp", alt: "GLB header and chunks being parsed locally in the browser", step: 3 },
      { file: "glb-to-gltf-json-editor.webp", alt: "The converted .gltf JSON opened in a text editor showing the scene graph", step: 4 },
      { file: "glb-to-gltf-base64-buffer.webp", alt: "The embedded base64 data-URI buffer inside the converted .gltf", step: 4 },
      { file: "glb-to-gltf-viewer-verify.webp", alt: "The .gltf loading in a glTF viewer, identical to the original GLB", step: 5 },
    ],
  },

  {
    slug: "eot-to-ttf",
    title: "How to Convert EOT to TTF — Free 2026 Guide",
    metaDescription:
      "Extract TTF/OTF from legacy IE .eot web fonts: free online tool, why subsetting loses glyphs, MicroType limits, and licensing notes.",
    quickAnswer:
      "An EOT file is a wrapper around an ordinary sfnt font, so conversion is extraction, not transcoding — instant and lossless. The one real gotcha is subsetting: many EOTs contain only the glyphs the old page used, so the recovered TTF may have fewer characters than the retail font.",
    formatDeep:
      "EOT (Embedded OpenType) is Microsoft's 1997 answer to web fonts: a wrapper bundling an sfnt font with subsetting, root-string domain binding, and optional MicroType compression — built for IE 4+ and dead in practice since 2016. Inside nearly every EOT is an ordinary TTF or OTF, byte-for-byte, which is why conversion is extraction rather than transcoding. The practical surprise is subsetting: many EOTs carry only the glyphs the old page rendered, not the full retail character set. The format survives in legacy site audits, web-archive recovery, and font-licensing forensics.",
    batchLarge:
      "Legacy site recovery usually means many fonts, not one: pull every .eot referenced by an old @font-face cascade, recover the TTFs, then let fonttools' scripting (pyftsubset, woff2 compress) turn the whole batch into a modern WOFF2 stack in a single pass. The desktop app runs the same extraction over directories without the 10 MB web cap.",
    methods: [
      {
        name: "nichefiletools online converter",
        bestFor: "Instant extraction, no install",
        price: "Free",
        limit: "10 MB (PC) / 5 MB (mobile)",
        notes: "Validates the EOT header, locates the embedded sfnt signature, and saves the payload with the correct extension (.ttf or .otf). Runs in your browser — licensed fonts never touch a server.",
      },
      {
        name: "fonttools (Python)",
        bestFor: "Chaining to WOFF2 or subsetting",
        price: "Free, open source",
        limit: "Command line",
        notes: "After recovering the TTF, fonttools takes it the rest of the way — pyftsubset to your charset, fonttools ttLib.woff2 compress for a modern @font-face stack.",
      },
      {
        name: "Manual hex-editor extraction",
        bestFor: "Forensic cases",
        price: "Free",
        limit: "Advanced",
        notes: "Search the file for the bytes 00 01 00 00 (TrueType) or 'OTTO' (OpenType) and cut from there to the length declared at offset 4 — exactly what the tool automates.",
      },
    ],
    stepsTitle: "Step-by-Step: Convert EOT to TTF Online",
    desktopSteps: [
      "Locate the .eot — it's the URL in the src: of an old @font-face rule, retrievable from the live site or a web-archive snapshot.",
      "Open the EOT to TTF converter and drop the file in (≤10 MB on desktop).",
      "Click Convert — the header magic (0x504C) is validated, the name-string region is scanned, and the font data extracted verbatim.",
      "Download the output: the extension is chosen automatically from the sfnt version (TrueType → .ttf, CFF 'OTTO' → .otf).",
      "Install the font or embed it, and check that the glyphs you need are present — see subsetting below.",
    ],
    troubleshooting: [
      {
        problem: "Recovered font is missing glyphs (e.g., no accented characters)",
        fix: "The EOT was subset to the old page's character set — those glyphs were never in the file. For a complete font you need the original from your licensed source.",
      },
      {
        problem: "Error: EOT uses MicroType compression",
        fix: "Flag bit 0x4 marks the rare MicroType/MTX compression produced by Microsoft WEFT. No open decoder fully implements it; the practical routes are the original font file or an IE-era machine that can install and re-export it.",
      },
      {
        problem: "Error: not a valid EOT file",
        fix: "If the first bytes aren't an EOT header with magic 0x504C, the file may already be a TTF/OTF/WOFF renamed to .eot — check for the 00 01 00 00 / 'OTTO' / 'wOFF' signatures; none of those need this conversion.",
      },
    ],
    conclusion:
      "For any uncompressed EOT — which is nearly all of them — extraction is instant and exact. Recover the TTF online, then subset and compress to WOFF2 if the goal is a modern @font-face.",
    updated: "2026-09-01",
    faqs: [
      {
        question: "My recovered TTF is missing accented characters — why?",
        answer:
          "The EOT was subset to just the glyphs the old page rendered, so those characters were never in the file. Subset EOTs are common in legacy IE web fonts; for the full character set you need the original retail font from your licensed source, not the web-delivered EOT.",
      },
      {
        question: "How does EOT relate to WOFF and WOFF2?",
        answer:
          "EOT (1997) was Microsoft's IE-only web font wrapper; WOFF (2010) and WOFF2 (2018) are the cross-browser successors. Inside nearly every EOT is an ordinary sfnt font, so the recovery path is EOT to raw TTF/OTF, then optionally compress to WOFF2 for a modern @font-face stack.",
      },
    ],
    screenshots: [
      { file: "eot-to-ttf-upload.webp", alt: "Dropping a legacy .eot web font into the online converter's drop zone", step: 2 },
      { file: "eot-to-ttf-extraction.webp", alt: "The tool validating the EOT header and locating the embedded sfnt signature", step: 3 },
      { file: "eot-to-ttf-output-ttf-otf.webp", alt: "Recovered font output with extension auto-chosen from the sfnt version", step: 4 },
      { file: "eot-to-ttf-fontsource-recovery.webp", alt: "Pulling .eot URLs from an old @font-face cascade for batch recovery" },
      { file: "eot-to-ttf-glyph-subset.webp", alt: "Comparing a subset EOT's glyph coverage against the full retail character set", step: 5 },
    ],
  },

  {
    slug: "opf-to-epub",
    title: "How to Convert OPF to EPUB — Free 2026 Guide",
    metaDescription:
      "Package an OPF manifest and its resources into a valid EPUB 3: free online packager, Sigil, or Calibre. OCF ZIP rules and path pitfalls explained.",
    quickAnswer:
      "An OPF is the manifest of an EPUB, not the book itself — so 'conversion' is packaging: the OPF plus every file its manifest references go into a ZIP that follows EPUB's OCF rules (mimetype first, stored). Zip your OPF folder, drop it in, and download a valid .epub.",
    formatDeep:
      "The OPF is an EPUB's manifest: an XML file declaring the book's metadata (dc:title, dc:identifier), its resource list (manifest), and its reading order (spine). It is one of three required pieces of an EPUB — alongside mimetype and META-INF/container.xml — inside an OCF ZIP with an unusual rule: mimetype must be the first entry and stored uncompressed. 'Converting' OPF to EPUB is therefore packaging: gathering everything the manifest references and writing a ZIP that follows those rules, which is why a bare .opf can't become a complete book without its resources.",
    batchLarge:
      "Back-catalog repackaging is the classic batch job: a folder of unzipped EPUB sources (OPF + XHTML + assets) re-packages into validated .epub files in one queue, with the desktop app verifying every manifest href resolves case-sensitively. Run epubcheck over the output batch afterwards — it catches path and spine issues no converter can silently fix.",
    methods: [
      {
        name: "nichefiletools online packager",
        bestFor: "One upload, valid OCF output",
        price: "Free",
        limit: "50 MB (PC) / 20 MB (mobile)",
        notes: "Reads your ZIP, verifies every manifest href exists (case-sensitively), writes mimetype-first + container.xml, and generates an EPUB 3 nav document if the OPF lacks one — all locally in the browser.",
      },
      {
        name: "Sigil",
        bestFor: "Fixing content while packaging",
        price: "Free, open source",
        limit: "Desktop app",
        notes: "Sigil opens loose EPUB source (or lets you assemble it) and saves a proper .epub. If your XHTML needs repair anyway, do both jobs here.",
      },
      {
        name: "Calibre",
        bestFor: "Rebuilding from other formats",
        price: "Free, open source",
        limit: "Desktop app",
        notes: "If the OPF is only one part of a messy source, importing into Calibre and converting to EPUB rebuilds a normalized book — at the cost of Calibre rewriting the markup.",
      },
    ],
    stepsTitle: "Step-by-Step: Package OPF into EPUB Online",
    desktopSteps: [
      "Collect the OPF and every file it references — XHTML chapters, CSS, images, fonts — keeping the exact relative paths.",
      "Zip the folder with any OS tool, preserving structure (the OPF's hrefs must resolve inside the archive).",
      "Open the OPF to EPUB converter and drop the .zip in (a bare .opf works too when the manifest is all you have).",
      "Click Convert — manifest paths are verified against the archive, then the OCF container is assembled in your browser.",
      "Download the .epub, open it in a reader, and optionally validate with epubcheck.",
    ],
    troubleshooting: [
      {
        problem: "Error listing missing files",
        fix: "Every manifest href must exist in the ZIP at the exact path and letter-case. Copy the missing files in, fix the hrefs, or rename the archive entries so they agree — Linux-based validators are case-sensitive about this too.",
      },
      {
        problem: "The EPUB opens but images don't show",
        fix: "Almost always a case mismatch (manifest says images/Cover.png, archive has images/cover.png). Fix the case on one side and repackage.",
      },
      {
        problem: "epubcheck reports missing nav",
        fix: "The tool auto-generates nav.xhtml when the OPF has no item with properties=\"nav\" — but if your OPF declares one pointing at a file you didn't include, include it, or remove the dead declaration and let the generator supply one.",
      },
      {
        problem: "Reader shows chapters out of order",
        fix: "Reading order comes from the OPF's <spine> itemref sequence, not file names. Edit the spine to the intended order and repackage.",
      },
    ],
    conclusion:
      "Zip, drop, download — that's the online path for a well-formed source. When the content itself needs surgery, do the work in Sigil and let it write the EPUB.",
    updated: "2026-09-01",
    faqs: [
      {
        question: "Do I really have to ZIP the folder first?",
        answer:
          "Yes — browsers can't hand a directory to a page. Any OS-level compress works; the tool unpacks it, verifies every manifest href, and repackages under OCF rules, so your ZIP's own compression settings don't matter.",
      },
      {
        question: "Is the output EPUB 2 or EPUB 3?",
        answer:
          "EPUB 3 — the packager writes the OCF container plus a nav document generated from the spine when your OPF lacks one. Every current reader supports EPUB 3.",
      },
    ],
    screenshots: [
      { file: "opf-to-epub-source-folder.webp", alt: "An EPUB source folder: content.opf, XHTML chapters, CSS, and images", step: 1 },
      { file: "opf-to-epub-zip-folder.webp", alt: "Zipping the OPF source folder while preserving relative paths", step: 2 },
      { file: "opf-to-epub-upload-zip.webp", alt: "The ZIP dropped into the online OPF to EPUB packager", step: 3 },
      { file: "opf-to-epub-manifest-check.webp", alt: "Manifest href verification against the archive during OPUB packaging", step: 4 },
      { file: "opf-to-epub-epub-reader.webp", alt: "The finished EPUB open in a reader with correct chapter order", step: 5 },
    ],
  },

  {
    slug: "sav-to-csv",
    title: "How to Convert SAV to CSV — Free 2026 Guide",
    metaDescription:
      "Export SPSS .sav/.zsav to CSV: free online converter, SPSS itself, or R/pspp. What's lost (value labels), Excel encoding fixes, limits explained.",
    quickAnswer:
      "Yes — SPSS data exports to CSV completely, including compressed .zsav files. Two things to know upfront: value labels (1 = Male / 2 = Female) don't exist in CSV, so you get the codes; and the output needs a UTF-8 BOM or Excel will mangle international characters — the online tool writes it for you.",
    formatDeep:
      "SAV is SPSS Statistics' native format: a binary file pairing a variable dictionary (names, types, value labels, missing-value sentinels) with a data matrix that may be uncompressed, byte-compressed, or zlib-compressed (.zsav). CSV is the universal tabular interchange — but a flat one: it carries values, not meaning, so value labels, variable metadata, and SPSS's missing-value semantics don't survive export (the codes do). Researchers standardize on SAV because the dictionary is half the dataset; the world outside SPSS speaks CSV.",
    batchLarge:
      "Survey archives run to hundreds of megabytes, and .zsav compression is the norm — the converter detects all three layouts per file, and desktop batch mode processes a whole repository folder in one queue. For reproducible pipelines, R's haven::read_sav() plus write.csv() does the same job inside scripts, with value labels attachable via the labelled class.",
    methods: [
      {
        name: "nichefiletools online converter",
        bestFor: "No-install export, up to 200 MB",
        price: "Free",
        limit: "200 MB (PC) / 50 MB (mobile)",
        notes: "Parses the SPSS dictionary and data matrix (uncompressed, byte-compressed, and zlib .zsav) entirely in the browser — sensitive research data never leaves the machine. Missing values become empty cells; output carries a UTF-8 BOM.",
      },
      {
        name: "SPSS Statistics",
        bestFor: "Applying value labels before export",
        price: "Licensed",
        limit: "Desktop app",
        notes: "File → Save As → CSV. Better still, run Automatic Recode first so label text lands in the data instead of codes — the one thing raw export can't give you.",
      },
      {
        name: "R / pspp",
        bestFor: "Reproducible pipelines",
        price: "Free, open source",
        limit: "Requires tooling",
        notes: "R: haven::read_sav(\"file.sav\") then write.csv — haven can also attach value labels. pspp converts from the command line with the same dictionary awareness.",
      },
    ],
    stepsTitle: "Step-by-Step: Convert SAV to CSV Online",
    desktopSteps: [
      "Get the .sav (or .zsav) file from SPSS, a colleague, or a data repository.",
      "Open the SAV to CSV converter and drop the file in (≤200 MB on desktop) — compression is detected automatically.",
      "Click Convert; the variable dictionary is parsed and every case decoded locally in your browser.",
      "Download the .csv — it opens in Excel without encoding prompts thanks to the UTF-8 BOM.",
      "Spot-check the header row and a few values against SPSS; missing values appear as empty cells.",
    ],
    troubleshooting: [
      {
        problem: "Excel shows mojibake (Ã©, æ, etc.)",
        fix: "The CSV is UTF-8 with BOM, which Excel honors — if you're seeing garbage, the file was re-saved by another tool in between. Re-download, or use Data → From Text/CSV and pick UTF-8 explicitly.",
      },
      {
        problem: "Dates look like huge numbers",
        fix: "SPSS dates are seconds since 1582-10-14 in a numeric variable. If you need calendar dates, format them in SPSS or R before export, since the CSV carries the underlying number.",
      },
      {
        problem: "String variables longer than 255 characters split into extra columns",
        fix: "SPSS stores very long strings as multiple 8-byte segment records; the converter keeps them as separate columns (a documented limitation). Re-join in pandas by concatenating the segment columns.",
      },
    ],
    conclusion:
      "Every compression variant, zero setup: the browser converter exports the data faithfully. The one thing it can't do is write value labels into cells — run SPSS's Automatic Recode first if the output needs words, not codes.",
    updated: "2026-09-01",
    faqs: [
      {
        question: "Why do value labels disappear in the CSV?",
        answer:
          "CSV stores values, not the SPSS dictionary. '1' survives; 'Male' lives only in the dictionary's value-label record. Run Automatic Recode in SPSS before export if the output needs the words.",
      },
      {
        question: "Is .zsav handled differently from .sav?",
        answer:
          "Only in decompression — once the zlib layer peels off, both decode through the same dictionary and data-matrix parser, and both write identical CSV.",
      },
    ],
    screenshots: [
      { file: "sav-to-csv-spss-export.webp", alt: "A .sav data file exported from SPSS Statistics", step: 1 },
      { file: "sav-to-csv-upload.webp", alt: "The SAV file dropped into the online SAV to CSV converter", step: 2 },
      { file: "sav-to-csv-dictionary-parse.webp", alt: "The SPSS variable dictionary parsed in the browser during SAV to CSV conversion", step: 3 },
      { file: "sav-to-csv-csv-excel.webp", alt: "The exported CSV opening in Excel with correct UTF-8 characters", step: 4 },
      { file: "sav-to-csv-verify-header.webp", alt: "Spot-checking the CSV header row against SPSS variable names", step: 5 },
    ],
  },

  // PFM to TTF — A class
  {
    slug: "pfm-to-ttf",
    title: "How to Convert PFM to TTF — Free 2026 Guide",
    metaDescription:
      "Convert PFM+PFB Type 1 fonts to TTF free: online tool, desktop app, or FontForge. Needs the companion .pfb. Steps, limits, fixes.",
    quickAnswer:
      "Yes — but only with both files. A PFM stores metrics (widths/kerning); the glyph outlines live in the companion .pfb. Upload .pfm and .pfb together to the free online tool (≤10 MB) or use the desktop app for batches; FontForge is the power-user fallback for tricky fonts.",
    formatDeep:
      "PFM and PFB are the two halves of an Adobe Type 1 (PostScript) font: the PFM ('printer font metrics') holds widths, kerning pairs, and character-set info for Windows, while the PFB ('printer font binary') holds the glyph outlines as cubic Bézier curves. TTF stores outlines as quadratic B-splines in an sfnt table structure with Unicode cmap tables. The conversion re-parameterizes every curve — cubic-to-quadratic approximation within a fraction of an em — and rebuilds metrics from the PFM. Adobe declared Type 1 end-of-life in 2023, which is exactly why these migrations are suddenly urgent.",
    batchLarge:
      "Type 1 estates are families, not files — regular, bold, italic, and their companions across decades of jobs. The desktop app batches a whole font directory in one queue; FontForge's Python scripting handles the odd cases that need per-font hand-tuning before conversion.",
    methods: [
      {
        name: "nichefiletools online converter",
        bestFor: "Single fonts, instant result",
        price: "Free",
        limit: "10 MB per file (PC) / 5 MB (mobile)",
        notes: "Runs in your browser — neither file is uploaded. Converts Type 1 cubic outlines to TrueType quadratics and rebuilds the hmtx/Unicode tables.",
      },
      {
        name: "nichefiletools desktop app",
        bestFor: "Font families, batches",
        price: "Free (hourly unlock code)",
        limit: "No file-size limit",
        notes: "Handles whole font directories and large Type 1 families; same curve-conversion engine as the web tool.",
      },
      {
        name: "FontForge (pro)",
        bestFor: "Custom hinting, edge cases",
        price: "Free (open source)",
        limit: "Manual",
        notes: "Open the .pfb (with .pfm metrics), then File → Generate Fonts → TrueType. Best when you need hand-tuned instructions or unusual encodings.",
      },
    ],
    desktopSteps: [
      "Launch the free nichefiletools desktop app — Type 1 conversion calls FontForge's bundled Python, and the app checks for it on first use.",
      "Pick PFM to TTF from the converter list.",
      "Select the .pfm and its companion .pfb (same folder, same prefix).",
      "Click Convert — curves are approximated and the TTF is packaged.",
      "Install the .ttf or reference it in your design tool.",
    ],
    desktopNote:
      "The desktop app is the right choice when you have a whole Type 1 family or very large fonts the 10 MB web cap rejects.",
    troubleshooting: [
      {
        problem: "The tool says I need a .pfb but I only have .pfm",
        fix: "A PFM alone has no glyph shapes, so no TTF can be built. Find the matching .pfb on the original install media, a backup, or the font vendor. They share a filename prefix.",
      },
      {
        problem: "Converted TTF looks slightly different at 6pt",
        fix: "Expected. Cubic→quadratic approximation holds under 0.1% of the em; only sub-8pt hinting behavior may shift a hair. It is not data loss — the outlines are faithful.",
      },
      {
        problem: "Accented/composite glyphs came out wrong",
        fix: "They shouldn't — composite glyphs (à, ö) are rebuilt as TrueType composites and the Unicode map is reconstructed from the PFM. If one is off, the source .pfb may use a non-standard encoding; try FontForge.",
      },
    ],
    conclusion:
      "With both files in hand the pair-upload finishes in seconds and keeps the outlines faithful; save the desktop batch queue and FontForge for whole Type 1 families and hand-tuned hinting.",
    updated: "2026-09-01",
    faqs: [
      {
        question: "Does it matter which file goes in which drop zone?",
        answer:
          "Yes — .pfm goes in the metrics zone, .pfb in the outlines zone (both are labeled). The tool needs the pair: neither file alone contains a complete font.",
      },
      {
        question: "What about .pfa files instead of .pfb?",
        answer:
          "PFA is the ASCII form of the same Type 1 outline data. The desktop app accepts either companion; the web tool's outline zone expects the binary .pfb, so convert a .pfa with t1binary or FontForge first.",
      },
    ],
    screenshots: [
      { file: "pfm-to-ttf-pfm-pfb-pair.webp", alt: "A Type 1 font pair: Arial.pfm metrics and Arial.pfb outlines in one folder", step: 3 },
      { file: "pfm-to-ttf-two-dropzones.webp", alt: "The PFM and PFB drop zones in the online PFM to TTF converter", step: 3 },
      { file: "pfm-to-ttf-converting.webp", alt: "Cubic to quadratic curve conversion running in the browser during PFM to TTF conversion", step: 4 },
      { file: "pfm-to-ttf-ttf-installed.webp", alt: "The generated TTF installed in the Windows font viewer", step: 5 },
      { file: "pfm-to-ttf-desktop-batch-fonts.webp", alt: "A Type 1 font family batch-converting to TTF in the desktop app" },
    ],
  },

  // EXR to PNG — A class
  {
    slug: "exr-to-png",
    title: "How to Convert EXR to PNG — Free HDR Guide 2026",
    metaDescription:
      "Convert OpenEXR HDR to PNG free: online tone-mapping tool, desktop app, or Nuke/Blender. Reinhard vs ACES, exposure tips, fixes.",
    quickAnswer:
      "Yes. An EXR is 32-bit float HDR; a PNG is 8-bit sRGB LDR, so the step is tone mapping. The free online tool maps HDR→LDR (Reinhard or ACES) in your browser — no upload. For 16-bit/TIFF or multi-layer control, use the desktop app or Nuke/Blender.",
    formatDeep:
      "OpenEXR is Industrial Light & Magic's HDR format: floating-point pixels (16-bit 'half' or 32-bit float) in linear light, multiple layers, and per-image compression (PIZ, ZIP, B44). PNG is 8- or 16-bit integer sRGB with a hard ceiling at 1.0 white. Going from EXR to PNG is therefore a creative decision encoded as math — tone mapping (Reinhard, ACES) chooses which luminance range survives. One EXR can yield many legitimate PNGs; VFX and rendering pipelines standardize on EXR precisely because displays are not HDR-linear.",
    batchLarge:
      "Render passes are EXR farms — beauty, depth, normals, and motion vectors per frame, thousands of frames per shot. The desktop app batch-converts directories, exports 16-bit PNG or TIFF for the beauty pass, and can pull individual aux channels out as false-color images, with per-shot exposure settings riding along in the queue.",
    methods: [
      {
        name: "nichefiletools online converter",
        bestFor: "Single images, instant preview",
        price: "Free",
        limit: "200 MB (PC) / 50 MB (mobile)",
        notes: "Decodes scanline EXR with ZIP, RLE, or no compression right in your browser; PIZ/PXR24/B44 and tiled files are flagged for re-export or the desktop app, and frames never leave your machine.",
      },
      {
        name: "nichefiletools desktop app",
        bestFor: "16-bit, TIFF, layer picks",
        price: "Free (hourly unlock code)",
        limit: "No file-size limit",
        notes: "Exports 16-bit PNG or TIFF (full HDR) and can select specific aux channels as false-color PNGs.",
      },
      {
        name: "Blender / Nuke (pro)",
        bestFor: "Studio pipelines",
        price: "Free / paid",
        limit: "Manual",
        notes: "Compositing nodes give the most control over exposure, color spaces, and layer recombination.",
      },
    ],
    desktopSteps: [
      "Launch the free nichefiletools desktop app — the EXR decoder ships inside it, no engines to add.",
      "Choose EXR to PNG from the converter list.",
      "Select the .exr and choose 8-bit PNG, 16-bit PNG, or TIFF.",
      "Set tone mapping (Reinhard/ACES) and exposure if needed.",
      "Click Convert and save the output.",
    ],
    desktopNote:
      "Use the desktop app when you need more than 8-bit or a specific depth/normal/motion layer as its own image.",
    troubleshooting: [
      {
        problem: "The PNG is too dark or too bright",
        fix: "Raise or lower the Exposure control. EXR values are absolute scene luminance; Reinhard can crush bright scenes. Try 2.0–3.0, or switch to ACES for softer highlight roll-off.",
      },
      {
        problem: "I need 16-bit, not 8-bit PNG",
        fix: "The web tool emits 8-bit sRGB for compatibility. The desktop app exports 16-bit PNG or TIFF that keeps far more mid-tone headroom.",
      },
      {
        problem: "Depth/normal/motion layers are missing",
        fix: "PNG has no extra channels; the web tool keeps the first RGBA layer. The desktop app can export aux channels individually as false-color PNGs.",
      },
    ],
    conclusion:
      "EXR to PNG is really HDR→LDR tone mapping — pick the curve in the browser for a quick look, and move to the desktop app or your compositor the moment bit depth or layer choice matters.",
    updated: "2026-09-01",
    faqs: [
      {
        question: "Which EXR files work in the browser tool?",
        answer:
          "Scanline images with ZIP, ZIPS, RLE, or no compression — the defaults of Blender, V-Ray, Arnold, and Redshift. Tiled, multi-part, PIZ, PXR24, and B44 files are rejected with a pointer to re-export options or the desktop app.",
      },
      {
        question: "Reinhard or ACES — which tone mapping should I pick?",
        answer:
          "Start with Reinhard for a neutral, documentary look; switch to ACES when highlights clip or you want a filmic contrast curve. Both read the same data, and re-converting with the other curve costs nothing.",
      },
    ],
    screenshots: [
      { file: "exr-to-png-exr-render.webp", alt: "An OpenEXR render frame selected for EXR to PNG conversion", step: 3 },
      { file: "exr-to-png-tone-map-options.webp", alt: "Reinhard/ACES tone mapping and exposure options in the EXR to PNG converter", step: 4 },
      { file: "exr-to-png-converting.webp", alt: "EXR decode and tone mapping running locally in the browser", step: 5 },
      { file: "exr-to-png-png-compare.webp", alt: "EXR source and tone-mapped PNG compared side by side" },
      { file: "exr-to-png-exposure-adjust.webp", alt: "Re-converting an EXR with higher exposure to recover highlight detail" },
    ],
  },

  // GSM to WAV — A class
  {
    slug: "gsm-to-wav",
    title: "How to Convert GSM to WAV — Free Telephony Guide 2026",
    metaDescription:
      "Decode GSM 06.10 to WAV free: online tool, desktop app, or ffmpeg. Voicemail & call recordings, quality notes, fixes.",
    quickAnswer:
      "Yes. GSM 06.10 is 13 kbps speech; decoding to 16-bit PCM WAV is lossless and fast — mathematically exact, though it still sounds like a phone call because GSM discarded those frequencies at encode time. The free online tool decodes in your browser with no upload; for voicemail batches or FLAC archival, use the desktop app or ffmpeg.",
    formatDeep:
      "GSM 06.10 (GSM Full Rate) is the RPE-LTP speech codec of 2G cellular: 13 kbps, mono, band-limited to roughly 300–3400 Hz, frame-based (160 samples per 33-byte frame). Decoding to WAV expands each frame back to 16-bit PCM — mathematically exact, which is why the output still sounds like a phone call: the codec discarded those frequencies at encode time and no tool can recover them. The format persists because voicemail systems, IVR platforms, and call recorders standardized on it decades ago and never left.",
    batchLarge:
      "Voicemail archives are the volume case: a mailbox export can be hundreds of .gsm files. The desktop app batch-decodes a folder to WAV and optionally re-wraps to FLAC for lossless archival — GSM→WAV is an exact decode, WAV→FLAC is lossless compression, while MP3 would add a further lossy generation.",
    methods: [
      {
        name: "nichefiletools online converter",
        bestFor: "Single recordings, instant",
        price: "Free",
        limit: "500 MB (PC) / 100 MB (mobile)",
        notes: "Decoding happens locally, so a voicemail archive never transits any server. Output is standard 16-bit PCM mono @ 8000 Hz.",
      },
      {
        name: "nichefiletools desktop app",
        bestFor: "Batches, voicemail archives",
        price: "Free (hourly unlock code)",
        limit: "No file-size limit",
        notes: "Process a folder of recordings and optionally re-wrap to FLAC for lossless archival.",
      },
      {
        name: "ffmpeg (CLI)",
        bestFor: "Scripting",
        price: "Free",
        limit: "Manual",
        notes: "ffmpeg -i in.gsm out.wav decodes GSM via its native decoder; pair with -acodec flac for archival.",
      },
    ],
    desktopSteps: [
      "Launch the free nichefiletools desktop app; GSM decoding needs the free FFmpeg engine, which the app detects automatically.",
      "Select GSM to WAV in the sidebar.",
      "Select the .gsm (or a folder of them).",
      "Click Convert — frames decode to 16-bit PCM WAV.",
      "Optionally export to FLAC for lossless storage.",
    ],
    desktopNote:
      "Use the desktop app when you have a mailbox full of recordings and want them batch-decoded and archived as FLAC.",
    troubleshooting: [
      {
        problem: "The WAV sounds like a telephone",
        fix: "Normal — GSM is telephone-band (300–3400 Hz). The decode is mathematically exact; no post-processing recovers highs GSM discarded.",
      },
      {
        problem: "Can I go to MP3 or FLAC instead of WAV?",
        fix: "GSM→WAV is lossless decode; WAV→FLAC is also lossless (smaller). WAV→MP3 loses another generation. Workflow: GSM → WAV → FLAC for archive.",
      },
      {
        problem: "A .gsmcodec file won't open",
        fix: "It's still GSM 06.10 — the tool detects by frame structure, not extension. Drag it in; even a renamed .txt/.dat with valid frames decodes.",
      },
    ],
    conclusion:
      "GSM to WAV is a clean, lossless decode: one recording is a browser job, a whole mailbox is desktop batch territory, and FLAC makes the archive no larger than it needs to be.",
    updated: "2026-09-01",
    faqs: [
      {
        question: "Is GSM 06.10 the same codec as on my phone?",
        answer:
          "It's the 2G Full-Rate speech codec. Modern phones use AMR or AMR-WB instead; GSM 06.10 files mostly come from voicemail systems, call recorders, and legacy telephony hardware.",
      },
      {
        question: "Why is the output 8000 Hz mono?",
        answer:
          "Because that's what GSM 06.10 carries — 160 samples per 20 ms frame at 8 kHz, single channel. Upsampling at decode would add no information, so the WAV matches the codec's true format.",
      },
    ],
    screenshots: [
      { file: "gsm-to-wav-voicemail-files.webp", alt: "Voicemail .gsm exports from a call recording system", step: 3 },
      { file: "gsm-to-wav-upload.webp", alt: "A GSM recording dropped into the online GSM to WAV converter", step: 3 },
      { file: "gsm-to-wav-decode-progress.webp", alt: "Frame-by-frame GSM decode writing 16-bit PCM WAV", step: 4 },
      { file: "gsm-to-wav-waveform.webp", alt: "The decoded WAV waveform opened in an audio editor", step: 5 },
      { file: "gsm-to-wav-desktop-batch-flac.webp", alt: "A voicemail archive batch-decoding to WAV and FLAC in the desktop app" },
    ],
  },

  // MTS to MP4 — B class
  {
    slug: "mts-to-mp4",
    title: "How to Convert MTS to MP4 — Free AVCHD Guide 2026",
    metaDescription:
      "Convert AVCHD MTS/M2TS to MP4 free: online FFmpeg tool (PC), desktop app, or HandBrake. Remux vs transcode, fixes.",
    quickAnswer:
      "Yes, on a PC. AVCHD MTS wraps H.264 in MPEG-TS; the free online tool remuxes it to MP4 (copy video, AAC audio) in your browser — no upload. Mobile browsers technically load the tool, but the 31 MB FFmpeg WASM makes phones impractical — they're pointed at the desktop app. For 4K or batches use the desktop app.",
    formatDeep:
      "MTS/M2TS is AVCHD — the MPEG transport stream wrapper (H.264 video, AC-3 or PCM audio) used by HD camcorders from 2008 to the mid-2010s. MP4 is the ISO base media file format every player, editor, and platform actually wants. The streams inside are largely compatible, which is why most conversions are remuxes — the H.264 payload is copied bit-for-bit into the new container, with only the AC3 audio re-encoded to AAC where MP4 compatibility demands it. That distinction matters: remux is lossless and fast; transcode is neither, and is only needed for problem footage.",
    batchLarge:
      "A camcorder SD card is a folder of hundreds of clips — the desktop app batch-remuxes the lot, with NVENC/QSV hardware acceleration where a transcode is forced, and handles multi-GB 4K files the 100 MB web cap turns away. Multi-track audio survives via the desktop app's advanced options; the web tool keeps the first stream.",
    methods: [
      {
        name: "nichefiletools online converter (PC)",
        bestFor: "Single clips, quick share",
        price: "Free",
        limit: "100 MB per file (PC only)",
        notes: "Runs FFmpeg WASM in your browser. Defaults to remux (zero quality loss); falls back to transcode only if needed.",
      },
      {
        name: "nichefiletools desktop app",
        bestFor: "4K, batches, hardware accel",
        price: "Free (hourly unlock code)",
        limit: "No file-size limit",
        notes: "Uses NVENC/QSV for 10x+ real-time and handles multi-GB 4K footage the web cap rejects.",
      },
      {
        name: "HandBrake (pro)",
        bestFor: "Deep encode tweaks",
        price: "Free",
        limit: "Manual",
        notes: "Open the .mts, pick MP4/H.264, and tune bitrate/quality. Great when you want specific encode settings.",
      },
    ],
    desktopSteps: [
      "Download and launch the free nichefiletools desktop app.",
      "Pick MTS to MP4 from the tool list.",
      "Select the .mts/.m2ts (or a batch).",
      "Choose remux or transcode; set audio to AAC.",
      "Click Convert — hardware-accelerated, then save the .mp4.",
    ],
    desktopNote:
      "Use the desktop app for 4K, long clips, or whole SD-card folders — the 100 MB web cap and mobile limits don't apply.",
    troubleshooting: [
      {
        problem: "Quality dropped after conversion",
        fix: "Only if a transcode was forced. The default remux copies the video stream bit-for-bit, so quality is identical; only AC3→AAC audio is a near-transparent re-encode. If you saw loss, the source used an MP4-incompatible audio track.",
      },
      {
        problem: "It's slow / the browser froze",
        fix: "You likely hit transcode on a long clip in WASM. Move to the desktop app (hardware accelerated) or pre-trim the clip; phones rarely survive this workload, so prefer a desktop browser or the app.",
      },
      {
        problem: "Second audio track disappeared",
        fix: "The web tool keeps the first audio stream. For multi-track output pick the desktop app's advanced options.",
      },
    ],
    conclusion:
      "MTS to MP4 is usually just a remux, and the browser tool does that losslessly in seconds; 4K footage, whole SD cards, and forced transcodes are hardware-accelerated desktop work.",
    updated: "2026-09-01",
    faqs: [
      {
        question: "Remux or transcode — how do I know which one happened?",
        answer:
          "The tool remuxes by default and tells you when it falls back to a transcode (incompatible audio, stream errors). Remux finishes in seconds; transcode runs minutes — the duration itself is a good tell.",
      },
      {
        question: "Why does my AVCHD folder also contain .cpi and .mpl files?",
        answer:
          "Those are AVCHD's clip-index and playlist metadata, not video. The footage is the .mts/.m2ts streams — converters only need those; archive or discard the rest.",
      },
    ],
    screenshots: [
      { file: "mts-to-mp4-camcorder-clips.webp", alt: "AVCHD MTS clips copied from a camcorder SD card", step: 3 },
      { file: "mts-to-mp4-upload-browser.webp", alt: "An MTS clip loaded into the online MTS to MP4 converter", step: 3 },
      { file: "mts-to-mp4-remux-progress.webp", alt: "FFmpeg WASM remuxing MTS to MP4 in the browser with progress", step: 5 },
      { file: "mts-to-mp4-mp4-plays.webp", alt: "The remuxed MP4 playing in a standard video player", step: 5 },
      { file: "mts-to-mp4-desktop-batch.webp", alt: "A whole SD card folder batch-converting MTS to MP4 in the desktop app" },
    ],
  },

  // WAD File Extractor — C class (desktop only)
  {
    slug: "wad-extractor",
    title: "How to Extract WAD Files — Desktop Guide 2026",
    metaDescription:
      "Extract DOOM/Quake/BA2 WAD archives — desktop app only, no online tool. Selective extraction, type detection, fixes.",
    quickAnswer:
      "WAD extraction is desktop-only — a browser cannot safely memory-map or stream-decompress GB-scale game archives. The free nichefiletools desktop app detects DOOM IWAD/PWAD, Quake WAD2/WAD3, and Gamebryo BA2 by magic bytes, previews the lump directory, and extracts selected entries with CRC32 checksum verification — no online tool can do this reliably.",
    formatDeep:
      "WAD — 'Where's All the Data' — is the lump-archive format id Software introduced with DOOM in 1993: a small header, a directory of lump entries (name, size, offset), then raw data. The family diverged over time: DOOM IWAD/PWAD for retail content and mods, Quake's WAD2/WAD3 for textures, and (via Bethesda) BA2 archives for the modern Gamebryo era. Because the container is just an index plus bytes, extraction is precise and verifiable — CRC32 checks confirm each lump against its stored checksum. Modding and game-preservation communities still live in these archives.",
    batchLarge:
      "Game archives run from a few MB (shareware WADs) past 10 GB (modern BA2s), so streaming native I/O matters: the desktop app reads the directory first, lets you extract only the lumps you need, and verifies checksums on write. Selective extraction is the batch story — pulling 200 lumps out of a 4 GB archive beats unpacking all of it.",
    methods: [
      {
        name: "nichefiletools desktop app",
        bestFor: "Everything — the only supported path",
        price: "Free download",
        limit: "No file-size limit",
        notes: "Auto-detects WAD type by magic bytes, previews the directory, supports selective extraction and CRC32/MD5 verification.",
      },
      {
        name: "Why no online converter",
        bestFor: "Understanding the limit",
        price: "—",
        limit: "Browser memory/CPU caps",
        notes: "WADs span MB to 10 GB+; decompression (zlib/bzip2/lzma) in WASM is slow and can OOM a tab. The only realistic route is native streaming I/O.",
      },
      {
        name: "Quake tools (advanced)",
        bestFor: "Quake-only tinkering",
        price: "Free",
        limit: "Manual",
        notes: "QuArK or the Quake SDK can unpack WAD2/WAD3; less convenient than a single desktop app covering all variants.",
      },
    ],
    stepsTitle: "Extract on Desktop",
    desktopSteps: [
      "Install the free nichefiletools desktop app — WAD extraction is built in, no engines to add.",
      "Open WAD File Extractor and drag in your .wad.",
      "Preview the file list — names, sizes, compression state.",
      "Check the entries you want (or select all).",
      "Pick an output folder and click Extract; watch the progress bar.",
    ],
    desktopNote:
      "Selective extraction saves time and disk when you only need MAP01 or the SPRITE set, not the whole archive.",
    troubleshooting: [
      {
        problem: "The tool reports 'Unknown WAD format'",
        fix: `Our detector covers DOOM IWAD/PWAD, Quake WAD2/WAD3, and Gamebryo BA2. Anything else (Build .grp, Source .vpk, renamed, or encrypted) won't match — open an issue at ${REPO_ISSUES_URL} with a small sample and we'll try to add support.`,
      },
      {
        problem: "Can I extract from Steam game WADs?",
        fix: "Yes — they live under SteamApps/common/[game]/. DOOM Classic is in base/doom.wad; Quake in id1/. Extracted assets are for personal learning/modding only.",
      },
      {
        problem: "Extracted files won't open in my project",
        fix: "They're technically usable, but mind copyright: original DOOM source is GPL (1997) yet assets stay protected. GPL games like Freedoom allow free reuse; commercial games are personal-use only.",
      },
    ],
    conclusion:
      "WAD extraction belongs on the desktop. The free app detects the variant, lets you preview and pick entries, and verifies checksums — the safe way to open game archives.",
    updated: "2026-09-01",
    faqs: [
      {
        question: "What's the difference between IWAD and PWAD?",
        answer:
          "IWAD is the full commercial game data (doom.wad); PWAD is a mod that overrides or adds lumps on top of an IWAD. Extraction works identically for both — the header magic just labels intent.",
      },
      {
        question: "Can it extract DOOM's WADs from the Steam release?",
        answer:
          "Yes — Steam's DOOM Classic ships doom.wad / doom1.wad under base/. The archive extracts like any other; what you do with id's copyrighted assets afterward is a licensing question, not a technical one.",
      },
    ],
    screenshots: [
      { file: "wad-extractor-desktop-tool.webp", alt: "The WAD File Extractor open in the nichefiletools desktop app", step: 2 },
      { file: "wad-extractor-lump-directory.webp", alt: "The WAD lump directory preview showing names, sizes, and compression state", step: 3 },
      { file: "wad-extractor-selective-check.webp", alt: "Selecting only the sprite lumps for selective WAD extraction", step: 4 },
      { file: "wad-extractor-extract-progress.webp", alt: "WAD extraction progress with CRC32 verification per lump", step: 5 },
      { file: "wad-extractor-extracted-textures.webp", alt: "Extracted DOOM textures ready for modding" },
    ],
  },
];

export function getGuide(slug: string): ConvertGuide | undefined {
  return CONVERT_GUIDES.find((g) => g.slug === slug);
}
