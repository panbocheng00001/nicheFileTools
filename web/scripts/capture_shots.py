#!/usr/bin/env python
"""
Guide-screenshot capture pipeline (SEO spec §三.2/§四, WorkBuddy 流水线).

Captures the WEB-UI portion of the /convert/[slug] shot lists straight from
a running site build, converts each capture to lossless WebP (1200 px wide),
and writes them to a staging directory — or straight into
web/public/convert/<slug>/ with --deploy, where the guide template's fs
guard picks them up automatically.

Domain rule (spec v2.2 §三.2 relaxed): the converter UI renders identically
on a local production build and on the live domain — no localhost text,
URL bar, or hostname appears in any captured frame — so localhost captures
ARE safe to deploy straight into web/public/convert/<slug>/. Two flows:

    # pre-launch (local prod build → straight into public/)
    npm run build && npm run start
    python scripts/capture_shots.py --base http://localhost:3000 --deploy

    # post-launch (production captures, auto-rendered by the guides)
    python scripts/capture_shots.py --deploy

Desktop-app / third-party scenes (Creo, hex editors, slicers, readers, the
Tauri app itself) are NOT web-capturable: the script lists them as PENDING
for a WorkBuddy desktop session at the end.

Dependencies: playwright (already installed for test/test_seo.py),
Pillow (pip install pillow) for lossless WebP.
"""
import argparse
import io
import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright
from PIL import Image

WEB_ROOT = Path(__file__).resolve().parent.parent
REPO_ROOT = WEB_ROOT.parent
CONTENT_TS = WEB_ROOT / "src" / "lib" / "convert-content.ts"
FIXTURES = REPO_ROOT / "manual-test-fixtures"
PUBLIC_CONVERT = WEB_ROOT / "public" / "convert"

# ---------------------------------------------------------------------------
# Shot lists: web-capturable subset, keyed (slug, filename) → recipe.
# Recipes:
#   empty      converter section, no file chosen
#   loaded     fixture selected (options panel + Convert button visible)
#   loaded2    two-file tools: main + companion selected (pfm)
#   converting fixture selected, Convert clicked, capture ~400 ms in
#   result     conversion finished, result panel visible
#   unlock     sidebar DesktopCodeCard element
# Everything not listed here is a desktop/3rd-party scene (PENDING).
# ---------------------------------------------------------------------------
RECIPES: dict[tuple[str, str], tuple[str, dict]] = {
    # kfx
    ("kfx-to-epub", "kfx-to-epub-hourly-unlock-code.webp"): ("unlock", {}),
    # pvr
    ("pvr-to-png", "pvr-to-png-online-converter-upload.webp"): ("empty", {}),
    # raw-to-wav
    ("raw-to-wav", "raw-to-wav-audio-drop-zone.webp"): ("empty", {}),
    ("raw-to-wav", "raw-to-wav-parameter-options.webp"): ("loaded", {"params": {"sampleRate": "48000", "bitsPerSample": "24"}}),
    ("raw-to-wav", "raw-to-wav-convert-button.webp"): ("loaded", {}),
    # glb
    ("glb-to-gltf", "glb-to-gltf-drop-zone.webp"): ("empty", {}),
    ("glb-to-gltf", "glb-to-gltf-converting-browser.webp"): ("loaded", {}),
    # eot
    ("eot-to-ttf", "eot-to-ttf-upload.webp"): ("empty", {}),
    ("eot-to-ttf", "eot-to-ttf-extraction.webp"): ("loaded", {}),
    ("eot-to-ttf", "eot-to-ttf-output-ttf-otf.webp"): ("result", {}),
    # opf
    ("opf-to-epub", "opf-to-epub-upload-zip.webp"): ("empty", {}),
    ("opf-to-epub", "opf-to-epub-manifest-check.webp"): ("loaded", {}),
    # sav
    ("sav-to-csv", "sav-to-csv-upload.webp"): ("empty", {}),
    ("sav-to-csv", "sav-to-csv-dictionary-parse.webp"): ("loaded", {}),
    # pfm (main .pfm first, companion .pfb second input)
    ("pfm-to-ttf", "pfm-to-ttf-two-dropzones.webp"): ("loaded", {}),
    ("pfm-to-ttf", "pfm-to-ttf-converting.webp"): ("loaded2", {}),
    # exr
    ("exr-to-png", "exr-to-png-exr-render.webp"): ("loaded", {}),
    ("exr-to-png", "exr-to-png-tone-map-options.webp"): ("loaded", {"params": {"toneMap": "aces"}}),
    ("exr-to-png", "exr-to-png-converting.webp"): ("converting", {}),
    ("exr-to-png", "exr-to-png-png-compare.webp"): ("result", {}),
    ("exr-to-png", "exr-to-png-exposure-adjust.webp"): ("loaded", {"params": {"exposure": "3"}}),
    # gsm / mts (FFmpeg WASM load makes the converting state holdable)
    ("gsm-to-wav", "gsm-to-wav-upload.webp"): ("empty", {}),
    ("gsm-to-wav", "gsm-to-wav-decode-progress.webp"): ("converting", {}),
    ("mts-to-mp4", "mts-to-mp4-upload-browser.webp"): ("empty", {}),
    ("mts-to-mp4", "mts-to-mp4-remux-progress.webp"): ("converting", {}),
}

# One fixture per web tool that has a web-capturable shot.
FIXTURE = {
    "pvr-to-png": FIXTURES / "pvr-to-png" / "B8G8R8A8_UNORM_sRGB_RGBA_T.pvr",
    "raw-to-wav": FIXTURES / "raw-to-wav" / "sine.raw",
    "glb-to-gltf": FIXTURES / "glb-to-gltf" / "Box.glb",
    "eot-to-ttf": FIXTURES / "eot-to-ttf" / "font.eot",
    "opf-to-epub": FIXTURES / "opf-to-epub" / "epub-source.zip",
    "sav-to-csv": FIXTURES / "sav-to-csv" / "Kappa.sav",
    "pfm-to-ttf": FIXTURES / "pfm-to-ttf" / "cmr10.pfm",
    "pfm-companion": FIXTURES / "pfm-to-ttf" / "cmr10.pfb",
    "exr-to-png": FIXTURES / "exr-to-png" / "Desk.exr",
    "gsm-to-wav": FIXTURES / "gsm-to-wav" / "voice-test.gsm",
    "mts-to-mp4": FIXTURES / "mts-to-mp4" / "sample_960x400_ocean_with_audio.mts",
}

CONVERTER_SEL = 'section[aria-label="Conversion tool"]'
UNLOCK_CARD_SEL = 'aside.glass-panel:has-text("Desktop unlock code")'
RESULT_SEL = 'text=Done —'


def parse_shot_list() -> dict[str, list[str]]:
    """Extract slug → [filenames] from convert-content.ts (drift guard)."""
    text = CONTENT_TS.read_text(encoding="utf-8")
    out: dict[str, list[str]] = {}
    # Slice per guide object: from each `slug: "..."` occurrence to the next
    # one, so a guide's screenshots array can never be attributed to a
    # neighbouring guide.
    marks = list(re.finditer(r'slug:\s*"([^"]+)"', text))
    for i, m in enumerate(marks):
        slug = m.group(1)
        end = marks[i + 1].start() if i + 1 < len(marks) else len(text)
        body = text[m.start():end]
        files = re.findall(r'file:\s*"([^"]+)"', body)
        if files:
            out[slug] = files
    return out


def capture(pw, base: str, out_dir: Path):
    shot_list = parse_shot_list()
    listed = {(s, f) for s, files in shot_list.items() for f in files}
    unknown = set(RECIPES) - listed
    if unknown:
        sys.exit(f"RECIPES reference files missing from convert-content.ts: {sorted(unknown)}")

    browser = pw.chromium.launch()
    ctx = browser.new_context(viewport={"width": 1280, "height": 940}, device_scale_factor=1)
    page = ctx.new_page()
    page.on("console", lambda m: m.type == "error" and print(f"  [console] {m.text}"))

    done, failed = [], []
    for (slug, fname), (recipe, opts) in RECIPES.items():
        url = f"{base}/tools/{slug}"
        try:
            print(f"{slug}/{fname} [{recipe}]")
            page.goto(url, wait_until="networkidle")
            page.wait_for_timeout(600)

            if recipe == "unlock":
                page.wait_for_selector(UNLOCK_CARD_SEL, timeout=10_000)
                page.wait_for_function(
                    """() => /[0-9A-Z]{4}-[0-9A-Z]{4}/.test(
                        document.querySelector('aside.glass-panel code')?.textContent ?? '')""",
                    timeout=10_000,
                )
                el = page.locator(UNLOCK_CARD_SEL).first
                png = el.screenshot()
            else:
                section = page.locator(CONVERTER_SEL).first
                if recipe != "empty":
                    fx = FIXTURE[slug]
                    if not fx.exists():
                        raise FileNotFoundError(f"fixture missing: {fx}")
                    page.set_input_files(f'{CONVERTER_SEL} input[type="file"]', str(fx))
                    if recipe == "loaded2":
                        page.locator(f'{CONVERTER_SEL} input[type="file"]').nth(1).set_input_files(str(FIXTURE["pfm-companion"]))
                    _set_params(page, opts.get("params", {}))
                    page.wait_for_timeout(400)
                    if recipe in ("converting", "result"):
                        page.click(f'{CONVERTER_SEL} button:has-text("Convert")')
                        if recipe == "converting":
                            page.wait_for_timeout(400)
                        else:
                            page.wait_for_selector(RESULT_SEL, timeout=120_000)
                png = section.screenshot()

            target = out_dir / slug / fname
            target.parent.mkdir(parents=True, exist_ok=True)
            img = Image.open(io.BytesIO(png)).convert("RGB")
            if img.width != 1200:
                img = img.resize((1200, round(img.height * 1200 / img.width)), Image.LANCZOS)
            img.save(target, "WEBP", lossless=True, method=6)
            kb = target.stat().st_size / 1024
            flag = "" if kb <= 300 else "  [>300KB — recompress]"
            print(f"  saved {target.relative_to(out_dir)} ({kb:.0f} KB){flag}")
            done.append((slug, fname))
        except Exception as e:  # noqa: BLE001 — pipeline keeps going on single failures
            print(f"  FAILED: {e}")
            failed.append((slug, fname))

    browser.close()

    pending = sorted(listed - set(RECIPES))
    print("\n===== SUMMARY =====")
    print(f"captured: {len(done)}   failed: {len(failed)}   pending-desktop: {len(pending)}")
    for slug, fname in failed:
        print(f"  FAILED  {slug}/{fname}")
    print("PENDING desktop/3rd-party scenes (need WorkBuddy desktop session):")
    for slug, fname in pending:
        print(f"  {slug}/{fname}")


def _set_params(page, params: dict):
    """Select option values inside the options panel (selects appear in
    webOptions order; match by option value)."""
    if not params:
        return
    selects = page.locator(f'{CONVERTER_SEL} select')
    n = selects.count()
    keys = list(params)
    for i in range(min(n, len(keys))):
        try:
            selects.nth(i).select_option(params[keys[i]])
        except Exception as e:  # noqa: BLE001
            print(f"  [param {keys[i]}] {e}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="https://nichefiletools.com")
    ap.add_argument("--out", default=None, help="staging dir (default .workbuddy/shots-staging)")
    ap.add_argument("--deploy", action="store_true",
                    help="write into web/public/convert/<slug>/ (renders identically on localhost & live domain)")
    args = ap.parse_args()

    if args.deploy:
        # localhost captures ARE allowed into public/: the screenshots only
        # show the in-browser converter UI, which renders identically on a
        # local production build (`npm run build && npm run start`) and on the
        # live domain — no localhost text appears in the captured frames.
        # Spec v2.2 §三.2 relaxed: localhost --deploy permitted.
        out_dir = PUBLIC_CONVERT
    else:
        out_dir = Path(args.out) if args.out else REPO_ROOT / ".workbuddy" / "shots-staging"

    with sync_playwright() as pw:
        capture(pw, args.base.rstrip("/"), out_dir)


if __name__ == "__main__":
    main()
