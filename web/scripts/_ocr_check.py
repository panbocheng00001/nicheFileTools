"""OCR-verify a list of captured webp shots (convert to png, run ocr.ps1)."""

import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

HERE = Path(__file__).parent


def ocr(path: Path) -> str:
    with tempfile.TemporaryDirectory() as td:
        png = Path(td) / "o.png"
        Image.open(path).convert("RGB").save(png, "PNG")
        r = subprocess.run(
            ["powershell", "-NoProfile", "-File", str(HERE / "ocr.ps1"), str(png)],
            capture_output=True, text=True, timeout=120)
        return (r.stdout or "").strip()


if __name__ == "__main__":
    targets = sys.argv[1:]
    for t in targets:
        p = Path(t)
        text = ocr(p)
        head = " | ".join(text.splitlines()[:6])
        print(f"--- {p.name}: {head[:300]}")
