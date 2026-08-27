# -*- coding: utf-8 -*-
"""5 个新工具真实文件转换端到端测试。
Python 构造真实格式样本（WAV/GLB/EOT/ZIP-OPF/SAV×3 压缩变体）→
Playwright 走真实 UI（上传→转换→下载）→ Python 按格式规范逐字节验证输出。"""
import json
import struct
import sys
import tempfile
import time
import zlib
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = "http://localhost:3002"
TMP = Path(tempfile.mkdtemp(prefix="nftools-"))
fails = []


def check(name, ok, detail=""):
    print(("PASS " if ok else "FAIL ") + name + (f" | {detail}" if detail and not ok else ""))
    if not ok:
        fails.append(name)


def make_raw_pcm() -> bytes:
    """3200 字节 16-bit 数据 = 800 帧 stereo（正弦扫频即可，内容任意但已知）"""
    return bytes([0x11, 0x22] * 1600)


def make_glb() -> bytes:
    """最小合法 GLB：JSON chunk + BIN chunk（带 4 字节对齐 padding）"""
    gltf = json.dumps({
        "asset": {"version": "2.0"},
        "buffers": [{"byteLength": 16}],
        "meshes": [{"primitives": [{"attributes": {"POSITION": 0}}]}],
    }).encode()
    json_pad = (-len(gltf)) % 4
    bin_data = bytes(range(16))
    bin_pad = (-len(bin_data)) % 4
    json_len = len(gltf) + json_pad
    bin_len = len(bin_data) + bin_pad
    total = 12 + 8 + json_len + 8 + bin_len
    out = struct.pack("<III", 0x46546C67, 2, total)
    out += struct.pack("<II", json_len, 0x4E4F534A) + gltf + b" " * json_pad
    out += struct.pack("<II", bin_len, 0x004E4942) + bin_data + b"\x00" * bin_pad
    assert len(out) == total
    return out


def make_eot(sfnt: bytes) -> bytes:
    """最小 EOT：固定 78 字节头（MagicNumber@40）+ FamilyNameSize(2)@76 + UTF16 名称 + 字体数据"""
    name = "TestFont".encode("utf-16-le")
    total = 78 + len(name) + len(sfnt)
    h = struct.pack("<IIII", total, len(sfnt), 0x00010001, 0)      # EOTSize/FontDataSize/Version/Flags
    h += b"\x00" * 10                                               # PANOSE @16
    h += struct.pack("<I", 0)                                       # Charset @26
    h += struct.pack("<I", 0)                                       # Italic @30
    h += struct.pack("<I", 400)                                     # Weight @34
    h += struct.pack("<H", 0) + struct.pack("<H", 0x504C)           # fsType @38 + MagicNumber @40
    h += b"\x00" * 16 + b"\x00" * 8 + b"\x00" * 4 + b"\x00" * 4     # UnicodeRange/CodePage/Checksum/Reserved @42-73
    h += b"\x00\x00"                                                # Padding1 @74
    h += struct.pack("<H", len(name))                               # FamilyNameSize @76
    assert len(h) == 78, len(h)
    return h + name + sfnt


def make_opf_zip() -> bytes:
    import zipfile, io
    opf = """<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">test-book-1</dc:identifier>
    <dc:title>Fixture Book</dc:title>
    <dc:language>en</dc:language>
  </metadata>
  <manifest>
    <item id="ch1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
    <item id="ch2" href="chapter2.xhtml" media-type="application/xhtml+xml"/>
    <item id="css" href="style.css" media-type="text/css"/>
  </manifest>
  <spine><itemref idref="ch1"/><itemref idref="ch2"/></spine>
</package>"""
    ch1 = '<html xmlns="http://www.w3.org/1999/xhtml"><head><title>One</title></head><body><p>Chapter 1</p></body></html>'
    ch2 = '<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Two</title></head><body><p>Chapter 2</p></body></html>'
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("OEBPS/content.opf", opf)
        z.writestr("OEBPS/chapter1.xhtml", ch1)
        z.writestr("OEBPS/chapter2.xhtml", ch2)
        z.writestr("OEBPS/style.css", "body{margin:0}")
    return buf.getvalue()


def sav_var(name: str, vtype: int, has_label=0) -> bytes:
    nm = name.encode().ljust(8, b" ")
    return struct.pack("<iiii", 2, vtype, has_label, 0) + b"\x00" * 16 + bytes([len(name)]) + nm


def make_sav(compressed: int, zlib_wrap=False) -> bytes:
    """3 变量(AGE num,NAME str-8,SCORE num) × 3 行；compressed=0 未压缩 / 1 字节压缩；zlib_wrap → $FL3 整段 zlib"""
    magic = b"$FL3" if zlib_wrap else b"$FL2"
    comp = 2 if zlib_wrap else compressed
    header = magic + b"P".ljust(60, b" ")
    header += struct.pack("<iiiiid", 2, 3, comp, 0, 3, 100.0)
    header += b"01 jan 26".ljust(9, b" ") + b"10:00:00".ljust(8, b" ") + b"fixture".ljust(64, b" ") + b"\x00" * 3
    assert len(header) == 176, len(header)
    dict_ = sav_var("AGE", 0) + sav_var("NAME", 8) + sav_var("SCORE", 0) + struct.pack("<i", 999)

    sysmis = struct.pack("<d", -1.7976931348623157e308)
    if compressed == 0:
        rows = b""
        for nv, sv, sc in [(25, b"Alice\x20\x20\x20", 1.5), (30, b"Bob\x20\x20\x20\x20\x20", sysmis), (35, b"Carol\x20\x20\x20", 3.25)]:
            rows += struct.pack("<d", nv) + sv + (sc if isinstance(sc, bytes) else struct.pack("<d", sc))
    elif compressed == 1:
        rows = b""
        # 行1: AGE=25 → opcode 125(=25+100)；NAME=254+8字节；SCORE=253+double
        rows += bytes([125]) + bytes([254]) + b"Alice\x20\x20\x20" + bytes([253]) + struct.pack("<d", 1.5)
        # 行2: AGE=130 超出 0-251 → 253+double；NAME；SCORE sysmis=255
        rows += bytes([253]) + struct.pack("<d", 30.0) + bytes([254]) + b"Bob\x20\x20\x20\x20\x20" + bytes([255])
        # 行3
        rows += bytes([253]) + struct.pack("<d", 35.0) + bytes([254]) + b"Carol\x20\x20\x20" + bytes([253]) + struct.pack("<d", 3.25)
    else:
        rows = b""
        for nv, sv, sc in [(25, b"Alice\x20\x20\x20", 1.5), (30, b"Bob\x20\x20\x20\x20\x20", sysmis), (35, b"Carol\x20\x20\x20", 3.25)]:
            rows += struct.pack("<d", nv) + sv + (sc if isinstance(sc, bytes) else struct.pack("<d", sc))
        if not zlib_wrap:
            rows = zlib.compress(rows)

    if zlib_wrap:  # $FL3 整段 zlib（仅压一层）
        return header + dict_ + zlib.compress(rows)
    return header + dict_ + rows


def ui_convert(page, slug: str, fixture: Path, set_options: dict | None = None) -> Path:
    page.goto(f"{BASE}/tools/{slug}", wait_until="networkidle")
    page.locator('input[type="file"]').set_input_files(str(fixture))
    for key, value in (set_options or {}).items():
        page.locator(f"select").nth({"sampleRate": 0, "bitsPerSample": 1, "channels": 2}.get(key, 0)).select_option(value)
    page.get_by_role("button", name="Convert").click()
    page.wait_for_selector("text=Done —", timeout=20000)
    with page.expect_download() as dl:
        page.locator("a[download]").click()
    out = TMP / dl.value.suggested_filename
    dl.value.save_as(str(out))
    return out


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    # ---------- 1) RAW → WAV ----------
    raw = TMP / "tone.raw"; raw.write_bytes(make_raw_pcm())
    wav = ui_convert(page, "raw-to-wav", raw, {"sampleRate": "48000", "bitsPerSample": "16", "channels": "2"})
    data = wav.read_bytes()
    check("[raw-wav] 文件名", wav.name == "tone.wav", wav.name)
    hdr = struct.unpack("<4sI4s4sIHHIIHH4sI", data[:44])
    check("[raw-wav] RIFF/WAVE 魔数", hdr[0] == b"RIFF" and hdr[2] == b"WAVE")
    check("[raw-wav] fmt=PCM/48k/stereo/16bit", hdr[4] == 16 and hdr[5] == 1 and hdr[7] == 48000 and hdr[6] == 2 and hdr[10] == 16, hdr)
    check("[raw-wav] 字节率/块对齐", hdr[8] == 48000 * 4 and hdr[9] == 4)
    check("[raw-wav] data 长度=3200 且数据逐字节一致", hdr[12] == 3200 and data[44:] == make_raw_pcm())
    check("[raw-wav] 总长=44+3200", len(data) == 44 + 3200)

    # 错误路径：非音频扩展名
    bad = TMP / "x.txt"; bad.write_bytes(b"hello")
    page.goto(f"{BASE}/tools/raw-to-wav", wait_until="networkidle")
    page.locator('input[type="file"]').set_input_files(str(bad))
    check("[raw-wav] 非法扩展名报错", page.locator("text=Unsupported file").count() == 1)

    # ---------- 2) GLB → GLTF ----------
    glb = TMP / "model.glb"; glb.write_bytes(make_glb())
    gltf_p = ui_convert(page, "glb-to-gltf", glb)
    check("[glb-gltf] 文件名", gltf_p.name == "model.gltf", gltf_p.name)
    doc = json.loads(gltf_p.read_text(encoding="utf-8"))
    uri = doc["buffers"][0]["uri"]
    check("[glb-gltf] buffer 为 base64 data URI", uri.startswith("data:application/octet-stream;base64,"))
    import base64
    decoded = base64.b64decode(uri.split(",", 1)[1])
    check("[glb-gltf] 解码后与 BIN chunk 逐字节一致", decoded == bytes(range(16)))
    check("[glb-gltf] JSON 内容保留", doc["asset"]["version"] == "2.0" and doc["meshes"][0]["primitives"][0]["attributes"]["POSITION"] == 0)
    # 非法 GLB
    badglb = TMP / "fake.glb"; badglb.write_bytes(b"NOTAGLB" * 10)
    page.goto(f"{BASE}/tools/glb-to-gltf", wait_until="networkidle")
    page.locator('input[type="file"]').set_input_files(str(badglb))
    page.get_by_role("button", name="Convert").click()
    page.wait_for_selector("text=Not a valid GLB", timeout=10000)
    check("[glb-gltf] 非法 GLB 报错", True)

    # ---------- 3) EOT → TTF ----------
    sfnt = struct.pack(">I", 0x00010000) + b"FAKEFONTDATA" * 8  # TrueType 签名 + 伪表
    eot = TMP / "legacy.eot"; eot.write_bytes(make_eot(sfnt))
    ttf = ui_convert(page, "eot-to-ttf", eot)
    check("[eot-ttf] 文件名 .ttf", ttf.name == "legacy.ttf", ttf.name)
    out_sfnt = ttf.read_bytes()
    check("[eot-ttf] 提取数据与 sfnt 逐字节一致", out_sfnt == sfnt, f"{len(out_sfnt)} vs {len(sfnt)}")
    # OTF 分支
    sfnt2 = b"OTTO" + b"CFFDATA" * 8
    eot2 = TMP / "cff.eot"; eot2.write_bytes(make_eot(sfnt2))
    otf = ui_convert(page, "eot-to-ttf", eot2)
    check("[eot-ttf] OTTO → .otf 且一致", otf.name == "cff.otf" and otf.read_bytes() == sfnt2)

    # ---------- 4) OPF → EPUB ----------
    import zipfile
    opfzip = TMP / "book.zip"; opfzip.write_bytes(make_opf_zip())
    epub = ui_convert(page, "opf-to-epub", opfzip)
    check("[opf-epub] 文件名", epub.name == "book.epub", epub.name)
    with zipfile.ZipFile(epub) as z:
        names = z.namelist()
        first = z.infolist()[0]
        check("[opf-epub] mimetype 首位", names[0] == "mimetype", names[:3])
        check("[opf-epub] mimetype stored 未压缩", first.compress_type == zipfile.ZIP_STORED)
        check("[opf-epub] mimetype 内容", z.read("mimetype") == b"application/epub+zip")
        check("[opf-epub] container.xml 存在且指向 OPF", b"OEBPS/content.opf" in z.read("META-INF/container.xml"))
        check("[opf-epub] content.opf 存在", "OEBPS/content.opf" in names)
        check("[opf-epub] 资源保留", "OEBPS/chapter1.xhtml" in names and "OEBPS/style.css" in names)
        check("[opf-epub] 生成 nav 并注入 manifest", "OEBPS/nav.xhtml" in names and b'properties="nav"' in z.read("OEBPS/content.opf"))
        nav = z.read("OEBPS/nav.xhtml").decode()
        check("[opf-epub] nav 含 spine 顺序链接", 'href="chapter1.xhtml"' in nav and 'href="chapter2.xhtml"' in nav)
    # 缺资源错误路径
    import io
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("OEBPS/content.opf", open_dict := make_opf_zip() and zipfile.ZipFile(io.BytesIO(make_opf_zip())).read("OEBPS/content.opf"))
    badzip = TMP / "missing.zip"; badzip.write_bytes(buf.getvalue())
    page.goto(f"{BASE}/tools/opf-to-epub", wait_until="networkidle")
    page.locator('input[type="file"]').set_input_files(str(badzip))
    page.get_by_role("button", name="Convert").click()
    page.wait_for_selector("text=missing from the upload", timeout=10000)
    check("[opf-epub] 缺失资源报错并列举", True)

    # ---------- 5) SAV → CSV（3 种压缩变体，期望 CSV 相同） ----------
    def expected_csv() -> str:
        return "\ufeffAGE,NAME,SCORE\n25,Alice,1.5\n30,Bob,\n35,Carol,3.25"

    for label, comp, zw in [("未压缩", 0, False), ("字节压缩", 1, False), ("zlib $FL3", 0, True)]:
        sav = TMP / f"survey_{comp}{'_z' if zw else ''}.sav"; sav.write_bytes(make_sav(comp, zlib_wrap=zw))
        csv = ui_convert(page, "sav-to-csv", sav)
        got = csv.read_text(encoding="utf-8-sig")
        check(f"[sav-csv:{label}] CSV 内容精确匹配", got == expected_csv().lstrip("\ufeff") or csv.read_bytes() == expected_csv().encode("utf-8"), repr(got[:80]))
    # 非法 SAV：选择通过（仅查扩展名），转换时报格式错误
    badsav = TMP / "x.sav"; badsav.write_bytes(b"garbage" * 40)
    page.goto(f"{BASE}/tools/sav-to-csv", wait_until="networkidle")
    page.locator('input[type="file"]').set_input_files(str(badsav))
    page.get_by_role("button", name="Convert").click()
    page.wait_for_selector("text=Not a valid SPSS", timeout=10000)
    check("[sav-csv] 非法 SAV 转换时报格式错误", True)

    # ---------- SEO 页面抽查：新工具页 TDK/canonical/教程互链 ----------
    for slug, kw in [("raw-to-wav", "RAW to WAV"), ("glb-to-gltf", "GLB to GLTF"), ("eot-to-ttf", "EOT to TTF"), ("opf-to-epub", "OPF to EPUB"), ("sav-to-csv", "SAV to CSV")]:
        r = page.goto(f"{BASE}/tools/{slug}", wait_until="networkidle")
        t = page.title()
        check(f"[{slug}] 页面 200 + title", r.status == 200 and kw.lower() in t.lower(), t)
        can = page.locator('link[rel="canonical"]').get_attribute("href")
        check(f"[{slug}] canonical", can == f"https://nichefiletools.com/tools/{slug}", can)
        check(f"[{slug}] 教程入口卡存在", page.locator(f'a[href="/convert/{slug}"]').count() >= 1)
        g = page.goto(f"{BASE}/convert/{slug}", wait_until="networkidle")
        check(f"[{slug}] 教程页 200 + 回链工具页", g.status == 200 and page.locator(f'a[href="/tools/{slug}"]').count() >= 1)
    # 分类 Hub
    for cat, kw in [("audio", "Audio"), ("font", "Font"), ("data", "Data")]:
        r = page.goto(f"{BASE}/category/{cat}", wait_until="networkidle")
        check(f"[category/{cat}] 200 + 工具卡", r.status == 200 and page.locator('a[href^="/tools/"]').count() >= 1)
    # sitemap 自动纳入
    sm = page.request.get(BASE + "/sitemap.xml").text()
    check("[sitemap] 新工具页全部纳入", all(f"/tools/{s}" in sm for s in ["raw-to-wav", "glb-to-gltf", "eot-to-ttf", "opf-to-epub", "sav-to-csv"]))
    check("[sitemap] 新教程页全部纳入", all(f"/convert/{s}" in sm for s in ["raw-to-wav", "glb-to-gltf", "eot-to-ttf", "opf-to-epub", "sav-to-csv"]))

    browser.close()

print(f"\n===== {len(fails) == 0 and 'ALL PASS' or f'{len(fails)} FAILED'} =====")
for f in fails:
    print(" -", f)
sys.exit(1 if fails else 0)
