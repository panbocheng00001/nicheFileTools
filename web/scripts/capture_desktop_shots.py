"""Desktop-UI guide-screenshot capture pipeline (SEO spec §三.2/§四).

Captures the DESKTOP-APP portion of the /convert/[slug] shot lists from the
desktop frontend running in browser preview mode (`cd desktop && npm run dev`
on :5173). Outside Tauri, lib/mock.ts shims every IPC call, so the real
React UI can be driven into each state a guide describes:

    selected   tool open in the app (locked first-run state)
    searched   tool picked from a search-filtered sidebar list
    queued     files in the batch queue (mock pick, ?files= names)
    running    conversion in flight (unlock seeded, ?engineOk=1)

Two preview-only capture hooks in mock.ts make this possible:
    ?engineOk=1   all engines report installed (banner hidden, Convert enabled)
    ?files=a,b,c  the file picker returns those base names

Shots land in web/public/convert/<web-slug>/ as 1200 px lossless WebP, same
conventions as capture_shots.py. Third-party/OS scenes (Creo, SPSS, hex
editors, Explorer, players) are NOT capturable here — they stay pending for a
WorkBuddy desktop session.

Usage:
    1. cd desktop && npm run dev
    2. python web/scripts/capture_desktop_shots.py
"""

import io
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright
from PIL import Image

WEB_ROOT = Path(__file__).resolve().parent.parent
PUBLIC_CONVERT = WEB_ROOT / "public" / "convert"
BASE = "http://localhost:5173/"

LS_LICENSES = "nft_preview_licenses"

# (web-slug, filename, desktop tool name, desktop slug, recipe, files)
# recipes: selected | searched | queued | running
SHOTS = [
    # ---- blend-to-glb (engine: blender) ----
    ("blend-to-glb", "blend-to-glb-desktop-app-launch.webp", "BLEND to GLB", "blend-to-glb", "selected", None),
    ("blend-to-glb", "blend-to-glb-tool-list.webp", "BLEND to GLB", "blend-to-glb", "searched", "blend"),
    ("blend-to-glb", "blend-to-glb-file-select.webp", "BLEND to GLB", "blend-to-glb", "queued", ["forest-scene"]),
    ("blend-to-glb", "blend-to-glb-converting-progress.webp", "BLEND to GLB", "blend-to-glb", "running", ["forest-scene"]),
    # ---- kfx-to-epub (engine: calibre) ----
    ("kfx-to-epub", "kfx-to-epub-tool-sidebar.webp", "KFX to EPUB", "kfx-to-epub", "searched", "kfx"),
    ("kfx-to-epub", "kfx-to-epub-file-pick.webp", "KFX to EPUB", "kfx-to-epub", "queued", ["the-northern-ridge"]),
    ("kfx-to-epub", "kfx-to-epub-convert-progress.webp", "KFX to EPUB", "kfx-to-epub", "running", ["the-northern-ridge"]),
    # ---- mts-to-mp4 (engine: ffmpeg) ----
    ("mts-to-mp4", "mts-to-mp4-desktop-batch.webp", "MTS to MP4", "mts-to-mp4", "running",
     ["beach-holiday", "city-walk", "sunset-boat", "birthday-party"]),
    # ---- pfm-to-ttf (engine: python-fonttools) ----
    ("pfm-to-ttf", "pfm-to-ttf-desktop-batch-fonts.webp", "PFM/PFB to TTF", "pfm-to-ttf", "running",
     ["garamond-display", "interstate-signs", "century-book", "caslon-text"]),
    # ---- pvr-to-png (rust-native) ----
    ("pvr-to-png", "pvr-to-png-desktop-app-launch.webp", "PVR to PNG", "pvr-to-png", "selected", None),
    ("pvr-to-png", "pvr-to-png-tool-selected.webp", "PVR to PNG", "pvr-to-png", "searched", "pvr"),
    ("pvr-to-png", "pvr-to-png-texture-folder-batch.webp", "PVR to PNG", "pvr-to-png", "queued",
     ["asphalt_01", "concrete_02", "brick_wall_a", "grass_patch"]),
    # ---- raw-to-iso (rust-native) ----
    ("raw-to-iso", "raw-to-iso-desktop-tool-open.webp", "RAW to ISO", "raw-to-iso", "selected", None),
    ("raw-to-iso", "raw-to-iso-disc-image-select.webp", "RAW to ISO", "raw-to-iso", "queued", ["disc-01"]),
    ("raw-to-iso", "raw-to-iso-sector-progress.webp", "RAW to ISO", "raw-to-iso", "running", ["disc-01"]),
    ("raw-to-iso", "raw-to-iso-batch-archive-folder.webp", "RAW to ISO", "raw-to-iso", "queued",
     ["disc-1998-backup", "disc-2001-photos", "dvd-rip-2004", "cd-audio-1995"]),
    # ---- prt-to-stl (desktop tool: step-to-stl, engine: occt) ----
    ("prt-to-stl", "prt-to-stl-desktop-app-freecad-check.webp", "STEP/IGES/BREP to STL", "step-to-stl", "banner", None),
    ("prt-to-stl", "prt-to-stl-tool-selected.webp", "STEP/IGES/BREP to STL", "step-to-stl", "searched", "step"),
    ("prt-to-stl", "prt-to-stl-stp-file-chosen.webp", "STEP/IGES/BREP to STL", "step-to-stl", "queued", ["bracket-part"]),
    ("prt-to-stl", "prt-to-stl-tessellation-progress.webp", "STEP/IGES/BREP to STL", "step-to-stl", "running", ["bracket-part"]),
    # ---- wad-extractor (rust-native) ----
    ("wad-extractor", "wad-extractor-desktop-tool.webp", "WAD Extractor", "wad-extractor", "selected", None),
    ("wad-extractor", "wad-extractor-extract-progress.webp", "WAD Extractor", "wad-extractor", "running", ["DOOM.WAD"]),
    # ---- gsm-to-wav (engine: ffmpeg) ----
    ("gsm-to-wav", "gsm-to-wav-desktop-batch-flac.webp", "GSM to WAV", "gsm-to-wav", "running",
     ["voicemail-001", "voicemail-002", "voicemail-003", "voicemail-004"]),
]

# The engine-missing banner shot intentionally keeps the banner; every other
# shot forces engines installed so Convert works and the UI is clean.
BANNER_RECIPES = {"banner"}


def build_url(recipe: str, files: list[str] | None) -> str:
    params = []
    if recipe not in BANNER_RECIPES:
        params.append("engineOk=1")
    if files and recipe in ("queued", "running"):
        params.append("files=" + ",".join(files))
    return BASE + ("?" + "&".join(params) if params else "")


def prepare(page, tool_name: str, recipe: str, search_query: str | None):
    page.wait_for_selector("button.navitem")
    page.locator("button.navitem", has_text=tool_name).first.click()
    page.wait_for_selector(".tool-card")
    if recipe == "banner":
        page.wait_for_selector(".engine-warn")
    elif recipe == "searched":
        page.fill(".sidebar-search", search_query)
        page.wait_for_timeout(250)
    if recipe in ("queued", "running"):
        page.locator('.dropzone-actions button:has-text("Choose files")').first.click()
        page.wait_for_selector(".queue-item")
        page.wait_for_timeout(350)


def fit_viewport_to_content(page):
    """The app is a 100vh flex layout with an inner-scrolling content pane, so
    a fixed 900px viewport cuts the queue off below the fold. Grow the window
    until the whole tool card fits, then assert nothing overflows."""
    needed = page.evaluate(
        """() => {
            const c = document.querySelector('main.content');
            // +60: headroom for the status line that appears once Convert is
            // clicked (running shots resize before the click).
            return Math.ceil(c.getBoundingClientRect().top + c.scrollHeight + 60);
        }"""
    )
    height = max(820, needed)
    page.set_viewport_size({"width": 1280, "height": height})
    page.wait_for_timeout(250)
    overflow = page.evaluate(
        """() => {
            const c = document.querySelector('main.content');
            return c.scrollHeight - c.clientHeight;
        }"""
    )
    if overflow > 2:
        raise RuntimeError(f"content still overflows viewport by {overflow}px")


def capture_shot(pw, shot) -> bytes:
    web_slug, fname, tool_name, dslug, recipe, files = shot
    browser = pw.chromium.launch()
    ctx = browser.new_context(viewport={"width": 1280, "height": 900}, device_scale_factor=1)
    page = ctx.new_page()
    page.on("console", lambda m: m.type == "error" and print(f"  [console] {m.text}"))
    try:
        if recipe == "running":
            # Seed a valid hourly license so mockConvertBatch's license gate passes.
            expiry = int((time.time() + 3600) * 1000)
            page.add_init_script(
                f"localStorage.setItem({LS_LICENSES!r}, JSON.stringify({{ {dslug!r}: {expiry} }}))"
            )
        page.goto(build_url(recipe, files), wait_until="networkidle")
        # The browser-preview banner is a dev-only artifact — the real Tauri
        # app never shows it, so keep it out of the shots.
        page.add_style_tag(content=".preview-banner { display: none !important; }")
        prepare(page, tool_name, recipe, files)
        fit_viewport_to_content(page)

        if recipe == "running":
            page.locator("button.btn.primary:has-text('Convert')").first.click()
            page.wait_for_selector(".queue-item.status-running", timeout=5_000)
            page.wait_for_timeout(200)
            if page.locator(".queue-item.status-running").count() == 0:
                raise RuntimeError("conversion finished before capture — retry")

        png = page.screenshot(full_page=True)
        return png
    finally:
        browser.close()


def main() -> int:
    done, failed = [], []
    with sync_playwright() as pw:
        for shot in SHOTS:
            web_slug, fname = shot[0], shot[1]
            print(f"{web_slug}/{fname} [{shot[4]}]")
            png = None
            for attempt in range(3):
                try:
                    png = capture_shot(pw, shot)
                    break
                except Exception as e:  # noqa: BLE001 — retry transient timing
                    print(f"  attempt {attempt + 1} failed: {e}")
            if png is None:
                failed.append((web_slug, fname))
                continue
            target = PUBLIC_CONVERT / web_slug / fname
            target.parent.mkdir(parents=True, exist_ok=True)
            img = Image.open(io.BytesIO(png)).convert("RGB")
            if img.width != 1200:
                img = img.resize((1200, round(img.height * 1200 / img.width)), Image.LANCZOS)
            img.save(target, "WEBP", lossless=True, method=6)
            kb = target.stat().st_size / 1024
            print(f"  saved {target.relative_to(PUBLIC_CONVERT)} ({kb:.0f} KB, {img.height}px tall)")
            done.append((web_slug, fname))

    print("\n===== SUMMARY =====")
    print(f"captured: {len(done)}   failed: {len(failed)}")
    for s, f in failed:
        print(f"  FAILED  {s}/{f}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
