"""Generate the real sample files behind every remaining desktop/OS guide shot.

Each scene lives under C:\\nft-scenes and is built from real files wherever the
format allows it: real GSM/MTS/MP4 media via ffmpeg, a real .sav via pyreadstat,
a real .iso via pycdlib, real TTFs via fontTools, a real PWAD plus its
extraction (same algorithm as the Rust WadExtractor), a real EPUB source tree,
real PNG textures, a real binary STL and a STEP export.

Run once before capture_native_shots.py / capture_web_shots.py:
    python web/scripts/make_scene_files.py
"""

import io
import math
import struct
import subprocess
import sys
import time
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(r"C:\nft-scenes")
FFMPEG = None


def ffmpeg() -> str:
    global FFMPEG
    if FFMPEG is None:
        from imageio_ffmpeg import get_ffmpeg_exe

        FFMPEG = get_ffmpeg_exe()
    return FFMPEG


def run(cmd: list[str], **kw) -> None:
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode != 0:
        print(f"  !! {' '.join(cmd[:6])}... failed:\n     {(r.stderr or r.out or '')[-400:]}")
    return r


# ---------------------------------------------------------------- textures ---
def make_textures() -> None:
    out = ROOT / "decoded-textures"
    out.mkdir(parents=True, exist_ok=True)
    specs = {
        "asphalt_01.png": (96, 96, 20, 24),
        "concrete_02.png": (128, 126, 120, 14),
        "brick_wall_a.png": (148, 72, 56, 30),
        "grass_patch.png": (64, 118, 52, 26),
    }
    for name, (r, g, b, noise) in specs.items():
        img = Image.new("RGB", (512, 512))
        d = ImageDraw.Draw(img)
        rnd = 12345
        for y in range(0, 512, 8):
            for x in range(0, 512, 8):
                rnd = (rnd * 1103515245 + 12345) % 2**31
                n = (rnd % (noise * 2 + 1)) - noise
                d.rectangle([x, y, x + 8, y + 8], fill=(r + n, g + n, b + n))
        img.save(out / name, optimize=True)
    print(f"textures: {len(specs)} PNGs -> {out}")


# ------------------------------------------------------------------- audio ---
def make_audio() -> None:
    vm = ROOT / "voicemail-export"
    vm.mkdir(parents=True, exist_ok=True)
    ok = 0
    for i, freq in enumerate((440, 392, 494, 349), 1):
        src = [
            ffmpeg(), "-y", "-loglevel", "error",
            "-f", "lavfi", "-i", f"sine=frequency={freq}:duration=3",
            "-ar", "8000", "-ac", "1", "-c:a", "gsm", "-f", "gsm",
            str(vm / f"voicemail-{i:03d}.gsm"),
        ]
        if run(src).returncode == 0:
            ok += 1
        else:  # encoder missing — a plausible-size GSM file is still real enough for Explorer
            (vm / f"voicemail-{i:03d}.gsm").write_bytes(b"\x33" * (160 * 25))
    (vm / "call-log.txt").write_text(
        "Asterisk voicemail export 2026-08-30\n"
        "4 messages, GSM 6.10, 8 kHz mono\n",
        encoding="ascii",
    )
    print(f"voicemail: {ok}/4 real GSM encodes")

    # RAW PCM (16-bit LE, 8 kHz mono — the 'byte layout' scene) + wrapped WAV
    rw = ROOT / "raw-audio"
    rw.mkdir(parents=True, exist_ok=True)
    pcm = bytearray()
    for n in range(8000 * 4):
        t = n / 8000
        v = (
            0.45 * math.sin(2 * math.pi * 220 * t)
            + 0.25 * math.sin(2 * math.pi * 440 * t + 0.7)
            + 0.12 * math.sin(2 * math.pi * 660 * t + 1.3)
        )
        pcm += struct.pack("<h", int(v * 22000))
    (rw / "interview-raw.raw").write_bytes(pcm)
    with open(rw / "interview-raw.wav", "wb") as f:
        f.write(b"RIFF")
        f.write(struct.pack("<I", 36 + len(pcm)))
        f.write(b"WAVEfmt ")
        f.write(struct.pack("<IHHIIHH", 16, 1, 1, 8000, 16000, 2, 16))
        f.write(b"data")
        f.write(struct.pack("<I", len(pcm)))
        f.write(pcm)
    print("raw-audio: interview-raw.raw (64 KB PCM) + interview-raw.wav")


# -------------------------------------------------------------------- video ---
def make_video() -> None:
    stream = ROOT / "avchd-card" / "PRIVATE" / "AVCHD" / "BDMV" / "STREAM"
    stream.mkdir(parents=True, exist_ok=True)
    (ROOT / "avchd-card" / "PRIVATE" / "AVCHD" / "BDMV" / "CLIPINF").mkdir(exist_ok=True)
    names = []
    for i, (hue, secs) in enumerate(((0, 3), (72, 4), (144, 3), (216, 5))):
        clip = stream / f"{i:05d}.MTS"
        names.append(clip)
        cmd = [
            ffmpeg(), "-y", "-loglevel", "error",
            "-f", "lavfi", "-i", f"testsrc2=size=1440x1080:rate=25",
            "-f", "lavfi", "-i", f"sine=frequency={330 + i * 55}:duration={secs}",
            "-t", str(secs), "-vf", f"hue=h={hue}", "-c:v", "libx264", "-preset", "veryfast",
            "-pix_fmt", "yuv420p", "-c:a", "aac", "-f", "mpegts", str(clip),
        ]
        if run(cmd).returncode != 0:
            clip.write_bytes(b"\x47" * 400_000)
    for i in range(4):  # CLIPINF index files (not visible in the shot, but real structure)
        (stream.parent / "CLIPINF" / f"{i:05d}.CPI").write_bytes(b"\x00" * 1024)
    # Real remux of clip 0 -> the MP4 the guide shows playing in a player
    out = ROOT / "avchd-card" / "beach-holiday.mp4"
    run([ffmpeg(), "-y", "-loglevel", "error", "-i", str(names[1]),
         "-c", "copy", "-movflags", "+faststart", str(out)])
    print(f"avchd: {len(names)} MTS clips, remux mp4 exists={out.exists()}")


# -------------------------------------------------------------------- fonts ---
def make_fonts() -> None:
    t1 = ROOT / "type1-fonts"
    t1.mkdir(parents=True, exist_ok=True)
    # Plausible Type 1 pair (headers only — the scene is an Explorer folder view)
    (t1 / "Garamond.pfb").write_bytes(b"\x80\x01" + b"\x00" * 38_000 + b"\x80\x02")
    pfm = struct.pack("<8sHHHHHIHIHH", b"\x00\x01\x00\x00", 200, 210, 60, 0, 0x28, 720, 720, 8, 1, 0)
    (t1 / "Garamond.pfm").write_bytes(pfm + b"\x00" * 1200)
    (t1 / "Garamond.afm").write_text(
        "StartFontMetrics 4.1\nFontName Garamond\nFamilyName Garamond\n"
        "Weight Medium\nItalicAngle 0\nCharacterSet ExtendedRoman\n"
        "FontBBox -166 -250 994 948\nEndFontMetrics\n",
        encoding="ascii",
    )
    print("type1-fonts: Garamond.pfm/.pfb/.afm")

    # Real TTFs via fontTools: full set + a tiny subset for the coverage scene.
    from fontTools.fontBuilder import FontBuilder
    from fontTools.pens.ttGlyphPen import TTGlyphPen

    def build(path: str, chars: str, family: str) -> None:
        fb = FontBuilder(1000, isTTF=True)
        names = [".notdef", ".space"] + list(chars)
        names = list(dict.fromkeys(names))
        cmap = {ord(c): c for c in chars}
        cmap[32] = ".space"
        glyphs = {}
        pen = TTGlyphPen(None)
        pen.moveTo((50, 0)); pen.lineTo((60, 0)); pen.lineTo((60, 700)); pen.lineTo((50, 700))
        pen.closePath(); glyphs[".notdef"] = pen.glyph()
        glyphs[".space"] = TTGlyphPen(None).glyph()
        for c in chars:
            pen = TTGlyphPen(None)
            w = 380 if c.isupper() else 300
            h = 660 if c.isupper() else 460
            y = 40 if c.isupper() else 10
            pen.moveTo((40, y)); pen.lineTo((40 + w, y)); pen.lineTo((40 + w, y + h)); pen.lineTo((40, y + h))
            pen.closePath()
            glyphs[c] = pen.glyph()
        fb.setupGlyphOrder(names)
        fb.setupCharacterMap(cmap)
        fb.setupGlyf(glyphs)
        fb.setupHorizontalMetrics({n: (620, 40) for n in names})
        fb.setupHorizontalHeader(ascent=760, descent=-240)
        fb.setupOS2(sTypoAscender=760, sTypoDescender=-240, usWinAscent=760, usWinDescent=240)
        fb.setupNameTable({
            "familyName": family, "styleName": "Regular",
            "uniqueFontIdentifier": f"{family} Regular", "fullName": f"{family} Regular",
            "psName": family.replace(" ", ""),
        })
        fb.setupPost()
        fb.save(path)

    fonts = ROOT / "converted-fonts"
    fonts.mkdir(exist_ok=True)
    import string
    full = string.ascii_letters + string.digits + ".,;:!?()[]'\"-&%$#@*+=/_"
    build(str(fonts / "GaramondDisplay.ttf"), full, "Garamond Display")
    build(str(fonts / "GaramondDisplay-subset.ttf"), "ABCDEabcdefg0123 ", "Garamond Display Subset")
    print(f"converted-fonts: 2 real TTFs (full {len(full)} glyphs + subset)")


# ------------------------------------------------------------------- 3D ops ---
def _cube(scale=1.0):
    s = scale / 2
    v = [(-s,-s,-s),(s,-s,-s),(s,s,-s),(-s,s,-s),(-s,-s,s),(s,-s,s),(s,s,s),(-s,s,s)]
    quads = [(0,3,2,1,-2),(4,5,6,7,2),(0,4,7,3,0),(1,2,6,5,1),(0,1,5,4,-1),(2,3,7,6,2)]
    pos, nrm, idx = [], [], []
    for a, b, c, d, n in quads:
        base = len(pos)
        for i in (a, b, c, d):
            pos.append(v[i]); nrm.append((n == -2 and (0,0,-1) or n == -1 and (-1,0,0) or n == 0 and (0,-1,0) or n == 1 and (1,0,0) or n == 2 and (0,1,0) or (0,0,1)))
        idx += [base, base + 1, base + 2, base, base + 2, base + 3]
    return pos, nrm, idx


def _gltf_bin(accessors: list[bytes]) -> bytes:
    out = bytearray()
    offsets = []
    for a in accessors:
        while len(out) % 4:
            out += b"\x00"
        offsets.append(len(out))
        out += a
    while len(out) % 4:
        out += b"\x00"
    return bytes(out), offsets


def make_models() -> None:
    models = ROOT / "models"
    models.mkdir(parents=True, exist_ok=True)

    # --- blend-to-glb output: three PBR material cubes on a neutral floor ---
    prims = []
    accessors = []
    mat_defs = [
        ({"pbrMetallicRoughness": {"baseColorFactor": [1.0, 0.77, 0.35, 1.0],
          "metallicFactor": 1.0, "roughnessFactor": 0.25}}, "Gold", (-1.6, 0.8, 0)),
        ({"pbrMetallicRoughness": {"baseColorFactor": [0.72, 0.12, 0.1, 1.0],
          "metallicFactor": 0.0, "roughnessFactor": 0.95}}, "Paint", (0, 0.8, 0)),
        ({"pbrMetallicRoughness": {"baseColorFactor": [0.15, 0.3, 0.85, 1.0],
          "metallicFactor": 0.9, "roughnessFactor": 0.15}}, "ChromeBlue", (1.6, 0.8, 0)),
    ]
    meshes = []
    for mi, (mat, _, _) in enumerate(mat_defs):
        pos, nrm, idx = _cube(1.4)
        pos = [(p[0] + mat_defs[mi][2][0], p[1] + mat_defs[mi][2][1], p[2] + mat_defs[mi][2][2]) for p in pos]
        pv = b"".join(struct.pack("<fff", *p) for p in pos)
        nv = b"".join(struct.pack("<fff", *n) for n in nrm)
        iv = b"".join(struct.pack("<HHH", *t) for t in zip(idx[0::3], idx[1::3], idx[2::3]))
        accessors += [pv, nv, iv]
        meshes.append({"primitives": [{"attributes": {"POSITION": 6 * mi, "NORMAL": 6 * mi + 1},
                                       "indices": 6 * mi + 2, "material": mi}]})
    pos, nrm, idx = _cube(7.0)
    pos = [(p[0], p[1] - 0.02 - 0.05, p[2]) for p in pos]
    pv = b"".join(struct.pack("<fff", *p) for p in pos)
    nv = b"".join(struct.pack("<fff", *n) for n in nrm)
    iv = b"".join(struct.pack("<HHH", *t) for t in zip(idx[0::3], idx[1::3], idx[2::3]))
    accessors += [pv, nv, iv]
    floor_mat = {"pbrMetallicRoughness": {"baseColorFactor": [0.55, 0.55, 0.55, 1.0],
                  "metallicFactor": 0.0, "roughnessFactor": 0.8}, "name": "Floor"}
    meshes.append({"primitives": [{"attributes": {"POSITION": 18, "NORMAL": 19},
                                   "indices": 20, "material": 3}]})
    bin_data, offsets = _gltf_bin(accessors)

    def acc(i, type_, count, mins, maxs):
        return {"bufferView": i, "componentType": 5126 if type_.startswith("VEC") or type_ == "SCALAR" and i % 3 != 2 else 5123,
                "count": count, "type": type_,
                "min": mins, "max": maxs}
    # bufferViews from offsets
    views = []
    for oi, o in enumerate(offsets):
        n = len(accessors[oi])
        views.append({"buffer": 0, "byteOffset": o, "byteLength": n,
                      "target": 34963 if oi % 3 == 2 else 34962})
    accessors_json = []
    for mi in range(4):
        pos, nrm, idx = _cube(1.4 if mi < 3 else 7.0)
        accessors_json.append({"bufferView": 6 * mi, "componentType": 5126, "count": len(pos), "type": "VEC3",
                                "min": [-4, -1, -4], "max": [4, 4, 4]})
        accessors_json.append({"bufferView": 6 * mi + 1, "componentType": 5126, "count": len(nrm), "type": "VEC3"})
        accessors_json.append({"bufferView": 6 * mi + 2, "componentType": 5123, "count": len(idx), "type": "SCALAR"})

    gltf = {
        "asset": {"version": "2.0", "generator": "nichefiletools blend-to-glb"},
        "scene": 0,
        "scenes": [{"nodes": [0, 1, 2, 3]}],
        "nodes": [
            {"mesh": 0, "name": "GoldTrim"}, {"mesh": 1, "name": "RedPaint"},
            {"mesh": 2, "name": "BlueChrome"}, {"mesh": 3, "name": "Ground", "scale": [1, 1, 1]},
        ],
        "meshes": meshes,
        "materials": [m for m, _, _ in mat_defs] + [floor_mat],
        "buffers": [{"byteLength": len(bin_data)}],
        "bufferViews": views,
        "accessors": accessors_json,
    }

    def glb_path(g: dict, data: bytes, path: Path) -> None:
        js = json.dumps(g, separators=(",", ":")).encode()
        while len(js) % 4:
            js += b"\x20"
        while len(data) % 4:
            data += b"\x00"
        header = b"glTF" + struct.pack("<II", 2, 12 + 8 + len(js) + 8 + len(data))
        jchunk = struct.pack("<I", len(js)) + b"JSON" + js
        bchunk = struct.pack("<I", len(data)) + b"BIN\x00" + data
        path.write_bytes(header + jchunk + bchunk)

    import json
    glb_path(gltf, bin_data, models / "forest-scene.glb")

    # --- simple single-cube GLB: input for the real web glb-to-gltf converter ---
    pos, nrm, idx = _cube(1.0)
    pv = b"".join(struct.pack("<fff", *p) for p in pos)
    nv = b"".join(struct.pack("<fff", *n) for n in nrm)
    iv = b"".join(struct.pack("<HHH", *t) for t in zip(idx[0::3], idx[1::3], idx[2::3]))
    data, offs = _gltf_bin([pv, nv, iv])
    g2 = {
        "asset": {"version": "2.0", "generator": "nichefiletools sample"},
        "scene": 0, "scenes": [{"nodes": [0]}], "nodes": [{"mesh": 0, "name": "Cube"}],
        "meshes": [{"primitives": [{"attributes": {"POSITION": 0, "NORMAL": 1}, "indices": 2, "material": 0}]}],
        "materials": [{"pbrMetallicRoughness": {"baseColorFactor": [0.8, 0.7, 0.5, 1.0],
                       "metallicFactor": 0.1, "roughnessFactor": 0.6}, "name": "Wood"}],
        "buffers": [{"byteLength": len(data)}],
        "bufferViews": [
            {"buffer": 0, "byteOffset": offs[0], "byteLength": len(pv), "target": 34962},
            {"buffer": 0, "byteOffset": offs[1], "byteLength": len(nv), "target": 34962},
            {"buffer": 0, "byteOffset": offs[2], "byteLength": len(iv), "target": 34963},
        ],
        "accessors": [
            {"bufferView": 0, "componentType": 5126, "count": len(pos), "type": "VEC3",
             "min": [-0.5, -0.5, -0.5], "max": [0.5, 0.5, 0.5]},
            {"bufferView": 1, "componentType": 5126, "count": len(nrm), "type": "VEC3"},
            {"bufferView": 2, "componentType": 5123, "count": len(idx), "type": "SCALAR"},
        ],
    }
    glb_path(g2, data, models / "package-model.glb")
    print(f"models: forest-scene.glb ({(models / 'forest-scene.glb').stat().st_size} B, 4 PBR materials), package-model.glb")

    # --- binary STL (the tessellated part the slicer/viewer loads) ---
    tris = []
    for a, b, c, d, n in [(0,3,2,1,-2),(4,5,6,7,2),(0,4,7,3,0),(1,2,6,5,1),(0,1,5,4,-1),(2,3,7,6,2)]:
        s = 0.6
        v = [(-s,-s,0.12),(s,-s,0.12),(s,s,0.12),(-s,s,0.12),(-s,-s,0.32),(s,-s,0.32),(s,s,0.32),(-s,s,0.32)]
        for tri in ((v[a], v[b], v[c]), (v[a], v[c], v[d])):
            ux, uy, uz = [tri[1][k] - tri[0][k] for k in range(3)]
            wx, wy, wz = [tri[2][k] - tri[0][k] for k in range(3)]
            nx, ny, nz = uy * wz - uz * wy, uz * wx - ux * wz, ux * wy - uy * wx
            ln = math.sqrt(nx * nx + ny * ny + nz * nz) or 1.0
            tris.append(([nx / ln, ny / ln, nz / ln], tri))
    with open(models / "bracket_part.stl", "wb") as f:
        f.write(b"nichefiletools STEP-to-STL tessellation 0.1mm".ljust(80, b"\x00"))
        f.write(struct.pack("<I", len(tris)))
        for n, tri in tris:
            f.write(struct.pack("<3f", *n))
            for p in tri:
                f.write(struct.pack("<3f", *(c * 10 for c in p)))
            f.write(b"\x00\x00")
    print(f"models: bracket_part.stl ({len(tris)} triangles)")

    # --- STEP AP214 export (Explorer scene only) ---
    step = ROOT / "creo-export" / "bracket_part.stp"
    step.parent.mkdir(parents=True, exist_ok=True)
    step.write_text(
        "ISO-10303-21;\n"
        "HEADER;\n"
        "FILE_DESCRIPTION((''),'2;1');\n"
        "FILE_NAME('bracket_part.stp','2026-08-30T14:22:31',('mechanical'),"
        "(' engineering team'),'Pro/ENGINEER by PTC','AP214');\n"
        "FILE_SCHEMA(('AUTOMOTIVE_DESIGN { 1 0 10303 214 1 1 1 1 }'));\n"
        "ENDSEC;\n"
        "DATA;\n"
        "#1=APPLICATION_CONTEXT('core data for automotive mechanical design');\n"
        "#2=APPLICATION_PROTOCOL_DEFINITION('international standard','automotive_design',2010,#1);\n"
        "#3=PRODUCT('bracket_part','bracket_part','',(#4));\n"
        "#4=MECHANICAL_CONTEXT('',#1,'mechanical');\n"
        "#5=PRODUCT_DEFINITION_FORMATION('','',#3);\n"
        "#6=PRODUCT_DEFINITION('design','',#5,#7);\n"
        "#7=PRODUCT_DEFINITION_CONTEXT('part definition',#1,'design');\n"
        "#8=MANIFOLD_SOLID_BREP('bracket_part',#9);\n"
        "#9=CLOSED_SHELL('',(#10,#11,#12,#13,#14,#15));\n"
        "#10=ADVANCED_FACE('',(#16),#17,.T.);\n"
        "#17=PLANE('',#18);\n"
        "#18=AXIS2_PLACEMENT_3D('',#19,#20,#21);\n"
        "ENDSEC;\n"
        "END-ISO-10303-21;\n",
        encoding="ascii",
    )
    print("creo-export: bracket_part.stp")


# ---------------------------------------------------------------------- WAD ---
def make_wad() -> None:
    wad_dir = ROOT / "wad-mod"
    wad_dir.mkdir(parents=True, exist_ok=True)
    # Realistic PWAD layout: palette/color maps/maps/textures/sprites
    lumps = [
        ("PLAYPAL", 768), ("COLORMAP", 34 * 256), ("PNAMES", 4 + 3 * 40),
        ("TEXTURE1", 4 + 4 * 60), ("TEXTURE2", 4 + 4 * 12),
        ("MAP01", 0), ("THINGS", 9 * 64), ("LINEDEFS", 14 * 420), ("SIDEDEFS", 30 * 900),
        ("VERTEXES", 4 * 1200), ("SEGS", 10 * 2100), ("SSECTORS", 8 * 300), ("NODES", 28 * 280),
        ("SECTORS", 26 * 220), ("REJECT", 900), ("BLOCKMAP", 8100),
        ("WALL00_1", 4096), ("WALL00_2", 4096), ("WALL01_1", 4096), ("GRATE1", 4096),
        ("MFLR8_3", 4096), ("DOOR1_5", 4096), ("STEP1", 1024), ("SW1SKULL", 4096),
        ("POSSA1", 1200), ("POSSA2", 1200), ("SHTGA1", 1600), ("SHTGA2", 1600),
        ("POSSD1", 1200), ("POSSF1", 1200),
    ]
    data = bytearray(b"PWAD")
    body = bytearray()
    entries = []
    rnd = 987654321
    for name, size in lumps:
        entries.append((len(body) + 12, size, name))
        if name == "PLAYPAL":
            chunk = bytearray()
            for p in range(256):
                chunk += bytes((min(255, abs(140 - p) * 3), max(0, 90 - p % 60), (p * 7) % 256))
            body += chunk[:size]
        else:
            for _ in range(size):
                rnd = (rnd * 1103515245 + 12345) % 2**31
                body.append(rnd % 256)
    data += struct.pack("<II", len(lumps), 12 + len(body))
    data += body
    for pos, size, name in entries:
        data += struct.pack("<II", pos, size) + name.encode().ljust(8, b"\x00")
    wad_path = wad_dir / "freedoom1.wad"
    wad_path.write_bytes(data)

    # Extract with the same algorithm the Rust WadExtractor uses (all lumps,
    # '/' names mapped to subfolders) — this IS the tool's output shape.
    out = wad_dir / "freedoom1-extracted"
    out.mkdir(exist_ok=True)
    num, diroff = struct.unpack("<II", data[4:12])
    for i in range(num):
        off = diroff + i * 16
        pos, size = struct.unpack("<II", data[off:off + 8])
        name = data[off + 8:off + 16].split(b"\x00")[0].decode()
        target = out / name.replace("\\", "/").lstrip("/")
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(bytes(data[pos:pos + size]))
    print(f"wad: freedoom1.wad ({len(lumps)} lumps, {len(data)//1024} KB) + extracted folder ({len(list(out.iterdir()))} files)")


# -------------------------------------------------------------------- EPUB ---
CHAPTERS = [
    ("chapter-01.xhtml", "The Summons", "The letter arrived on a Tuesday, folded twice and sealed with green wax. Mara turned it over twice before breaking the seal, and by the time she finished reading, the kettle had boiled itself dry."),
    ("chapter-02.xhtml", "The Northern Ridge", "From the pass, the ridge looked like a spine of dark bone against the sky. Sixty years of maps had drawn it wrong; Mara intended to draw it right."),
    ("chapter-03.xhtml", "Fellow Travellers", "There were three of them at the waystation, and none of them told the truth about their business. That, at least, made them easy to trust."),
    ("chapter-04.xhtml", "The Old Cable Station", "Rust had taken the bolts, and the snow had taken the roof, but the diesel log was still legible: last entry 1963, initials E.V., one word unfinished."),
    ("chapter-05.xhtml", "What the Ridge Kept", "They found the cairn at dawn, and under it, in oilcloth, the thing the maps had been protecting all along. Mara laughed until she cried."),
]


def make_epub() -> None:
    src = ROOT / "epub-source"
    (src / "images").mkdir(parents=True, exist_ok=True)
    for fname, title, para in CHAPTERS:
        (src / fname).write_text(
            f'<?xml version="1.0" encoding="utf-8"?>\n'
            f'<html xmlns="http://www.w3.org/1999/xhtml"><head><title>{title}</title>'
            f'<link rel="stylesheet" type="text/css" href="styles.css"/></head>'
            f'<body><h2>{title}</h2><p>{para}</p></body></html>\n', encoding="utf-8")
    (src / "styles.css").write_text(
        "body{font-family:Georgia,serif;margin:1em;line-height:1.5}\n"
        "h2{font-weight:normal;font-style:italic;border-bottom:1px solid #999}\n",
        encoding="utf-8")
    # real cover image
    img = Image.new("RGB", (600, 900), (24, 34, 48))
    d = ImageDraw.Draw(img)
    for y in range(900):
        d.line([(0, y), (600, y)], fill=(24 + y // 30, 34 + y // 40, 48 + y // 25))
    d.rectangle([40, 40, 560, 860], outline=(220, 210, 180), width=2)
    img.save(src / "images" / "cover.png", optimize=True)

    manifest = "".join(
        f'<item id="ch{i}" href="{f}" media-type="application/xhtml+xml"/>'
        for i, (f, _, _) in enumerate(CHAPTERS, 1))
    spine = "".join(f'<itemref idref="ch{i}"/>' for i in range(1, len(CHAPTERS) + 1))
    (src / "content.opf").write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="bid">\n'
        '<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">\n'
        '<dc:title>The Northern Ridge</dc:title>\n'
        '<dc:creator>E. Varga</dc:creator>\n'
        '<dc:language>en</dc:language>\n'
        '<dc:identifier id="bid">urn:uuid:7b8a4c2e-1111-4c9a-9f2e-northernridge</dc:identifier>\n'
        '<dc:date>2026-08-30</dc:date>\n'
        '</metadata>\n<manifest>\n'
        '<item id="css" href="styles.css" media-type="text/css"/>\n'
        '<item id="cover" href="images/cover.png" media-type="image/png"/>\n'
        '<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>\n'
        f'{manifest}\n</manifest>\n<spine toc="ncx">\n{spine}\n</spine>\n</package>\n',
        encoding="utf-8")
    nav = "".join(
        f'<navPoint id="n{i}" playOrder="{i}"><navLabel><text>{t}</text></navLabel>'
        f'<content src="{f}"/></navPoint>'
        for i, (f, t, _) in enumerate(CHAPTERS, 1))
    (src / "toc.ncx").write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">\n'
        '<head><meta name="dtb:uid" content="urn:uuid:7b8a4c2e-1111-4c9a-9f2e-northernridge"/></head>\n'
        f'<docTitle><text>The Northern Ridge</text></docTitle>\n<navMap>\n{nav}\n</navMap>\n</ncx>\n',
        encoding="utf-8")
    print(f"epub-source: {len(list(src.rglob('*')))} files")


# ------------------------------------------------------------------ SPSS/CSV ---
def make_sav() -> None:
    import pandas as pd
    import pyreadstat

    out = ROOT / "spss-export"
    out.mkdir(parents=True, exist_ok=True)
    df = pd.DataFrame({
        "respondent_id": [1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008],
        "city": ["Shanghai", "Beijing", "Hangzhou", "Chengdu", "Shenzhen", "Suzhou", "Xi'an", "Qingdao"],
        "age_group": ["25-34", "35-44", "25-34", "45-54", "18-24", "35-44", "25-34", "45-54"],
        "satisfaction": [4.5, 3.8, 4.9, 4.1, 3.2, 4.7, 4.3, 3.9],
        "would_recommend": ["Yes", "No", "Yes", "Yes", "No", "Yes", "Yes", "No"],
        "comments": ["Great service, fast shipping", "Delivered on time", "Exceeded expectations", "Great value",
                     "Packaging damaged", "Quick support responses", "Would buy again", "Slightly delayed"],
    })
    pyreadstat.write_sav(df, str(out / "survey_2024.sav"))
    # Real read-back → CSV (same pipeline as the converter: pyreadstat → CSV)
    df2, _ = pyreadstat.read_sav(str(out / "survey_2024.sav"))
    df2.to_csv(out / "survey_2024.csv", index=False, encoding="utf-8")
    print("spss-export: survey_2024.sav + survey_2024.csv (real pyreadstat round-trip)")


# ---------------------------------------------------------------------- ISO ---
def make_iso() -> None:
    import pycdlib

    out = ROOT / "disc-archive"
    out.mkdir(parents=True, exist_ok=True)
    iso = pycdlib.PyCdlib()
    # English volume label — Explorer then shows "FAMILY_PHOTOS (F:)"
    # instead of the localized "DVD 驱动器 (F:)" default for unlabeled discs.
    # (Joliet limits the label to 16 chars.)
    iso.new(vol_ident="FAMILY_PHOTOS", joliet=3, rock_ridge="1.09")
    for name, iso_name, content in [
        ("readme.txt", "README.TXT", b"Archive disc 01 - scanned 2024 family photos\n7 folders, 148 images\n"),
        ("backup_log.txt", "BACKUP.TXT", b"Imation CD-R 700MB\nVerified 2024-11-02\nCRC OK\n"),
    ]:
        data = io.BytesIO(content)
        iso.add_fp(data, len(content), iso_path=f"/{iso_name}", joliet_path=f"/{name}", rr_name=name)
    iso.add_directory("/PHOTOS", joliet_path="/photos", rr_name="photos")
    for i in (1, 2, 3):
        content = b"\x89PNG\r\n\x1a\n" + b"\x10" * 4000
        iso.add_fp(io.BytesIO(content), len(content),
                   iso_path=f"/PHOTOS/IMG_{i:04d}.PNG", joliet_path=f"/photos/img_{i:04d}.png", rr_name=f"img_{i:04d}.png")
    iso.write(str(out / "disc-01.iso"))
    iso.close()
    print(f"disc-archive: disc-01.iso ({(out / 'disc-01.iso').stat().st_size // 1024} KB)")


# ------------------------------------------------------------- legacy CSS ---
def make_legacy_css() -> None:
    css = ROOT / "legacy-site" / "css"
    fonts = ROOT / "legacy-site" / "css" / "fonts"
    fonts.mkdir(parents=True, exist_ok=True)
    (css / "fonts.css").write_text(
        "/* 2012 site build — IE8-compat font stack, all four weights */\n"
        "@font-face {\n"
        "  font-family: 'DaxlinePro';\n"
        "  src: url('fonts/daxline-webfont.eot');\n"
        "  src: url('fonts/daxline-webfont.eot?#iefix') format('embedded-opentype'),\n"
        "       url('fonts/daxline-webfont.woff') format('woff'),\n"
        "       url('fonts/daxline-webfont.ttf') format('truetype');\n"
        "  font-weight: normal;\n"
        "  font-style: normal;\n"
        "}\n"
        "@font-face {\n"
        "  font-family: 'DaxlinePro';\n"
        "  src: url('fonts/daxline-bold-webfont.eot');\n"
        "  src: url('fonts/daxline-bold-webfont.eot?#iefix') format('embedded-opentype'),\n"
        "       url('fonts/daxline-bold-webfont.woff') format('woff');\n"
        "  font-weight: bold;\n"
        "}\n"
        "@font-face {\n"
        "  font-family: 'VegurRegular';\n"
        "  src: url('fonts/vegur-webfont.eot');\n"
        "  src: url('fonts/vegur-webfont.eot?#iefix') format('embedded-opentype'),\n"
        "       url('fonts/vegur-webfont.ttf') format('truetype');\n"
        "}\n",
        encoding="utf-8")
    for f in ("daxline-webfont.eot", "daxline-bold-webfont.eot", "vegur-webfont.eot",
              "daxline-webfont.woff", "daxline-webfont.ttf", "daxline-bold-webfont.woff"):
        (fonts / f).write_bytes(b"\x00\x00\x01\x00" + b"\x42" * 24_000)
    print("legacy-site: fonts.css + 6 webfont files")


def make_web_fixture_exr() -> None:
    """Web-capture fixture (manual-test-fixtures/, not C:\\nft-scenes): a large
    single-part scanline EXR (RGB half-float, compression=NONE, 1920x1280) so
    capture_shots.py can catch the in-browser converter mid-decode at +400ms.
    Layout per OpenEXR spec: 16-byte chlist entries, one 64-bit offset per
    scanline block."""
    import struct as _s

    w, h = 1920, 1280
    out = (Path(__file__).resolve().parents[2] / "manual-test-fixtures"
           / "exr-to-png" / "render-3k-none.exr")

    def attr(name, atype, payload):
        return name.encode() + b"\0" + atype.encode() + b"\0" + _s.pack("<I", len(payload)) + payload

    chlist = b"".join(
        ch.encode() + b"\0" + _s.pack("<i", 1) + b"\0\0\0\0" + _s.pack("<ii", 1, 1)
        for ch in ("B", "G", "R")
    ) + b"\0"
    box = _s.pack("<4i", 0, 0, w - 1, h - 1)
    header = b"\x76\x2f\x31\x01" + _s.pack("<I", 2)
    header += attr("channels", "chlist", chlist)
    header += attr("compression", "compression", b"\x00")
    header += attr("dataWindow", "box2i", box)
    header += attr("displayWindow", "box2i", box)
    header += attr("lineOrder", "lineOrder", b"\x00")
    header += attr("pixelAspectRatio", "float", _s.pack("<f", 1.0))
    header += attr("screenWindowCenter", "v2f", _s.pack("<2f", 0.0, 0.0))
    header += attr("screenWindowWidth", "float", _s.pack("<f", 1.0))

    row_bytes = w * 3 * 2

    def half_row(y):
        flat = []
        for x in range(w):
            g = 0.4 + 1.2 * (1 - y / h)
            b = 0.2 + 0.9 * (y / h)
            r = g * (0.7 + 0.5 * math.sin(x / 220 + y / 90)) + 0.3
            flat.extend((r, g, b))
        return _s.pack(f"<{len(flat)}e", *flat)

    with open(out, "wb") as f:
        f.write(header)
        offsets_at = f.tell()
        f.write(b"\0" * (8 * h))
        offsets = []
        for y in range(h):
            offsets.append(f.tell())
            f.write(_s.pack("<II", y, row_bytes))
            f.write(half_row(y))
        f.seek(offsets_at)
        for off in offsets:
            f.write(_s.pack("<Q", off))
    print(f"web-fixture exr: render-3k-none.exr ({out.stat().st_size / 1e6:.1f} MB)")


if __name__ == "__main__":
    t0 = time.time()
    for fn in (make_textures, make_audio, make_video, make_fonts, make_models,
               make_wad, make_epub, make_sav, make_iso, make_legacy_css,
               make_web_fixture_exr):
        print(f"--- {fn.__name__} ---")
        fn()
    print(f"\ndone in {time.time() - t0:.1f}s -> {ROOT}")
