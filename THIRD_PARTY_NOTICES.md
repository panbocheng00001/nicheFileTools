# nichefiletools — Open Source Declaration & Third-Party Notices

> **Project license**: [MIT](./LICENSE) · SPDX: `MIT` · Copyright © 2026 panbocheng00001 (nichefiletools)
>
> This document declares every third-party component the project depends on,
> how each is used (bundled / linked / spawned as a separate process), and the
> compliance obligations that follow. **Update this file whenever a dependency
> is added, upgraded, or removed** — the four sections below are the single
> source of truth for licensing audits.
>
> Last verified: 2026-08-30 (against `web/package.json`, `desktop/package.json`,
> `desktop/src-tauri/Cargo.toml`, and `desktop/src-tauri/tools.json`).

---

## 1. How to read this document

| Term | Meaning in this project |
|---|---|
| **Bundled (source)** | Dependency is imported in our source code; its code ships inside the npm/Cargo dependency graph |
| **Bundled (binary)** | A prebuilt binary blob is committed to the repository and served/shipped with the app |
| **Process-isolated engine** | An external program invoked as a **separate OS process** via command-line spawn. Its code never links into, nor is distributed with, this project |
| **Mere aggregation** | Distributing independent programs side-by-side. Process-isolated invocation is aggregation, not a derivative work — this is the boundary that keeps GPL engines from contaminating the MIT codebase |

---

## 2. Web app (`web/`) — npm dependencies

### 2.1 Runtime dependencies

| Package | Version | License | Used for |
|---|---|---|---|
| `next` | 15.1.6 | MIT | Framework (App Router, SSG) |
| `react`, `react-dom` | 19.0.0 | MIT | UI |
| `@ffmpeg/ffmpeg` | 0.12.15 | MIT | FFmpeg WASM loader API (GSM/MTS conversion) |
| `@ffmpeg/util` | 0.12.2 | MIT | FFmpeg WASM helpers (toBlobURL) |
| `@ffmpeg/core` | 0.12.10 | **LGPL-2.1-or-later** | FFmpeg compiled to WebAssembly — see §2.3 |
| `clsx` | 2.1.1 | MIT | Class name utility |
| `fontkit` | 2.0.4 | MIT | PFM/PFB → TTF (Type 1 metric parsing) |
| `framer-motion` | 13.1.1 | MIT | UI animation |
| `lucide-react` | 1.34.0 | ISC | Icon set |
| `next-themes` | 0.4.6 | MIT | Dark mode |
| `opentype.js` | 1.3.5 | MIT | TTF assembly (PFM → TTF) |
| `tailwind-merge` | 3.6.0 | MIT | Tailwind class dedup |
| `upng-js` | 2.1.0 | MIT | PNG encoding (EXR → PNG) |

### 2.2 Dev dependencies

| Package | Version | License |
|---|---|---|
| `tailwindcss`, `@tailwindcss/postcss` | 4.0.0 | MIT |
| `typescript` | 5.x | Apache-2.0 |
| `@types/node`, `@types/react`, `@types/react-dom` | latest | MIT (DefinitelyTyped) |

### 2.3 ⚠️ Prebuilt binary asset: `web/public/ffmpeg/ffmpeg-core.wasm`

- **What**: FFmpeg compiled to WebAssembly by the [ffmpegwasm](https://github.com/ffmpegwasm/ffmpeg.wasm) project, distributed via npm as `@ffmpeg/core` (~31 MB).
- **License**: **LGPL-2.1-or-later** (FFmpeg default configuration; this build does not enable GPL-only components such as x264).
- **Obligations being met**:
  - LGPL §4(d): The exact corresponding source is available at the upstream repository: `https://github.com/ffmpegwasm/ffmpeg.wasm` (core builds tag `@ffmpeg/core@0.12.10`) and `https://ffmpeg.org/download.html`.
  - LGPL §4(e): The notice in the LICENSE file and this section inform users that the LGPL applies to this component.
  - We do **not** statically link FFmpeg code into our own source; the WASM binary is loaded at runtime as an independent module.
- **If you swap in a GPL-enabled FFmpeg build** (e.g. with `--enable-gpl --enable-libx264`): the obligations change materially — that binary becomes GPL-2.0+, and you must offer the corresponding source for the exact binary you ship. Do not do this without updating this file and the LICENSE notice.

---

## 3. Desktop app frontend (`desktop/`) — npm dependencies

| Package | Version | License | Used for |
|---|---|---|---|
| `@tauri-apps/api` | 2.1.1 | MIT OR Apache-2.0 | Tauri IPC bridge |
| `@tauri-apps/plugin-dialog` | 2.0.1 | MIT OR Apache-2.0 | File/folder pickers |
| `@tauri-apps/plugin-shell` | 2.0.1 | MIT OR Apache-2.0 | Open URL in browser |
| `react`, `react-dom` | 18.3.1 | MIT | UI |

Dev dependencies:

| Package | Version | License |
|---|---|---|
| `@tauri-apps/cli` | 2.1.0 | MIT OR Apache-2.0 |
| `@vitejs/plugin-react` | 4.3.4 | MIT |
| `vite` | 5.4.11 | MIT |
| `vitest` | 4.1.11 | MIT |
| `typescript` | 5.6.3 | Apache-2.0 |

---

## 4. Desktop app backend (`desktop/src-tauri/`) — Rust dependencies

Dual-licensed crates below use `MIT OR Apache-2.0` (user's choice; we redistribute under both).

| Crate | Version | License | Used for |
|---|---|---|---|
| `tauri` | 2 | MIT OR Apache-2.0 | App shell / IPC |
| `tauri-build` | 2 | MIT OR Apache-2.0 | Build script |
| `tauri-plugin-dialog` | 2 | MIT OR Apache-2.0 | Native dialogs |
| `tauri-plugin-shell` | 2 | MIT OR Apache-2.0 | Shell open |
| `tauri-plugin-log` | 2 | MIT OR Apache-2.0 | Logging |
| `serde` / `serde_json` | 1 | MIT OR Apache-2.0 | Serialization (manifest, IPC) |
| `thiserror` | 1 | MIT OR Apache-2.0 | Error types |
| `image` | 0.25 (`exr` feature) | MIT OR Apache-2.0 | PNG/EXR encode-decode (PVR/EXR → PNG) |
| `zip` | 2 | MIT | OPF → EPUB packaging |
| `quick-xml` | 0.36 | MIT | OPF manifest parsing |
| `flate2` | 1 | MIT OR Apache-2.0 | WAD lump inflation (zlib) |
| `sha2` | 0.10 | MIT OR Apache-2.0 | Desktop unlock code (SHA-256) |
| `log` | 0.4 | MIT OR Apache-2.0 | Logging facade |

Notable transitive dependency pulled by `image`'s `exr` feature: the
`openexr` crate (**BSD-3-Clause**) links the OpenEXR C++ library
(**BSD-3-Clause**). Full transitive list: see `desktop/src-tauri/Cargo.lock`
(regenerate with `cargo license` or `cargo supply-chain` for an audit-grade
report).

---

## 5. External engines — process-isolated, NOT distributed with this project

These programs are **detected on the user's machine and invoked as separate
processes** (see `desktop/src-tauri/src/convert/sidecar/`). Their code is
never compiled into, linked with, or shipped inside this repository. This is
deliberate: it keeps GPL-licensed engines out of the MIT codebase (mere
aggregation, not derivative work).

| Engine | License | Tools that use it | Distribution model |
|---|---|---|---|
| **FFmpeg** (native static binary) | LGPL-2.1-or-later (default build) | gsm-to-wav, mts-to-mp4 | Planned: bundled with the desktop installer. **If bundled, LGPL §4/§6 applies — ship or link the exact source of the binary you bundle and reproduce the FFmpeg license text in the installer.** Until then: user-installed, auto-detected |
| **Blender** | GPL-3.0 | blend-to-glb | User-installed; detected via `BLENDER_CMD`. **Never bundle** — bundling GPL into a mixed installer requires the whole combined work to be offered under GPL-compatible terms |
| **Calibre** (`ebook-convert`) | GPL-3.0 | kfx-to-epub | User-installed; detected at runtime. Same rule: never bundle |
| **FreeCAD / OCCT** | LGPL-2.1+ (OCCT); LGPL-2.1+ (FreeCAD) | step-to-stl | User-installed; detected via `FREECAD_CMD` |
| **Python + fonttools** | MIT (fonttools); PSF (Python) | pfm-to-ttf (optional path) | User-installed sidecar |

**GPL compliance boundary (project red line, mirrors the engineering docs):**

1. Process isolation (`spawn` a subprocess with arguments and files) is the
   classic "arms-length" boundary recognized in practice: communicating with
   GPL software via its command line does not make the caller a derivative
   work. This is how countless proprietary CI systems, editors, and build
   tools invoke GPL compilers lawfully.
2. **Do not link GPL code** into the Rust binary, do not vendor GPL sources
   into this repository, and do not bundle GPL binaries in installers.
3. **LGPL nuance for FFmpeg**: if a native FFmpeg binary is later bundled for
   convenience, prefer a dynamically linked build and provide the
   corresponding source + build script for that exact binary, plus the LGPL
   license text in the installer's license page. Document it in §5 above.

---

## 6. System components used by the desktop app

Tauri renders through the OS webview, which brings its own terms:

| Platform | Component | Terms |
|---|---|---|
| Windows | Microsoft Edge WebView2 Runtime | Proprietary, free-of-charge system component (rendered under the Microsoft Software License Terms that ship with Windows) |
| macOS | WKWebView | Part of macOS, under Apple's system software license |
| Linux | WebKitGTK | LGPL-2.1 (system library) |

We do not redistribute these; the app requires them as preinstalled system
components.

---

## 7. Trademarks

"Kindle", "Amazon" and "KFX" are trademarks of Amazon.com, Inc. "Blender" is
a trademark of the Blender Foundation. "Calibre" is a trademark of Kovid
Goyal. "SPSS" is a trademark of IBM. "Creo" and "PTC" are trademarks of PTC
Inc. "PowerPoint" and "Windows" are trademarks of Microsoft. This project is
not affiliated with, endorsed by, or sponsored by any of them. All format
names are used descriptively to identify interoperability, which is the
intended purpose of those formats.

---

## 8. Maintenance rules (keep this file true)

1. **Adding a dependency**: append it to the correct table above with its
   SPDX license before merging. CI step (recommended): `npm ls --json` /
   `cargo license` diff against this file.
2. **Upgrading a copyleft-licensed component** (`@ffmpeg/core` today):
   re-verify the license of the new version and update §2.3 if the build
   flags changed.
3. **Bundling any new binary** into `web/public/` or the desktop installer:
   it MUST get its own subsection (like §2.3) with source-offer links.
4. Source of truth for version numbers: `package-lock.json` (×2) and
   `Cargo.lock`. This document lists the direct dependency constraints; the
   lockfiles are the audit trail for the exact builds in a release.
