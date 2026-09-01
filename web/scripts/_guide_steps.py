import re

from pathlib import Path

text = Path(__file__).resolve().parents[1].joinpath("src/lib/convert-content.ts").read_text(encoding="utf-8")

for slug in ("wad-extractor", "prt-to-stl", "sav-to-csv", "blend-to-glb", "kfx-to-epub"):
    m = re.search(r'slug: "' + slug + '"', text)
    end = text.find('slug: "', m.end())
    body = text[m.start():end]
    ds = re.search(r"desktopSteps: \[(.*?)\n  \]", body, re.S)
    print(f"===== {slug} desktopSteps =====")
    print(ds.group(1)[:2600] if ds else "(none)")
    print()
