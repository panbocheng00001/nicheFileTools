"""Prepare every remaining intermediate asset for the native-shot pipeline.

- forest-scene.gltf      : GLB unpacked to .gltf with the buffer embedded as a
                           base64 data URI (exactly what the web tool emits)
- voicemail-001.wav      : real GSM decode via ffmpeg
- book.epub              : epub-source packaged as a valid OCF ZIP
                           (mimetype first, stored)
- survey_2024-variables.txt : variable names + labels pulled from the .sav

Run:  python web/scripts/_prep_native_assets.py
"""

import base64
import json
import shutil
import struct
import subprocess
import zipfile
from pathlib import Path

ROOT = Path(r"C:\nft-scenes")
MODELS = ROOT / "models"


def ffmpeg() -> str:
    from imageio_ffmpeg import get_ffmpeg_exe

    return get_ffmpeg_exe()


def glb_to_gltf() -> None:
    glb = (MODELS / "forest-scene.glb").read_bytes()
    magic, version, length = struct.unpack("<III", glb[:12])
    assert magic == 0x46546C67, "not a GLB"
    off = 12
    doc = None
    bin_chunk = None
    while off < length:
        clen, ctype = struct.unpack("<II", glb[off : off + 8])
        chunk = glb[off + 8 : off + 8 + clen]
        if ctype == 0x4E4F534A:
            doc = json.loads(chunk)
        elif ctype == 0x004E4942:
            bin_chunk = chunk
        off += 8 + clen
    assert doc and bin_chunk is not None
    doc["buffers"][0]["uri"] = (
        "data:application/octet-stream;base64," + base64.b64encode(bin_chunk).decode()
    )
    out = MODELS / "forest-scene.gltf"
    out.write_text(json.dumps(doc, indent=2), encoding="utf-8")
    print(f"forest-scene.gltf: {out.stat().st_size} bytes")


def voicemail_wav() -> None:
    vm = ROOT / "voicemail-export"
    r = subprocess.run(
        [ffmpeg(), "-y", "-loglevel", "error", "-i", str(vm / "voicemail-001.gsm"),
         "-ar", "8000", "-ac", "1", "-c:a", "pcm_s16le", str(vm / "voicemail-001.wav")],
        capture_output=True, text=True,
    )
    ok = r.returncode == 0 and (vm / "voicemail-001.wav").exists()
    print("voicemail-001.wav:", "ok" if ok else f"FAILED {r.stderr[-200:]}")


def book_epub() -> None:
    src = ROOT / "epub-source"
    (src / "mimetype").write_text("application/epub+zip", encoding="ascii")
    meta = src / "META-INF"
    meta.mkdir(exist_ok=True)
    (meta / "container.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">\n'
        '  <rootfiles>\n'
        '    <rootfile full-path="content.opf" media-type="application/oebps-package+xml"/>\n'
        '  </rootfiles>\n'
        "</container>\n",
        encoding="utf-8",
    )
    out = ROOT / "epub-source" / "book.epub"
    if out.exists():
        out.unlink()
    with zipfile.ZipFile(out, "w") as z:
        z.write(src / "mimetype", "mimetype", compress_type=zipfile.ZIP_STORED)
        for p in sorted(src.rglob("*")):
            if p.is_file() and p.name not in ("book.epub", "mimetype") and p.parent.name != "META-INF":
                z.write(p, p.relative_to(src).as_posix(), zipfile.ZIP_DEFLATED)
        z.write(meta / "container.xml", "META-INF/container.xml", zipfile.ZIP_DEFLATED)
    print(f"book.epub: {out.stat().st_size} bytes")


def sav_variables() -> None:
    import pyreadstat

    df, meta = pyreadstat.read_sav(ROOT / "spss-export" / "survey_2024.sav")
    lines = ["survey_2024.sav — variable dictionary", ""]
    lines.append(f"{'name':<16} {'type':<10} label")
    for name, lab in zip(meta.column_names, meta.column_labels):
        lines.append(f"{name:<16} {'numeric':<10} {lab or ''}")
    out = ROOT / "spss-export" / "survey_2024-variables.txt"
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"variables.txt: {len(meta.column_names)} variables")


if __name__ == "__main__":
    glb_to_gltf()
    voicemail_wav()
    book_epub()
    sav_variables()
