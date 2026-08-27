import type { ClassType, ToolCategory } from "./converters/interfaces";

export interface FaqItem {
  question: string;
  answer: string;
}

export interface ToolContent {
  slug: string;
  id: string;
  name: string;
  className: ClassType;
  category: ToolCategory;
  categoryLabel: string;
  sourceFormat: string;
  targetFormat: string;
  sourceExt: string;
  targetExt: string;
  /** 额外可接受的扩展名（如 SAV 的 .zsav），用于文件选择器 accept */
  extraSourceExts?: string[];
  title: string;
  metaDescription: string;
  h1: string;
  /** Web max file size in bytes (PC). 0 for C class (web unsupported). */
  webMaxFilePc: number;
  webMaxFileMobile: number;
  desktopUnlimited: boolean;
  whatIs: string;
  whyConvert: string;
  howTo: string;
  vs?: string;
  faqs: FaqItem[];
  relatedTools: string[];
  /** 工具页选项面板（如 RAW→WAV 的采样率/位深/声道） */
  webOptions?: {
    key: string;
    label: string;
    default: string;
    choices: { value: string; label: string }[];
  }[];
  // C-class (desktop only) fields
  desktopOnlyIntro?: string;
  whyDesktopOnly?: string;
  desktopSteps?: string;
}

const MB = 1024 * 1024;

export const TOOLS: ToolContent[] = [
  // 1) KFX to EPUB — A class
  {
    slug: "kfx-to-epub",
    id: "kfx-to-epub",
    name: "KFX to EPUB",
    className: "A",
    category: "ebook",
    categoryLabel: "eBook",
    sourceFormat: "KFX",
    targetFormat: "EPUB",
    sourceExt: ".kfx",
    targetExt: ".epub",
    title: "KFX to EPUB Converter – Free Online Kindle KFX to EPUB",
    metaDescription:
      "Convert Amazon Kindle KFX files to EPUB format free online. No upload, 100% browser-based. Supports DRM-free KFX books from Kindle 8+. Works on PC & mobile.",
    h1: "KFX to EPUB Converter",
    webMaxFilePc: 50 * MB,
    webMaxFileMobile: 20 * MB,
    desktopUnlimited: true,
    whatIs:
      "Amazon Kindle Format 8+ (KFX) is Amazon's proprietary ebook format used in Kindle devices and the Kindle App since 2017. It replaced the older AZW3/KF8 format, and is based on a fragmented HTML/CSS architecture that supports the Enhanced Typesetting engine, custom fonts, and floating text/graphics. Internally a KFX file uses a DRIF metadata structure plus a Snappy-compressed content segment, which is fundamentally different from the standard EPUB OPF/SPINE/XHTML architecture — that is why ordinary ebook managers (such as older Calibre) cannot open KFX perfectly.",
    whyConvert:
      "EPUB is the open standard from the International Digital Publishing Forum (IDPF), natively supported by almost every non-Kindle reader including Apple Books, Google Play Books, Kobo, and Sony Reader. Converting KFX to EPUB matters for: (1) cross-device migration — KFX cannot be used directly when switching away from the Kindle ecosystem; (2) backing up books you own — DRM-free ebooks you purchased can be archived in EPUB across devices; (3) editing layout — EPUB is based on XHTML/CSS, so fonts/spacing/styles can be edited with standard tools; (4) Calibre management — Calibre's metadata management, format conversion, and sync features are far stronger for EPUB than for its limited KFX support.",
    howTo:
      "Step 1: Prepare a DRM-free KFX file (export from your Kindle device's /documents directory, or download from Amazon My Content). Step 2: Drag the .kfx file into the conversion area above (supports up to 50 MB on PC, 20 MB on mobile). Step 3: Click Convert — the conversion runs locally in your browser, and the file is never uploaded to a server. Step 4: Download the generated .epub file and open it in any EPUB reader to verify.",
    vs: "All three are Amazon Kindle ecosystem formats, but their architecture and compatibility differ significantly: KFX (2017+) uses DRIF metadata plus Snappy-compressed fragments and is only supported by Kindle 8+; AZW3 (KF8) is a variant based on EPUB 3 with broader compatibility but is being phased out; EPUB is the open standard and works cross-platform. This tool rebuilds KFX's fragmented structure into a standard EPUB OPF package, preserving the original chapter order, table of contents, and basic styling.",
    faqs: [
      {
        question: "Is converting KFX to EPUB legal?",
        answer:
          "For DRM-free ebooks you have legally purchased, converting to another format for personal use generally falls under fair use. However, distributing or selling the converted file may violate copyright law. Please comply with the laws in your jurisdiction.",
      },
      {
        question: "Can I convert DRM-protected KFX files?",
        answer:
          "No. Amazon's DRM encryption takes effect at the KFX content-segment level and requires a private key to decrypt. This tool only processes DRM-free KFX files. If conversion fails with an encryption error, the file is DRM-protected.",
      },
      {
        question: "Will the conversion preserve my highlights and notes?",
        answer:
          "No. Highlights and annotations are stored in a separate database on the Kindle device (the my.clippings file), not inside the KFX file. Export your annotations via Kindle's export feature before converting.",
      },
      {
        question: "What is the maximum file size?",
        answer:
          "The web version supports up to 50 MB in PC browsers and 20 MB on mobile. Most KFX ebooks are 2–20 MB, well within range. For larger files, use the desktop application.",
      },
    ],
    relatedTools: ["prt-to-stl", "pvr-to-png", "blend-to-glb", "raw-to-iso"],
  },

  // 2) PRT to STL — B class
  {
    slug: "prt-to-stl",
    id: "prt-to-stl",
    name: "PRT to STL",
    className: "B",
    category: "3d",
    categoryLabel: "3D / CAD",
    sourceFormat: "PRT",
    targetFormat: "STL",
    sourceExt: ".prt",
    targetExt: ".stl",
    title: "PRT to STL Converter – Free Online",
    metaDescription:
      "Convert PTC Creo/Pro-E PRT files to STL for 3D printing free online. Browser-based, no upload. Binary & ASCII output. Files >20MB: use desktop app.",
    h1: "PRT to STL Converter",
    webMaxFilePc: 20 * MB,
    webMaxFileMobile: 5 * MB,
    desktopUnlimited: true,
    whatIs:
      "PRT is the native part file format of PTC (Parametric Technology Corporation) Pro/ENGINEER, now called Creo. It stores the complete design history of a parametric 3D model — sketch constraints, feature operations (extrude/revolve/chamfer/shell), B-Rep boundary representation geometry, relational parameters, and family-table information. PRT is binary-encoded and is one of the most complex proprietary formats in the CAD industry; its internal structure is fundamentally different from exchange formats like STEP/IGES. PRT files are widely used in aerospace, automotive, and mold manufacturing product design.",
    whyConvert:
      "STL (Stereolithography) is the de-facto standard for 3D printing and CAM machining — virtually all slicers (Cura/PrusaSlicer/Simplify3D), 3D printers, and CNC systems read STL natively. Converting PRT to STL is used for: (1) prototype validation — generate an STL from a finished PRT model to send to FDM/SLA/DLP printers; (2) multi-software collaboration — import Creo models into Blender/Maya/ZBrush for rendering or sculpting; (3) pre-processing for FEA — some CAE tools accept STL meshes as input; (4) archival delivery — STL is the most broadly compatible 3D geometry archive format.",
    howTo:
      "Step 1: Export or obtain your .prt file from Creo. Step 2: Drag it into the conversion area above (PC web up to 20 MB, mobile up to 5 MB). Step 3: Choose output options — Binary STL (recommended, smaller) or ASCII STL. Step 4: Click Convert and wait for tessellation (complex models may take 10–30 seconds). Step 5: Download the .stl file and import it into your slicer to preview and check mesh quality.",
    vs: "PRT to STL is fundamentally a tessellation operation: PRT's precise NURBS surfaces/faces are discretized into a triangle mesh. Key parameters control the result — chordal tolerance controls mesh accuracy (smaller = more accurate but more faces); angular control decides mesh density at curved edges; output can be Binary STL (small, fast) or ASCII STL (readable, ~6x larger). This tool defaults to 0.1 mm chordal tolerance, suitable for most FDM printing.",
    faqs: [
      {
        question: "What is the recommended tessellation accuracy for 3D printing?",
        answer:
          "For FDM printing, 0.1–0.2 mm chordal tolerance is enough; for high-precision SLA/DLP printing, 0.05 mm or lower is recommended. Note that overly high accuracy produces huge files (>100 MB) and slows down the slicer.",
      },
      {
        question: "Does the converter preserve colors and textures?",
        answer:
          "The STL format itself only stores the geometry mesh (triangle normals) and does not support color/material/textures. If you need to keep that information, export OBJ or GLB instead (supported by the desktop app).",
      },
      {
        question: "Why is there a 20MB limit on the web version?",
        answer:
          "PRT tessellation is CPU-intensive — the OCCT kernel must build the full B-Rep data structure in memory before meshing. Tessellating a large PRT can consume several GB of memory, risking an out-of-memory crash in the browser tab. The 20 MB limit balances safety and usability.",
      },
      {
        question: "Can I convert assembly files (.asm) to STL?",
        answer:
          "This tool currently focuses on single-part .prt files. Assembly .asm files contain references and constraints of multiple parts and require parsing the assembly tree before tessellating each part. This is planned for desktop v2.",
      },
    ],
    relatedTools: ["kfx-to-epub", "pvr-to-png", "blend-to-glb", "raw-to-iso"],
  },

  // 3) PVR to PNG — A class
  {
    slug: "pvr-to-png",
    id: "pvr-to-png",
    name: "PVR to PNG",
    className: "A",
    category: "image",
    categoryLabel: "Image",
    sourceFormat: "PVR",
    targetFormat: "PNG",
    sourceExt: ".pvr",
    targetExt: ".png",
    title: "PVR to PNG Converter – Free PowerVR Texture to PNG Online",
    metaDescription:
      "Convert PVR/PVRTC compressed textures to PNG images free online. Browser-based, supports PVRTC 1/2, ETC, ASTC variants. No upload, instant conversion.",
    h1: "PVR to PNG Converter",
    webMaxFilePc: 100 * MB,
    webMaxFileMobile: 30 * MB,
    desktopUnlimited: true,
    whatIs:
      "PVR is a dedicated texture compression format developed by Imagination Technologies for its PowerVR GPU series. It is widely used in iOS/Android mobile game development (Unity/Unreal Engine), especially in OpenGL ES and Vulkan rendering pipelines. A PVR file contains compressed texture data (PVRTC 1-bit/2-bit/4-bit, ETC1/ETC2, ASTC 4x4 and more variants), a mipmap chain, texture size information, and pixel-format identifiers. The PVR v3 file header is 52 bytes and contains the magic number, flags, pixelFormat, width, and height — understanding these fields is the prerequisite for correct decoding.",
    whyConvert:
      "PNG is a lossless universal image format openable in any image viewer/editor. The main uses of PVR to PNG are: (1) texture review — artists need to inspect the actual result of a compressed texture (color shift/artifacts/blocking); (2) asset reuse — PVR textures extracted from a game can be converted to PNG for modding, secondary creation, or asset library building; (3) debugging — developers confirm whether the texture packaging pipeline is correct and mipmaps are complete; (4) cross-platform migration — converting mobile-specific PVR textures to a universal format for PC/console projects.",
    howTo:
      "Step 1: Prepare your .pvr file (usually obtained by unpacking a Unity Asset Bundle, APK/ipa, or Unreal Pak). Step 2: Drag it into the conversion area above (PC up to 100 MB, mobile up to 30 MB). Step 3: Click Convert — the tool auto-detects the compression format and decodes it. Step 4: Download the generated .png file. For PVR files that contain a mipmap chain, the largest-resolution image is output by default.",
    vs: "PVR supports several compression schemes, each with different compression ratio and visual-quality trade-offs: PVRTC 4bpp/2bpp (PowerVR's patented algorithm, 4bpp gives ~8:1 compression, good for diffuse textures; 2bpp reaches 16:1 but with noticeable quality loss); ETC1/ETC2 (Ericsson texture compression, widely supported on Android, ETC2 adds EAC normal/alpha support); ASTC (adaptive variable-rate compression, 4x4 to 12x12 block sizes, best quality but most expensive to encode/decode). This tool auto-detects the pixelFormat field in the PVR header and calls the corresponding decoder.",
    faqs: [
      {
        question: "My PVR file is not being recognized. Why?",
        answer:
          "Common reasons: (1) the file is actually the old PVR v2 format (different magic number); (2) the file was renamed to .pvr but is actually another format (DDS/KTX); (3) the file was corrupted in transit. Use a hex editor to confirm the header starts with 'PVR!' (0x50565221).",
      },
      {
        question: "Can I batch-convert multiple PVR files?",
        answer:
          "The web version currently supports single-file conversion. For batch processing many texture files (a character texture set usually contains diffuse/normal/specular/multiple PVRs), use the desktop app's batch conversion.",
      },
      {
        question: "What happens to the alpha channel?",
        answer:
          "It depends on the source PVR's compression format: PVRTC 4bpp and ASTC support alpha and restore it correctly as a transparent channel in PNG; ETC1 does not support alpha, so transparent areas are filled with a specified color (usually black or white).",
      },
      {
        question: "Is there any quality loss in the conversion?",
        answer:
          "PVR to PNG is a decompression process (lossy to lossless) and introduces no additional quality loss. But the original PNG to PVR compression was lossy, so the decompressed PNG differs from the very first original PNG. This difference comes from PVR's lossy compression itself, not from this tool.",
      },
    ],
    relatedTools: ["kfx-to-epub", "prt-to-stl", "blend-to-glb", "raw-to-iso"],
  },

  // 4) RAW to ISO — C class (desktop only)
  {
    slug: "raw-to-iso",
    id: "raw-to-iso",
    name: "RAW to ISO",
    className: "C",
    category: "archive",
    categoryLabel: "Disc Image",
    sourceFormat: "RAW",
    targetFormat: "ISO",
    sourceExt: ".raw",
    targetExt: ".iso",
    title: "RAW to ISO Converter – Desktop Tool for Optical Disc Images",
    metaDescription:
      "Convert RAW optical disc images (2352-byte sectors) to standard ISO 9660 format. Desktop application only — free download. Handles Mode 1/Mode 2 RAW images.",
    h1: "RAW to ISO Converter",
    webMaxFilePc: 0,
    webMaxFileMobile: 0,
    desktopUnlimited: true,
    whatIs:
      "A RAW disc image preserves the complete sector data of an optical disc — each sector is 2352 bytes (CD-ROM Mode 1) or 2336 bytes (CD-ROM Mode 2), containing 2048 bytes of user data plus sync codes (12 bytes), header info (4 bytes), error-detection code EDC (4 bytes), and error-correction code ECC (276 bytes). This 'raw' format is typically generated by disc-burning software such as ImgBurn, Alcohol 120%, and CloneCD when creating 1:1 images. In contrast, the ISO 9660 standard format keeps only the 2048-byte user-data region of each sector, discarding the correction codes and sync information.",
    whyConvert:
      "ISO is the most broadly compatible disc-image format — virtual drives (Daemon Tools/WinCDEmu), burning software, game emulators, and cloud operating systems all natively support ISO. Typical RAW to ISO scenarios: (1) virtual mounting — most virtual drives do not recognize RAW, so it must be converted to ISO to mount as a virtual drive letter; (2) re-burning — ISO can be written to physical discs by any burning software; (3) file-size reduction — discarding ECC/EDC shrinks the file by about 13% (Mode 1) or 3% (Mode 2 Form 1); (4) archival standardization — ISO is the de-facto standard for long-term storage.",
    howTo:
      "Step 1: Download and install the nichefiletools Desktop app (free). Step 2: Launch the app and select the RAW to ISO tool. Step 3: Drag in your .raw/.bin/.img file(s) (single or batch). Step 4: Choose the output directory. Step 5: Click Convert — a progress bar shows sector-processing progress in real time. Find the corresponding .iso file in the output directory when done.",
    vs: "CD-ROM has two main modes: Mode 1 (2352 bytes/sector) is used for computer-data discs and includes a full ECC/EDC correction system; extracting ISO takes the 2048 bytes at offset 16–2063. Mode 2 has two sub-types: Form 1 (same as Mode 1, with ECC) and Form 2 (2336 bytes, no ECC, for audio/video data). This tool auto-detects the sector mode and applies the correct extraction strategy. For mixed-mode discs (data tracks + audio tracks), it analyzes each sector and processes them separately.",
    faqs: [
      {
        question: "Why isn't this available as an online tool?",
        answer:
          "RAW disc images are typically hundreds of MB to 50 GB. The browser's ArrayBuffer limit (Chrome ~4 GB / Safari ~1.5 GB) is far from enough for such files. Moreover, byte-exact sector-level I/O in the browser's JavaScript/WASM environment is extremely inefficient and can freeze the tab. The native desktop app efficiently uses the file system and multi-threading.",
      },
      {
        question: "Will the converted ISO be bootable?",
        answer:
          "If the original RAW image is a bootable disc (e.g., a Windows installer, Linux Live CD), the converted ISO usually stays bootable — because the boot code is stored in the user-data region and is unaffected. But some special formats (e.g., PS1 discs with subchannel data) may lose the information needed to boot.",
      },
      {
        question: "What's the difference between RAW, BIN, CUE, and IMG?",
        answer:
          "RAW/BIN/IMG usually refer to the same thing (a 2352-byte/sector raw image), just different extension habits of different software. CUE is the accompanying index file describing each track's position and mode in the BIN. This tool accepts all these variants.",
      },
      {
        question: "How long does it take to convert a 4.7GB DVD RAW?",
        answer:
          "On a modern SSD, pure I/O RAW to ISO runs at 300–500 MB/s, so a 4.7 GB file takes about 10–15 seconds. On a mechanical HDD it is about 60–120 seconds. The progress bar shows the estimated remaining time in real time.",
      },
    ],
    relatedTools: ["kfx-to-epub", "prt-to-stl", "pvr-to-png", "blend-to-glb"],
    desktopOnlyIntro:
      "RAW to ISO is a desktop-only conversion. Browser-based conversion is not available because RAW disc images are typically hundreds of MB to 50 GB and require byte-exact sector-level I/O that the browser cannot perform efficiently or safely.",
    whyDesktopOnly:
      "RAW optical disc images usually exceed 500 MB and need precise sector-level operations. The browser's ArrayBuffer limit and single-threaded JavaScript/WASM environment make this impractical and prone to freezing. The free desktop application handles files of any size with native performance and MD5 verification.",
    desktopSteps:
      "Step 1: Download the free nichefiletools Desktop app. Step 2: Open the RAW to ISO tool. Step 3: Drag in your .raw/.bin/.img file. Step 4: Pick an output folder and click Convert.",
  },

  // 5) BLEND to GLB — B class
  {
    slug: "blend-to-glb",
    id: "blend-to-glb",
    name: "BLEND to GLB",
    className: "B",
    category: "3d",
    categoryLabel: "3D",
    sourceFormat: "BLEND",
    targetFormat: "GLB",
    sourceExt: ".blend",
    targetExt: ".glb",
    title: "BLEND to GLB Converter – Free Online",
    metaDescription:
      "Convert Blender .blend files to GLB (glTF Binary) free online. Browser-based, no upload. Preserves meshes, materials, UVs. Large files? Download desktop app.",
    h1: "BLEND to GLB Converter",
    webMaxFilePc: 30 * MB,
    webMaxFileMobile: 10 * MB,
    desktopUnlimited: true,
    whatIs:
      "BLEND is the native project-file format of the Blender open-source 3D creation suite. It is a self-contained 'database-style' file — internally it stores all data in the scene: mesh geometry (vertices/edges/faces/normals/UV), material nodes (Principled BSDF/procedural textures), armature rigging and shape-key animations, particle systems, physics-simulation caches, even window layout and UI preferences. The BLEND file uses a custom DNA (Data Name Architecture) structure encoding — the file header contains a version number and a list of memory pointers, followed by a sequence of compressed data blocks. This design makes BLEND files extremely compact but also highly dependent on Blender's internal API to parse.",
    whyConvert:
      "glTF (GL Transmission Format) is the 3D scene-transmission standard defined by the Khronos Group, called the 'JPEG of 3D'. GLB is its single-file binary form. The value of BLEND to GLB: (1) Web 3D publishing — Three.js/Babylon.js/A-Frame and other WebGL frameworks load glTF/GLB natively and can embed 3D models directly in web pages; (2) AR/VR content — Meta Quest/Apple Vision Pro/HoloLens all prioritize glTF; (3) cross-software collaboration — Unity/Unreal/Maya/3ds Max all import glTF via plugins; (4) e-commerce 3D preview — Shopify/Amazon 3D model viewers use glTF as input.",
    howTo:
      "Step 1: Save your .blend file in Blender (use File → Clean Up to remove unused data and reduce size). Step 2: Drag it into the conversion area above (PC up to 30 MB, mobile up to 10 MB). Step 3: Click Convert and wait for parsing and serialization (simple models 5–15 s, complex scenes 30–60 s). Step 4: Download the .glb file and preview it in the glTF Viewer or Three.js Editor.",
    vs: "Conversion involves multiple layers of mapping: BLEND's Mesh data (MVert/MEdge/MPoly) → glTF's accessors/buffers/mesh primitives; Blender's Principled BSDF material node → glTF's PBR metallic-roughness model (baseColorFactor/metallicFactor/roughnessFactor); BLEND's UV layers → glTF's TEXCOORD attribute; Armature → glTF's skins/joints; animation data (NLA strips) → glTF's animations/channels/samplers. Each layer has accuracy trade-offs — for example Blender's unique procedural nodes (Noise/Voronoi) must be baked into static texture maps to be expressed in glTF.",
    faqs: [
      {
        question: "My GLB file looks different from the Blender viewport. Why?",
        answer:
          "glTF uses the PBR metallic-roughness material model while Blender defaults to Principled BSDF. They are mathematically close but not identical — especially clearcoat and transmission parameters have no direct equivalent in standard glTF. Also, Blender's Eevee real-time render and Cycles ray-traced render results differ.",
      },
      {
        question: "Can I include animations in the exported GLB?",
        answer:
          "Yes. If the BLEND file contains Action NLA strips (object transform animations: position/rotation/scale), this tool exports them as glTF animations. Full support for shape keys and skeletal animation depends on the WASM parser's coverage; the desktop app via Blender's Python API guarantees complete animation export.",
      },
      {
        question: "Why 30MB limit for the web version?",
        answer:
          "Parsing BLEND's DNA requires rebuilding the complete pointer-reference graph in memory. A 30 MB .blend file can expand to 200–500 MB in memory (all decompressed copies of data blocks). The browser tab's memory budget is limited and the OS will force-terminate it beyond that.",
      },
      {
        question: "Which glTF version does the converter output?",
        answer:
          "glTF 2.0, the latest stable version, widely supported by Three.js r125+, Babylon.js 5.x, Unity 2021+, and Unreal Engine 5 natively.",
      },
    ],
    relatedTools: ["kfx-to-epub", "prt-to-stl", "pvr-to-png", "raw-to-iso"],
  },

  // 6) RAW to WAV — A class
  {
    slug: "raw-to-wav",
    id: "raw-to-wav",
    name: "RAW to WAV",
    className: "A",
    category: "audio",
    categoryLabel: "Audio",
    sourceFormat: "RAW",
    targetFormat: "WAV",
    sourceExt: ".raw",
    targetExt: ".wav",
    title: "RAW to WAV Converter – Free Online",
    metaDescription:
      "Convert RAW PCM audio files to WAV free online. Browser-based, custom sample rate/bit depth/channels. No upload, instant. Files up to 500MB.",
    h1: "RAW to WAV Converter",
    webMaxFilePc: 500 * MB,
    webMaxFileMobile: 100 * MB,
    desktopUnlimited: false,
    whatIs:
      "A RAW audio file — also called a PCM or headerless audio file — is the purest form of digital sound: a continuous stream of amplitude samples with no container or metadata whatsoever. Every 16-bit sample is a value from −32768 to +32767, laid out in time order. Because there is no header, the file itself says nothing about its sample rate, bit depth, channel count, or byte order; those parameters live only in the context of whatever device exported the data. RAW PCM streams are common in DSP chip dumps, telephony recordings, professional recorder exports, and in the data recovery world (extracting audio from a truncated or corrupted WAV).",
    whyConvert:
      "WAV (RIFF/WAVE, defined by Microsoft/IBM in 1991) wraps those same PCM bytes in a 44-byte header that declares every playback parameter. Wrapping RAW data as WAV matters because: (1) universal playback — Windows Media Player, macOS Quick Look, and VLC all open WAV instantly but choke on headerless data; (2) DAW and NLE compatibility — Audition, Ableton, Logic, Premiere, and Final Cut all import WAV natively; (3) further processing — most encoders (mp3/opus/aac) and analysis tools require a headered container as input; (4) integrity — a RIFF chunk structure carries length fields that make truncation detectable.",
    howTo:
      "Step 1: Get your .raw/.pcm/.bin file (DSP dump, recorder export, or recovered audio stream). Step 2: Identify its parameters — if unknown, start with 44100 Hz / 16-bit / stereo, which covers the majority of consumer sources; embedded/telephony audio is often 8000 or 16000 Hz mono. Step 3: Drag the file in above and set sample rate, bit depth, and channels in the options panel. Step 4: Click Convert — the operation is pure I/O and completes instantly, even near the 500 MB limit. Step 5: Play the resulting .wav; if it sounds pitched-up, slowed, or like static, adjust the parameters and convert again.",
    vs: "RAW→WAV is a lossless container operation: the sample bytes are copied unchanged and a 44-byte header is prepended. The header's three blocks do the work: the RIFF chunk (bytes 0–11) identifies the file type and total length; the fmt chunk (bytes 12–35) declares audio format 1 (PCM), channels, sample rate, byte rate, block alignment, and bit depth; the data chunk (bytes 36–43) announces the payload length before the untouched samples follow. No resampling, quantization, or compression occurs — the output is mathematically identical to what the source would be with a correct header.",
    webOptions: [
      {
        key: "sampleRate",
        label: "Sample rate",
        default: "44100",
        choices: [
          { value: "8000", label: "8000 Hz (telephony)" },
          { value: "16000", label: "16000 Hz (VoIP)" },
          { value: "22050", label: "22050 Hz" },
          { value: "44100", label: "44100 Hz (CD)" },
          { value: "48000", label: "48000 Hz (video/pro)" },
          { value: "96000", label: "96000 Hz" },
        ],
      },
      {
        key: "bitsPerSample",
        label: "Bit depth",
        default: "16",
        choices: [
          { value: "8", label: "8-bit" },
          { value: "16", label: "16-bit (most common)" },
          { value: "24", label: "24-bit" },
          { value: "32", label: "32-bit" },
        ],
      },
      {
        key: "channels",
        label: "Channels",
        default: "2",
        choices: [
          { value: "1", label: "Mono" },
          { value: "2", label: "Stereo" },
        ],
      },
    ],
    faqs: [
      {
        question: "I don't know my RAW file's parameters. How do I find them?",
        answer:
          "Three practical methods: (1) trace the source device and search its audio specification; (2) open the file in a hex editor — 16-bit stereo data shows alternating low-magnitude left/right channel values; (3) trial and error: try 44100/16/stereo first. Wrong sample rate sounds sped-up or slowed; wrong bit depth sounds quiet and noisy; wrong channel count sounds spatially scrambled.",
      },
      {
        question: "The converted WAV is pure static. What's wrong?",
        answer:
          "Almost always a parameter mismatch, not a conversion fault. Big-endian data read as little-endian produces violent white noise; 8-bit data declared as 16-bit yields near-silence with heavy noise; a wrong sample rate keeps the audio recognizable but pitched wrong. Since conversion is instant and free, iterating on parameters is the fastest diagnostic.",
      },
      {
        question: "Is there any quality loss?",
        answer:
          "None. RAW to WAV is a pure container operation — the PCM bytes are copied verbatim and only the 44-byte header is added. No resampling, requantization, or compression happens, so the output is bit-for-bit identical to the source samples.",
      },
      {
        question: "Can I convert files larger than 500 MB?",
        answer:
          "The web tool handles up to 500 MB on desktop browsers and 100 MB on mobile. Because the operation is pure I/O with no decoding, even near-limit files finish in seconds. For bigger files, split the RAW stream first or use a local tool — the operation is trivially scriptable.",
      },
    ],
    relatedTools: ["raw-to-iso", "glb-to-gltf", "pvr-to-png"],
  },

  // 7) GLB to GLTF — A class
  {
    slug: "glb-to-gltf",
    id: "glb-to-gltf",
    name: "GLB to GLTF",
    className: "A",
    category: "3d",
    categoryLabel: "3D",
    sourceFormat: "GLB",
    targetFormat: "GLTF",
    sourceExt: ".glb",
    targetExt: ".gltf",
    title: "GLB to GLTF Converter – Free Online",
    metaDescription:
      "Convert GLB (glTF binary) to .gltf JSON free online. Browser-based, no upload. Text-editable, self-contained output. Works up to 200MB.",
    h1: "GLB to GLTF Converter",
    webMaxFilePc: 200 * MB,
    webMaxFileMobile: 50 * MB,
    desktopUnlimited: false,
    whatIs:
      "GLB (GL Binary) is the single-file binary form of glTF 2.0, the Khronos Group's runtime 3D format. A GLB is structured like a sandwich: a 12-byte header (magic 0x46546C67, version, total length) followed by chunks — a JSON chunk (type 0x4E4F534A) holding the full scene description (nodes, meshes, materials, animations, skins), and a BIN chunk (type 0x004E4942) holding the binary geometry, index, and animation keyframe data. One HTTP request loads an entire model, which is why Facebook 3D posts, Sketchfab, and e-commerce previews standardized on GLB.",
    whyConvert:
      "The single-file convenience becomes a liability in editing workflows. Splitting GLB into .gltf matters because: (1) text editing — .gltf is human-readable JSON, so you can hand-edit materials, node transforms, or animation data with any editor and diff changes in Git; (2) texture round-trips — artists edit images in Photoshop without repacking the container; (3) CDN caching — a small JSON file and binary payloads can be cached and updated independently; (4) debugging — validators and engine logs point at exact JSON paths instead of opaque binary offsets.",
    howTo:
      "Step 1: Get your .glb file (exported from Blender, downloaded from Sketchfab, or produced by any glTF pipeline). Step 2: Drag it into the conversion area above (up to 200 MB on desktop, 50 MB on mobile). Step 3: Click Convert — the header and chunks are parsed, the JSON document is extracted, and the binary buffer is embedded as a base64 data URI so the output stays a single self-contained file. Step 4: Download the .gltf, open it in any text editor to verify, and load it in Three.js/Babylon.js/three-gltf-viewer exactly as you would the original GLB.",
    vs: "GLB and .gltf are two serializations of the same data model — every mesh, material, animation, and extension is preserved. This tool outputs the embedded form: the JSON stays text-editable while buffers[0].uri becomes a data:application/octet-stream;base64 URI carrying the BIN chunk. Images referenced via bufferViews need no rewriting at all, since they point into the same (now embedded) buffer. Extensions such as KHR_mesh_draco_compression or KHR_materials_clearcoat pass through untouched.",
    faqs: [
      {
        question: "Why is the output one .gltf file instead of .gltf + .bin + textures?",
        answer:
          "Browsers download one file at a time, so a multi-file ZIP adds an unpacking step to every conversion. The embedded .gltf is the pragmatic default: fully spec-compliant, loads identically in Three.js/Babylon/Blender, and you keep text-editable JSON. If you specifically need separate .bin and texture files, unpack the data URI into a file — or use Microsoft's gltf-pipeline CLI on the output.",
      },
      {
        question: "Is the .gltf larger than the source GLB?",
        answer:
          "Yes, by roughly 33% of the buffer size: base64 encoding adds ~4 bytes per 3 bytes of binary. The JSON itself adds only formatting whitespace. If file size matters more than text-editability, keep the GLB; if editability matters, the overhead is the accepted trade-off (and gzip recovers most of it on the wire).",
      },
      {
        question: "Does Draco compression survive the conversion?",
        answer:
          "Yes. KHR_mesh_draco_compression data lives inside the buffer and its extension declaration lives in the JSON — both are extracted untouched. Loading the .gltf still requires a Draco decoder on the runtime side (for example DRACOLoader in Three.js), exactly as the original GLB would.",
      },
      {
        question: "My GLB fails with 'Not a valid GLB file'.",
        answer:
          "Check the first four bytes in a hex editor: they must read 67 6C 54 46 ('glTF' little-endian). Common causes: the file is actually a .gltf JSON renamed to .glb (then no conversion is needed), a truncated download, or a glTF 1.0 binary (magic 'glTF' with version 1 — unsupported, as the chunk layout differs).",
      },
    ],
    relatedTools: ["blend-to-glb", "prt-to-stl", "raw-to-wav"],
  },

  // 8) EOT to TTF — A class
  {
    slug: "eot-to-ttf",
    id: "eot-to-ttf",
    name: "EOT to TTF",
    className: "A",
    category: "font",
    categoryLabel: "Font",
    sourceFormat: "EOT",
    targetFormat: "TTF",
    sourceExt: ".eot",
    targetExt: ".ttf",
    title: "EOT to TTF Converter – Free Online",
    metaDescription:
      "Convert legacy Microsoft EOT web fonts back to TTF/OTF free online. Instant browser-based extraction. No upload. Auto-detects TrueType vs OpenType.",
    h1: "EOT to TTF Converter",
    webMaxFilePc: 10 * MB,
    webMaxFileMobile: 5 * MB,
    desktopUnlimited: false,
    whatIs:
      "EOT (Embedded OpenType) is the web-font format Microsoft created for Internet Explorer. An EOT file is a wrapper around a complete sfnt font: a small header (sizes, version, flags, PANOSE digits, a 0x504C magic number), a family of UTF-16 name strings, an optional domain-bound 'root string', and then the font data itself — usually the original TTF or OTF, byte-for-byte. Modern browsers never load EOT (WOFF2 won in 2014 and IE retired in 2022), but EOT files still sit in the CSS of many pre-2015 sites and in archived design assets.",
    whyConvert:
      "Extracting the embedded font back to TTF/OTF serves real workflows: (1) site modernization — replacing an @font-face stack whose EOT branch is now dead weight with WOFF2/TTF; (2) asset recovery — the original TTF is long gone, but the EOT served by the old CDN still contains it; (3) design archaeology — identifying and re-licensing a custom typeface used in a legacy brand site; (4) conversion pipelines — every modern font tool (fonttools, pyftsubset, WOFF2 compressors) accepts sfnt input, not EOT.",
    howTo:
      "Step 1: Obtain the .eot file — download the URL from the old site's @font-face rule, or pull it from a web archive snapshot or the DevTools network panel. Step 2: Drop it into the conversion area above (≤10 MB desktop, ≤5 MB mobile). Step 3: Click Convert — the header is validated, the name-string region is scanned for the sfnt signature, and the font data is extracted verbatim. Step 4: Download the output; the tool names it .ttf or .otf according to the sfnt version it found (0x00010000 or 'true' → TTF, 'OTTO' → OTF). Step 5: Install or embed the font and verify it renders.",
    vs: "Three web-font wrappers, one lineage: EOT (2007, Microsoft, IE-only) wraps sfnt with IE-specific metadata and optional MicroType compression; WOFF (2010, W3C) wraps the same sfnt with zlib compression and licensing fields; WOFF2 (2014, W3C) uses Brotli and is ~30% smaller still. Inside an uncompressed EOT, the font payload is plain sfnt — which is why extraction is lossless and instant. The subset information EOT optionally carries means the recovered font may contain fewer glyphs than the retail original.",
    faqs: [
      {
        question: "Some glyphs are missing after conversion. Why?",
        answer:
          "EOT supported subsetting: the site's generator may have embedded only the characters the page used (often just Latin). The extraction returns exactly what was embedded — the missing glyphs were never in the file. For a complete font you need the original TTF from your licensed source.",
      },
      {
        question: "Is converting EOT back to TTF legal?",
        answer:
          "It depends on the font license, not the format. If you (or your client) licensed the font, format conversion is normally permitted; extracting a commercial font from someone else's site for reuse is typically a license violation. Check the font's EULA before shipping the recovered TTF anywhere.",
      },
      {
        question: "The tool says my EOT uses MicroType compression.",
        answer:
          "A minority of EOT files (flag bit 0x4, produced by Microsoft WEFT with MicroType/MTX compression) store the font in a proprietary compressed form that no open decoder fully implements. Your practical options are finding the original font file, or an older IE-era machine that can install and re-export it.",
      },
      {
        question: "My file converted but the name is wrong — TTF vs OTF.",
        answer:
          "The extension follows the sfnt version field found in the extracted data: CFF-based OpenType ('OTTO') becomes .otf, TrueType becomes .ttf, and TrueType Collections ('ttcf') are saved as .ttf. If your desktop font app reports a different flavor, trust the app — some fonts are CFF outlines named .ttf by historical convention.",
      },
    ],
    relatedTools: ["kfx-to-epub", "sav-to-csv", "pvr-to-png"],
  },

  // 9) OPF to EPUB — A class
  {
    slug: "opf-to-epub",
    id: "opf-to-epub",
    name: "OPF to EPUB",
    className: "A",
    category: "ebook",
    categoryLabel: "eBook",
    sourceFormat: "OPF",
    targetFormat: "EPUB",
    sourceExt: ".zip",
    targetExt: ".epub",
    title: "OPF to EPUB Converter – Free Online",
    metaDescription:
      "Package OPF (Open Package Format) files with their resources into a valid EPUB 3 free online. Browser-based, no upload. Zip your OPF + XHTML + images.",
    h1: "OPF to EPUB Converter",
    webMaxFilePc: 50 * MB,
    webMaxFileMobile: 20 * MB,
    desktopUnlimited: false,
    whatIs:
      "An OPF file is the manifest at the heart of every EPUB: an XML document (conventionally named content.opf) with three jobs. <metadata> declares the title, creator, language, and unique identifier; <manifest> lists every file in the book — each XHTML chapter, stylesheet, image, and font — with its MIME type; <spine> fixes the linear reading order. An OPF contains no content itself; it is the recipe telling a reader how the sibling files assemble into a book. Loose OPF+XHTML+image folders typically come from InDesign exports, Sigil sessions, or unzipped EPUBs.",
    whyConvert:
      "Packaging the folder into a real .epub is what makes the book usable: (1) readers only open files — Apple Books, Calibre, and Kobo will not load a directory; (2) distribution requires a single artifact for upload, email, or store delivery; (3) validation — epubcheck and store ingest pipelines accept packages only; (4) the ZIP container carries OCF rules that ordinary zip tools get wrong (see below), so the packaging step is more than compression.",
    howTo:
      "Step 1: Collect the OPF and every file its manifest references, preserving relative paths. Step 2: Zip the folder (keep the structure — OPF, XHTML files, CSS, images together; no extra top-level nesting beyond what the hrefs expect). Step 3: Drop the .zip into the conversion area above (≤50 MB desktop, ≤20 MB mobile); a bare .opf also works when the book is manifest-only. Step 4: Click Convert — the OPF is parsed, every manifest href is verified against the archive, and a valid OCF container is written. Step 5: Download the .epub and open it in any reader or run epubcheck.",
    vs: "EPUB's container (OCF) is a ZIP with three non-negotiable rules that generic zippers routinely break: the first archive entry must be a file literally named mimetype, stored uncompressed, containing exactly application/epub+zip; META-INF/container.xml must point to the OPF's path inside the archive; and manifest hrefs must match archive paths case-sensitively. This tool enforces all three, generates container.xml, and adds an EPUB 3 nav document with a generated manifest entry when the OPF ships without one.",
    faqs: [
      {
        question: "Can I upload a folder instead of a ZIP?",
        answer:
          "Browsers can't hand a raw folder to a page, so zip it first — any OS-level 'Compress' works. Keep the internal structure identical to what the OPF's hrefs assume (if the manifest says images/cover.jpg, the archive must contain images/cover.jpg). Only a handful of files? A bare .opf upload also converts, producing the minimal book the manifest describes.",
      },
      {
        question: "Why did conversion fail with a list of missing files?",
        answer:
          "Every href in the OPF's manifest must exist inside your ZIP at the exact path and letter-case given. The error lists the first missing items. Fix paths in the OPF (or rename/move files in the ZIP) so they agree, then re-upload. Remote http(s) hrefs are ignored by the check — they pass through untouched.",
      },
      {
        question: "Will the output pass epubcheck?",
        answer:
          "If the OPF and its documents are themselves valid and complete, the package structure this tool writes — mimetype first and stored, container.xml, the OPF, a nav document — meets EPUB 3's container requirements. Content-level issues in your XHTML (broken IDs, undeclared entities) are your source's problems and surface in epubcheck separately.",
      },
      {
        question: "The book opens but has no table of contents.",
        answer:
          "If your OPF declares an item with properties=\"nav\", that document is used as-is. If not, a nav.xhtml is generated from the spine and linked into the manifest automatically. Its labels are file names — edit the generated nav or your original to give chapters human titles.",
      },
    ],
    relatedTools: ["kfx-to-epub", "eot-to-ttf", "sav-to-csv"],
  },

  // 10) SAV to CSV — A class
  {
    slug: "sav-to-csv",
    id: "sav-to-csv",
    name: "SAV to CSV",
    className: "A",
    category: "data",
    categoryLabel: "Data",
    sourceFormat: "SAV",
    targetFormat: "CSV",
    sourceExt: ".sav",
    targetExt: ".csv",
    extraSourceExts: [".zsav"],
    title: "SAV to CSV Converter – Free Online",
    metaDescription:
      "Convert IBM SPSS SAV data files to CSV free online. Browser-based, handles compressed .zsav, UTF-8 BOM for Excel. No upload. Up to 200MB.",
    h1: "SAV to CSV Converter",
    webMaxFilePc: 200 * MB,
    webMaxFileMobile: 50 * MB,
    desktopUnlimited: false,
    whatIs:
      "SAV is the native data format of IBM SPSS Statistics, the workhorse of social-science, survey, and clinical research since the 1990s. A SAV file is a self-describing binary database: a header stamped $FL2 (or $FL3 for the zlib-compressed .zsav variant) followed by a dictionary of variable records — name, numeric-or-string type, width, print format, missing-value definitions — and then the data matrix itself, stored either as raw 8-byte doubles or in SPSS's byte-compressed opcode stream. System-missing values (sysmis) are a reserved double sentinel, not a number.",
    whyConvert:
      "CSV is the lingua franca of data work, and SAV locks data inside one vendor's tool: (1) analysis elsewhere — pandas, R, Excel, Tableau, Power BI, and SQL loaders all consume CSV directly; (2) publication — journals and data repositories mandate plain-text open datasets; (3) durability — CSV is readable by anything, forever, while SAV needs SPSS or PSPP; (4) version control — text diffs and merges work; binary SAV diffs are meaningless; (5) handoff — collaborators without an SPSS license can still receive the data.",
    howTo:
      "Step 1: Export or obtain the .sav/.zsav file (SPSS: File → Save As, or a repository download). Step 2: Drag it into the conversion area above (≤200 MB desktop, ≤50 MB mobile) — compression is detected automatically. Step 3: Click Convert; the dictionary is parsed, the data matrix is decoded (uncompressed, byte-compressed, or zlib), and rows stream out. Step 4: Download the .csv — written with a UTF-8 BOM so Excel opens it without mojibake. Step 5: Verify the header row and a few values against SPSS.",
    vs: "What survives the export: every observed value, variable names as the header row, string contents in full, and missing values as empty cells. What CSV cannot carry: SPSS value-label mappings (1 = Male / 2 = Female), variable labels, missing-value range definitions, and multiple-response sets — those live only in the dictionary. Run SPSS's Automatic Recode first if you need labels in the data instead of codes.",
    faqs: [
      {
        question: "Excel shows garbled characters when opening the CSV.",
        answer:
          "This output is written with a UTF-8 BOM specifically so Excel detects the encoding. If you still see mojibake, the file was likely re-saved in another tool first. In Excel, use Data → From Text/CSV and explicitly choose UTF-8; in every other tool (pandas, R, Sheets) the BOM is handled transparently.",
      },
      {
        question: "Does it handle compressed .zsav files?",
        answer:
          "Yes. $FL3/zlib-compressed files are decompressed in the browser before decoding, transparently. Older $FL2 byte-compressed files (the opcode scheme most SPSS versions write by default) are also decoded, as are fully uncompressed files.",
      },
      {
        question: "How are missing values exported?",
        answer:
          "SPSS distinguishes system-missing and up to three user-defined missing values per variable. Both become empty cells in the CSV — the standard convention, since CSV has no native missing marker. If your downstream pipeline needs an explicit code (say -99), apply it in SPSS before export or post-process the CSV.",
      },
      {
        question: "My file has very long string variables. Will they break?",
        answer:
          "Strings up to 255 bytes convert cleanly, including embedded commas, quotes, and newlines (properly quoted/escaped in CSV). Variables longer than 255 bytes are stored by SPSS as multiple 8-byte segment records and appear in the CSV as separate columns — split them back in pandas if needed; this is noted as a current limitation.",
      },
    ],
    relatedTools: ["opf-to-epub", "eot-to-ttf", "raw-to-wav"],
  },
];

export function getTool(slug: string): ToolContent | undefined {
  return TOOLS.find((t) => t.slug === slug);
}
