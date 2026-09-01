import re
from pathlib import Path

text = Path(__file__).resolve().parents[1].joinpath("src/lib/convert-content.ts").read_text(encoding="utf-8")

for slug in ("gsm-to-wav", "mts-to-mp4", "pfm-to-ttf", "pvr-to-png", "opf-to-epub",
             "sav-to-csv", "raw-to-iso", "eot-to-ttf", "glb-to-gltf", "raw-to-wav"):
    m = re.search(r'slug: "' + slug + r'"', text)
    if not m:
        continue
    end = text.find('slug: "', m.end())
    body = text[m.start():end]
    print(f"===== {slug} =====")
    for hit in re.findall(r'"([^"]*(?:[Ff]older|[Ee]xplorer|[Ff]ile|[Ff]ind|[Ll]ocate)[^"]*)"', body):
        if len(hit) < 200:
            print("  •", hit)
    print()
