"""Capture the engine-missing banner screenshot for /help/engines.

Runs the desktop frontend in browser preview mode (vite dev server on :5173,
where every non-built-in engine is reported missing by lib/mock.ts), opens a
tool that needs an external engine, and saves a 1280x900 shot to
web/public/help/engine-missing-banner.png — same dimensions as the other
/help interface shots.

Usage:
    1. cd desktop && npm run dev
    2. python web/scripts/capture_engine_banner.py
"""

import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parents[1] / "public" / "help" / "engine-missing-banner.png"
BASE = "http://localhost:5173/"
TOOL_NAME = "BLEND to GLB"  # single external engine (Blender) -> clean banner


def main() -> int:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 900})
        page.goto(BASE, wait_until="networkidle")
        page.wait_for_selector(".navitem")

        page.locator("button.navitem", has_text=TOOL_NAME).first.click()
        page.wait_for_selector(".engine-warn")
        page.wait_for_timeout(800)  # let transitions settle

        banner = page.locator(".engine-warn").inner_text()
        convert_label = page.locator("button.convert-btn, .btn.convert-btn").first
        print("---- banner text ----")
        print(banner)
        print("---- convert button ----")
        print(convert_label.inner_text() if convert_label.count() else "(not found)")

        OUT.parent.mkdir(parents=True, exist_ok=True)
        page.screenshot(path=str(OUT))
        print(f"saved: {OUT}")
        browser.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
