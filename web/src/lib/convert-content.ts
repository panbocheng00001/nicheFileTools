/**
 * /convert/[slug] 教程页内容 — 全站规范 §2.2
 * 与 /tools/* 的分工：工具页重「执行」，本页重「方法对比 + 桌面教程 + 排错」。
 * 红线：不得复用 /tools 页正文段落（重复度 <30%）；步骤须真实。
 */

export interface ConvertMethod {
  name: string;
  bestFor: string;
  price: string;
  limit: string;
  notes: string;
}

export interface ConvertGuide {
  slug: string;
  title: string; // ≤60 字符（含品牌模板后缀）
  metaDescription: string; // ≤160 字符
  quickAnswer: string;
  methods: ConvertMethod[];
  /** 分步教程小节标题（默认 "… on Desktop"）；在线工具类工具用在线步骤标题 */
  stepsTitle?: string;
  desktopSteps: string[];
  desktopNote?: string;
  troubleshooting: { problem: string; fix: string }[];
  conclusion: string;
}

export const CONVERT_GUIDES: ConvertGuide[] = [
  {
    slug: "kfx-to-epub",
    title: "How to Convert KFX to EPUB — Free 2026 Guide",
    metaDescription:
      "Three ways to convert KFX to EPUB: free online tool, desktop app for batches, or Calibre. DRM-free files only. Steps, limits, and fixes.",
    quickAnswer:
      "Yes — you can convert KFX to EPUB in about a minute, provided the book is DRM-free. For a single book up to 50 MB, the free online tool is the fastest route; the desktop app handles whole libraries and batches. DRM-protected KFX files cannot be converted by any legitimate tool, ours included.",
    methods: [
      {
        name: "nichefiletools online converter",
        bestFor: "Single books, instant results",
        price: "Free",
        limit: "50 MB per file (PC) / 20 MB (mobile)",
        notes: "Runs in your browser — the book is never uploaded. Rebuilds the KFX fragment structure into a standard EPUB package with chapter order and table of contents intact.",
      },
      {
        name: "nichefiletools desktop app",
        bestFor: "Batch conversion, large libraries",
        price: "2 free conversions per device, then a one-time license",
        limit: "No file-size limit",
        notes: "Native processing for entire book folders. Start with the free unlock key to try it on two books before paying anything.",
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
      "Download and launch the free nichefiletools desktop app.",
      "Pick KFX to EPUB from the tool list in the sidebar.",
      "Select your .kfx file and choose where to save the .epub output.",
      "Click Convert — the app reports progress and writes the EPUB next to your chosen path.",
    ],
    desktopNote:
      "First time using the desktop app? The free unlock key grants 2 conversions per device — request it right inside the app.",
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
        problem: "My book is larger than 50 MB",
        fix: "Comic compilations and image-heavy books can exceed the browser limit. Use the desktop app, which has no size cap and processes the same conversion natively.",
      },
    ],
    conclusion:
      "For one DRM-free book, the online converter is all you need. For a shelf of them, the desktop app's batch mode saves an evening of dragging files — start with the free 2-conversion key and see the quality yourself.",
  },
  {
    slug: "prt-to-stl",
    title: "How to Convert PRT to STL — Free 2026 Guide",
    metaDescription:
      "Convert PRT (Creo/Pro-E) parts to STL for 3D printing: online tool, desktop app, or Creo's own export. Tessellation settings and fixes explained.",
    quickAnswer:
      "PRT stores exact parametric geometry; STL stores a triangle approximation, so every PRT→STL conversion is a tessellation. For parts up to 20 MB, the free online tool handles it in your browser. Bigger parts and assemblies belong in the desktop app — or, if you have Creo installed, its own STL export.",
    methods: [
      {
        name: "nichefiletools online converter",
        bestFor: "Single parts up to 20 MB",
        price: "Free",
        limit: "20 MB per file (PC) / 5 MB (mobile)",
        notes: "Tessellates with a 0.1 mm default chord tolerance — the sweet spot for FDM printing — and outputs binary or ASCII STL without uploading your CAD data.",
      },
      {
        name: "nichefiletools desktop app",
        bestFor: "Large parts, batches of files",
        price: "2 free conversions per device, then a one-time license",
        limit: "No file-size limit",
        notes: "The same conversion kernel with native memory access, so multi-hundred-MB parts that would freeze a browser tab convert normally.",
      },
      {
        name: "Creo native export",
        bestFor: "Anyone with a Creo license",
        price: "Included with Creo",
        limit: "Requires Creo installed",
        notes: "In Creo, File → Save a Copy → STL exposes chord height and angle control directly. Use it when you need a very specific tolerance for SLA/DLP printing.",
      },
    ],
    desktopSteps: [
      "Download and launch the free nichefiletools desktop app.",
      "Pick PRT to STL from the tool list in the sidebar.",
      "Select your .prt file and choose the output .stl location.",
      "Click Convert — tessellation of complex parts can take 10–30 seconds; the app shows progress while it meshes.",
    ],
    troubleshooting: [
      {
        problem: "The browser tab crashes or runs out of memory",
        fix: "PRT tessellation builds the full B-Rep structure before meshing — a large part can need several GB of RAM. That's exactly why the web tool caps at 20 MB; switch to the desktop app for heavy parts.",
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
      "One part, under 20 MB? Convert it online in seconds. Production batches or heavy CAD files? The desktop app is built for exactly that — and Creo users can always export straight from the source.",
  },
  {
    slug: "pvr-to-png",
    title: "How to Convert PVR to PNG — Free 2026 Guide",
    metaDescription:
      "Decode PVR textures (PVRTC/ETC/ASTC) to PNG: free online tool, desktop batch mode, or PVRTexTool. Auto format detection and common fixes.",
    quickAnswer:
      "Decoding PVR to PNG is a decompression step, so it's fast and lossless at the pixel level: the PNG shows exactly what the compressed texture contains. The online tool auto-detects PVRTC, ETC, and ASTC variants up to 100 MB; texture sets from a real game project belong in the desktop app's batch mode.",
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
        price: "2 free conversions per device, then a one-time license",
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
        problem: "Transparency comes out as solid black or white",
        fix: "ETC1 has no alpha channel — transparent regions are filled with a solid color during decode. PVRTC 4bpp and ASTC both carry alpha and export it correctly to PNG.",
      },
      {
        problem: "The output looks blurrier than expected",
        fix: "By default the largest mipmap is exported. If a tool in your pipeline packaged many mip levels, smaller ones are lower resolution by design — inspect the header's mipmap count.",
      },
    ],
    conclusion:
      "For inspecting one texture, the online decoder is instant. Modders and devs recovering a full asset set should use desktop batch mode — two free conversions are enough to verify quality on real files.",
  },
  {
    slug: "raw-to-iso",
    title: "How to Convert RAW to ISO — Desktop Guide 2026",
    metaDescription:
      "RAW disc images need desktop software — no online tool can process 2352-byte sector images. Free app steps, Mode 1/Mode 2 explained, common fixes.",
    quickAnswer:
      "This conversion cannot happen in a browser: RAW images span hundreds of MB to 50 GB, far beyond browser memory limits, and need byte-exact sector I/O. The free nichefiletools desktop app extracts the 2048-byte user data from every 2352-byte sector and writes a standard ISO 9660 image.",
    methods: [
      {
        name: "nichefiletools desktop app",
        bestFor: "Everything — this is the recommended path",
        price: "2 free conversions per device, then a one-time license",
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
      "One free unlock key per device grants 2 conversions — enough to test on two real disc images before deciding on a license.",
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
      "RAW to ISO is inherently a desktop job, so pick native software and keep the free unlock flow simple: try it on two images, and if your archive is bigger, the one-time license removes the limit.",
  },
  {
    slug: "blend-to-glb",
    title: "How to Convert BLEND to GLB — Free 2026 Guide",
    metaDescription:
      "Convert Blender .blend to glTF GLB for the web: free online tool, desktop app for big scenes, or Blender's own exporter. Steps and quality fixes.",
    quickAnswer:
      "There are two reliable routes: the free online converter (scenes up to 30 MB, nothing uploaded) or — if Blender is already installed — its built-in exporter via File → Export → glTF 2.0, which is the reference implementation. Large scenes and batches are handled by the desktop app.",
    methods: [
      {
        name: "nichefiletools online converter",
        bestFor: "Scenes up to 30 MB",
        price: "Free",
        limit: "30 MB per file (PC) / 10 MB (mobile)",
        notes: "Maps Blender meshes, UVs, Principled BSDF materials, and transform animations to glTF 2.0 — entirely client-side, so unreleased 3D work stays on your machine.",
      },
      {
        name: "nichefiletools desktop app",
        bestFor: "Large scenes, batch exports",
        price: "2 free conversions per device, then a one-time license",
        limit: "No file-size limit",
        notes: "Same glTF 2.0 output with native memory access. If a scene crashes the browser version, it belongs here.",
      },
      {
        name: "Blender native exporter",
        bestFor: "Anyone with Blender installed",
        price: "Free, open source",
        limit: "Requires Blender",
        notes: "File → Export → glTF 2.0 inside Blender. It's the most complete path — shape keys, armatures, and custom properties included — and always matches your Blender version.",
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
        problem: "The browser tab dies on a big scene",
        fix: "A 30 MB .blend can expand to hundreds of MB in memory while the DNA structure is rebuilt. That's the web limit doing its job — move the file to the desktop app.",
      },
    ],
    conclusion:
      "Quick web preview? Convert online. Final asset for production? Export from Blender when it's open, and use the desktop app for everything in between.",
  },

  {
    slug: "raw-to-wav",
    title: "How to Convert RAW to WAV — Free 2026 Guide",
    metaDescription:
      "Wrap headerless PCM/RAW audio in a WAV header: free online tool, Audacity's RAW import, or ffmpeg. Parameter guide and fixes for static noise.",
    quickAnswer:
      "A RAW audio file is just PCM samples with no header, so 'converting' it means declaring the correct sample rate, bit depth, and channels once and letting a tool write the 44-byte WAV header for you. If you don't know the parameters, start with 44100 Hz / 16-bit / stereo — that covers most consumer recordings.",
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
      "Get the three parameters right once and RAW to WAV is a lossless, instant wrap. Use the online converter for one-off files, and Audacity or ffmpeg when you need to experiment or batch.",
  },

  {
    slug: "glb-to-gltf",
    title: "How to Convert GLB to GLTF — Free 2026 Guide",
    metaDescription:
      "Unpack GLB into .gltf JSON: free online converter, Microsoft gltf-pipeline CLI, or Blender. What changes (and what doesn't) in the output.",
    quickAnswer:
      "GLB and .gltf hold identical data in different containers, so unpacking is lossless and instant. The online converter outputs a self-contained .gltf (binary buffer embedded as a data URI); if you need the classic .gltf + .bin + textures file set, use Microsoft's gltf-pipeline CLI on it.",
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
  },

  {
    slug: "eot-to-ttf",
    title: "How to Convert EOT to TTF — Free 2026 Guide",
    metaDescription:
      "Extract TTF/OTF from legacy IE .eot web fonts: free online tool, why subsetting loses glyphs, MicroType limits, and licensing notes.",
    quickAnswer:
      "An EOT file is a wrapper around an ordinary sfnt font, so conversion is extraction, not transcoding — instant and lossless. The one real gotcha is subsetting: many EOTs contain only the glyphs the old page used, so the recovered TTF may have fewer characters than the retail font.",
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
  },

  {
    slug: "opf-to-epub",
    title: "How to Convert OPF to EPUB — Free 2026 Guide",
    metaDescription:
      "Package an OPF manifest and its resources into a valid EPUB 3: free online packager, Sigil, or Calibre. OCF ZIP rules and path pitfalls explained.",
    quickAnswer:
      "An OPF is the manifest of an EPUB, not the book itself — so 'conversion' is packaging: the OPF plus every file its manifest references go into a ZIP that follows EPUB's OCF rules (mimetype first, stored). Zip your OPF folder, drop it in, and download a valid .epub.",
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
  },

  {
    slug: "sav-to-csv",
    title: "How to Convert SAV to CSV — Free 2026 Guide",
    metaDescription:
      "Export SPSS .sav/.zsav to CSV: free online converter, SPSS itself, or R/pspp. What's lost (value labels), Excel encoding fixes, limits explained.",
    quickAnswer:
      "Yes — SPSS data exports to CSV completely, including compressed .zsav files. Two things to know upfront: value labels (1 = Male / 2 = Female) don't exist in CSV, so you get the codes; and the output needs a UTF-8 BOM or Excel will mangle international characters — the online tool writes it for you.",
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
      "For a faithful data export, the online converter handles every compression variant with zero setup. If you need value labels in the output, do one Automatic Recode in SPSS first — that's the only step CSV can't do for you.",
  },
];

export function getGuide(slug: string): ConvertGuide | undefined {
  return CONVERT_GUIDES.find((g) => g.slug === slug);
}
