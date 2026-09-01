"""Capture the remaining 28 third-party/OS scene shots with real desktop apps.

Groups (select with --only g1,g2):
  explorer   7 folder scenes via Explorer++ (English file manager)
  hxd        2 hex-editor scenes via HxD (WAD lump directory, RAW byte layout)
  fontview   1 Windows font viewer scene (converted TTF)
  wmplayer   2 media-player scenes (WAV playing, MP4 playing)
  iso        1 mounted-ISO scene (Mount-DiskImage + Explorer++)
  code       5 VS Code scenes (legacy @font-face CSS, .gltf JSON, base64
             buffer, CSV output, CSV-vs-SPSS header check)
  blender    2 Blender scenes (Principled BSDF shading, STL viewport)
  freecad    1 FreeCAD scene (STEP opened, geometry verified)
  calibre    1 Calibre E-book viewer scene
  audacity   1 Audacity waveform scene
  installer  1 desktop-app install wizard (NSIS/MSI bundle)
  viewer     1 three.js glTF viewer scene (local page, converted .gltf loaded)

Run:  python web/scripts/capture_native_shots.py [--only explorer,hxd]
"""

import argparse
import json
import socket
import struct
import subprocess
import sys
import time
import webbrowser
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

import winlib

HERE = Path(__file__).parent
WEB = HERE.parent
PUBLIC = WEB / "public" / "convert"
SCENES = Path(r"C:\nft-scenes")

EPP = SCENES / "_tools" / "explorer++" / "Explorer++.exe"
HXD = SCENES / "_tools" / "hxd" / "HxD.exe"
AUDACITY = SCENES / "_tools" / "audacity" / "audacity-win-3.7.1-64bit" / "Audacity.exe"
BLENDER = Path(r"E:\googleProduct\localConvertPro\desktop\dev-bin\blender\blender.exe")
FREECAD = Path(r"E:\googleProduct\localConvertPro\desktop\dev-bin\freecad\FreeCAD.exe")
CALIBRE = Path(r"E:\googleProduct\localConvertPro\desktop\dev-bin\calibre\ebook-viewer.exe")
CODE = Path(r"D:\install\Microsoft VS Code\bin\code.cmd")
WMPLAYER = Path(r"C:\Program Files (x86)\Windows Media Player\wmplayer.exe")
FONTVIEW = Path(r"C:\WINDOWS\system32\fontview.exe")
NOTEPAD = Path(r"C:\WINDOWS\system32\notepad.exe")

DONE: list[str] = []


def shot(slug: str, name: str) -> Path:
    return PUBLIC / slug / name


def ok(path: Path, what: str) -> None:
    size = path.stat().st_size if path.exists() else 0
    if size > 10_000:
        DONE.append(what)
        print(f"  ok  {what}  ({size//1024} KB)")
    else:
        print(f"  FAIL {what}  ({size} bytes)")


def kill_image(name: str) -> None:
    subprocess.run(["taskkill", "/IM", name, "/F"], capture_output=True)
    time.sleep(0.8)


def kill_pid(pid: int) -> None:
    subprocess.run(["taskkill", "/PID", str(pid), "/T", "/F"], capture_output=True)
    time.sleep(0.8)


def launch_win(exe: Path, args, out: Path, what: str, *, by_pid=True, title_re=None,
               cls=None, timeout=25, wait=2.0, size=(1180, 760), pre=None):
    """Launch app -> find window -> resize -> optional pre(hwnd) -> capture."""
    proc = subprocess.Popen([str(exe), *map(str, args)], cwd=str(exe.parent))
    info = None
    if by_pid:
        info = winlib.find(pid=proc.pid, cls=cls, timeout=timeout)
    if info is None and title_re:
        info = winlib.find(title_re=title_re, cls=cls, timeout=timeout)
    if info is None:
        print(f"  FAIL {what}: no window")
        kill_pid(proc.pid)
        return
    winlib.set_size(info["hwnd"], *size)
    winlib.focus(info["hwnd"])
    if wait:
        time.sleep(wait)
    if pre:
        pre(info["hwnd"])
    time.sleep(0.6)
    winlib.capture(info["hwnd"], out)
    ok(out, what)
    kill_pid(proc.pid)


# ------------------------------------------------------------------ explorer ---
def _epp_settings() -> None:
    """English Explorer++, no Folders tree (hides localized OS shell names),
    full path in the title bar (avoids the localized 'DVD 驱动器' drive name
    when browsing a mounted ISO)."""
    subprocess.run(["reg", "add", r"HKCU\Software\Explorer++\Settings",
                    "/v", "ShowFolders", "/t", "REG_DWORD", "/d", "0", "/f"],
                   capture_output=True)
    subprocess.run(["reg", "add", r"HKCU\Software\Explorer++\Settings",
                    "/v", "ShowFullTitlePath", "/t", "REG_DWORD", "/d", "1", "/f"],
                   capture_output=True)
    # The drives toolbar labels buttons with localized drive descriptions
    # ("DVD 驱动器 (F:)"), and the display window repeats the localized
    # volume name — hide both for the mounted-ISO scene.
    subprocess.run(["reg", "add", r"HKCU\Software\Explorer++\Settings",
                    "/v", "ShowDrivesToolbar", "/t", "REG_DWORD", "/d", "0", "/f"],
                   capture_output=True)
    subprocess.run(["reg", "add", r"HKCU\Software\Explorer++\Settings",
                    "/v", "ShowDisplayWindow", "/t", "REG_DWORD", "/d", "0", "/f"],
                   capture_output=True)
    # Single-tab sessions: the tab caption repeats the localized display
    # name of the current folder ("DVD 驱动器 (F:) FAMILY_PHOTOS").
    subprocess.run(["reg", "add", r"HKCU\Software\Explorer++\Settings",
                    "/v", "AlwaysShowTabBar", "/t", "REG_DWORD", "/d", "0", "/f"],
                   capture_output=True)


def group_explorer() -> None:
    print("== explorer ==")
    _epp_settings()
    folders = [
        ("gsm-to-wav", "gsm-to-wav-voicemail-files.webp", SCENES / "voicemail-export"),
        ("mts-to-mp4", "mts-to-mp4-camcorder-clips.webp",
         SCENES / "avchd-card" / "PRIVATE" / "AVCHD" / "BDMV" / "STREAM"),
        ("opf-to-epub", "opf-to-epub-source-folder.webp", SCENES / "epub-source"),
        ("pfm-to-ttf", "pfm-to-ttf-pfm-pfb-pair.webp", SCENES / "type1-fonts"),
        ("pvr-to-png", "pvr-to-png-png-output.webp", SCENES / "decoded-textures"),
        ("wad-extractor", "wad-extractor-extracted-textures.webp",
         SCENES / "wad-mod" / "freedoom1-extracted"),
        ("sav-to-csv", "sav-to-csv-spss-export.webp", SCENES / "spss-export"),
    ]
    for slug, name, folder in folders:
        kill_image("Explorer++.exe")
        launch_win(EPP, [folder], shot(slug, name), f"{slug}/{name}",
                   by_pid=False, title_re=folder.name, size=(1100, 700))
    kill_image("Explorer++.exe")

    # WAD sprite-lump selection (keyboard: typeahead + Ctrl+Space + Shift+Down)
    print("  .. wad sprite selection")
    kill_image("Explorer++.exe")
    proc = subprocess.Popen([str(EPP), str(SCENES / "wad-mod" / "freedoom1-extracted")])
    info = winlib.find(pid=proc.pid, timeout=20)
    if info:
        winlib.set_size(info["hwnd"], 1100, 700)
        winlib.focus(info["hwnd"])
        time.sleep(1.5)

        def select_sprites(hwnd):
            winlib.focus(hwnd)
            winlib.type_text("POSSA1")
            time.sleep(0.5)
            winlib.chord(0x11, 0x20)          # Ctrl+Space — select focused
            time.sleep(0.3)
            for _ in range(3):                # extend to POSSA2/POSSD1/POSSF1
                winlib.chord(0x10, 0x28)      # Shift+Down
                time.sleep(0.25)

        select_sprites(info["hwnd"])
        time.sleep(0.8)
        out = shot("wad-extractor", "wad-extractor-sprite-selection.webp")
        winlib.capture(info["hwnd"], out)
        ok(out, "wad-extractor/wad-extractor-sprite-selection.webp")
    else:
        print("  FAIL wad sprite selection: no window")
    kill_image("Explorer++.exe")


# ----------------------------------------------------------------------- hxd ---
def _code_settings() -> None:
    """VS Code: no startup tab, workspace trust OFF (removes the Restricted
    Mode banner). Hex editor is opened via the command palette instead —
    the hexeditor.defaultHexEditor setting does not reliably override the
    binary-text-editor banner for CLI-opened files."""
    import json

    settings = Path.home() / "AppData" / "Roaming" / "Code" / "User" / "settings.json"
    data = {}
    if settings.exists():
        try:
            data = json.loads(settings.read_text(encoding="utf-8"))
        except Exception:
            data = {}
    data.pop("hexeditor.defaultHexEditor", None)
    data.pop("workbench.editorAssociations", None)
    data["workbench.startupEditor"] = "none"
    data["security.workspace.trust.enabled"] = False
    settings.parent.mkdir(parents=True, exist_ok=True)
    settings.write_text(json.dumps(data, indent=4), encoding="utf-8")


def _open_hex_editor(hwnd) -> None:
    """Command palette -> 'Hex Editor: Open Active File in Hex Editor'.

    Typed via KEYEVENTF_UNICODE so the Chinese IME cannot swallow it."""
    winlib.focus(hwnd)
    winlib.chord(0x11, 0x10, 0x50)      # Ctrl+Shift+P
    time.sleep(1.5)
    winlib.type_unicode("hex editor open")
    time.sleep(1.0)
    winlib.key(0x0D)                    # Enter — run the command
    time.sleep(2.5)


def group_hxd() -> None:
    """Hex-editor scenes via VS Code's Hex Editor (English UI; opened
    explicitly through the command palette)."""
    print("== hex (vs code) ==")
    _code_settings()
    kill_image("Code.exe")

    def zoom(hwnd, n=2):
        winlib.focus(hwnd)
        for _ in range(n):
            winlib.chord(0x11, 0xBB)
            time.sleep(0.25)

    def hex_and_jump_end(hwnd):
        _open_hex_editor(hwnd)
        zoom(hwnd, 2)
        winlib.focus(hwnd)
        winlib.chord(0x11, 0x23)        # Ctrl+End — lump directory at EOF
        time.sleep(1.0)

    # WAD lump directory — the directory sits at the end of the file
    launch_win(CODE, ["-n", SCENES / "wad-mod" / "freedoom1.wad"],
               shot("wad-extractor", "wad-extractor-lump-directory.webp"),
               "wad-extractor/wad-extractor-lump-directory.webp",
               by_pid=False, title_re=r"freedoom1\.wad.*Visual Studio Code",
               timeout=30, wait=7.0, size=(1180, 800), pre=hex_and_jump_end)
    kill_image("Code.exe")

    # RAW PCM byte layout — top of file
    def hex_top(hwnd):
        _open_hex_editor(hwnd)
        zoom(hwnd, 2)

    launch_win(CODE, ["-n", SCENES / "raw-audio" / "interview-raw.raw"],
               shot("raw-to-wav", "raw-to-wav-hex-editor-parameters.webp"),
               "raw-to-wav/raw-to-wav-hex-editor-parameters.webp",
               by_pid=False, title_re=r"interview-raw\.raw.*Visual Studio Code",
               timeout=30, wait=7.0, size=(1180, 800), pre=hex_top)
    kill_image("Code.exe")


# ------------------------------------------------------------------ fontforge ---
FONTFORGE = Path(r"E:\googleProduct\localConvertPro\desktop\dev-bin\fontforge\bin\fontforge.exe")


def _fontforge_env():
    import os

    env = dict(os.environ)
    env["LANG"] = "en_US.UTF-8"
    env["LC_ALL"] = "en_US.UTF-8"
    return env


def _main_window(pid, timeout=40, min_area=200 * 200):
    """Pick the largest visible window of `pid` (skips splash screens)."""
    deadline = time.time() + timeout
    best = None
    while time.time() < deadline:
        best = None
        for i in (winlib.winfo(h) for h in winlib.windows()):
            if not i["visible"] or i["pid"] != pid or not i["title"]:
                continue
            l, t, r, b = i["rect"]
            area = max(0, r - l) * max(0, b - t)
            if area >= min_area and (best is None or area > best[0]):
                best = (area, i)
        if best:
            return best[1]
        time.sleep(0.5)
    return None


def group_fontview() -> None:
    print("== fontforge ==")
    kill_image("fontforge.exe")

    # 1. converted TTF — full glyph coverage
    proc = subprocess.Popen(
        [str(FONTFORGE), str(SCENES / "converted-fonts" / "GaramondDisplay.ttf")],
        env=_fontforge_env())
    info = _main_window(proc.pid, timeout=50)
    if info:
        winlib.set_size(info["hwnd"], 1180, 800)
        time.sleep(6)
        out = shot("pfm-to-ttf", "pfm-to-ttf-ttf-installed.webp")
        winlib.capture(info["hwnd"], out)
        ok(out, "pfm-to-ttf/pfm-to-ttf-ttf-installed.webp")
    else:
        print("  FAIL pfm-ttf-ttf-installed: no window")
    kill_image("fontforge.exe")

    # 2. subset vs full glyph coverage — both fonts tiled
    full = subprocess.Popen(
        [str(FONTFORGE), str(SCENES / "converted-fonts" / "GaramondDisplay.ttf")],
        env=_fontforge_env())
    time.sleep(6)
    sub = subprocess.Popen(
        [str(FONTFORGE), str(SCENES / "converted-fonts" / "GaramondDisplay-subset.ttf")],
        env=_fontforge_env())
    time.sleep(12)
    fw = _main_window(full.pid, timeout=30)
    sw_ = _main_window(sub.pid, timeout=30)
    wins = [w for w in (fw, sw_) if w]
    if len(wins) == 2:
        sw, sh = winlib.screen_size()
        half = sw // 2
        winlib.set_pos(wins[0]["hwnd"], 0, 0, half - 10, sh - 80)
        winlib.set_pos(wins[1]["hwnd"], half + 10, 0, half - 10, sh - 80)
        winlib.focus(wins[1]["hwnd"])
        time.sleep(2)
        out = shot("eot-to-ttf", "eot-to-ttf-glyph-subset.webp")
        winlib.capture_screen(out)
        ok(out, "eot-to-ttf/eot-to-ttf-glyph-subset.webp")
    else:
        print(f"  FAIL glyph-subset: found {len(wins)} main windows")
    kill_image("fontforge.exe")


# ------------------------------------------------------------------ wmplayer ---
def _dismiss_dialogs(pid, main_hwnd, keys=(0x1B, 0x4E), timeout=18) -> None:
    """Poll for stray modal dialogs of `pid` and dismiss them (ESC / 'No')
    until none are left or timeout expires."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        stray = [w for w in (winlib.winfo(h) for h in winlib.windows())
                 if w["visible"] and w["pid"] == pid and w["hwnd"] != main_hwnd
                 and w["title"]]
        if not stray:
            time.sleep(1.0)
            stray = [w for w in (winlib.winfo(h) for h in winlib.windows())
                     if w["visible"] and w["pid"] == pid and w["hwnd"] != main_hwnd
                     and w["title"]]
            if not stray:
                return
        for w in stray:
            winlib.focus(w["hwnd"])
            for k in keys:
                winlib.key(k)
                time.sleep(0.25)
            time.sleep(0.5)


def group_wmplayer() -> None:
    print("== mpc-hc ==")
    # MPC-HC picks its language from the OS UI locale (registry "Language"
    # is a no-op string). Renaming the zh resource DLLs makes the Chinese
    # resource unloadable, so it falls back to the built-in English UI.
    lang_dir = SCENES / "_tools" / "mpc-hc" / "Lang"
    for dll in ("mpcresources.zh_CN.dll", "mpcresources.zh_TW.dll"):
        p = lang_dir / dll
        if p.exists():
            p.rename(lang_dir / (dll + ".off"))
    # Kill the periodic update-check prompt at the source as well, and loop
    # playback so the capture shows an actively playing file (the samples
    # are only ~4s long) instead of a paused end-of-file frame.
    subprocess.run(["reg", "add", r"HKCU\Software\MPC-HC\MPC-HC\Settings",
                    "/v", "AutoCheckUpdates", "/t", "REG_DWORD", "/d", "0", "/f"],
                   capture_output=True)
    subprocess.run(["reg", "add", r"HKCU\Software\MPC-HC\MPC-HC\Settings",
                    "/v", "Loop", "/t", "REG_DWORD", "/d", "1", "/f"],
                   capture_output=True)
    mpc = SCENES / "_tools" / "mpc-hc" / "mpc-hc64.exe"

    def play(out: Path, what: str, media: Path):
        kill_image("mpc-hc64.exe")
        proc = subprocess.Popen([str(mpc), "/play", str(media)])
        info = winlib.find(pid=proc.pid, timeout=25)
        if not info:
            print(f"  FAIL {what}: no window")
            return
        winlib.set_size(info["hwnd"], 1050, 720)
        winlib.focus(info["hwnd"])
        time.sleep(2.5)
        # dismiss the periodic update-check prompt (Yes/No messagebox)
        _dismiss_dialogs(proc.pid, info["hwnd"])
        winlib.focus(info["hwnd"])
        time.sleep(1.0)
        winlib.capture(info["hwnd"], out)
        ok(out, what)
        kill_image("mpc-hc64.exe")

    play(shot("raw-to-wav", "raw-to-wav-wav-playing.webp"),
         "raw-to-wav/raw-to-wav-wav-playing.webp",
         SCENES / "raw-audio" / "interview-raw.wav")
    play(shot("mts-to-mp4", "mts-to-mp4-mp4-plays.webp"),
         "mts-to-mp4/mts-to-mp4-mp4-plays.webp",
         SCENES / "avchd-card" / "beach-holiday.mp4")


# ----------------------------------------------------------------------- iso ---
def group_iso() -> None:
    print("== iso ==")
    kill_image("FreeCAD.exe")
    kill_image("Explorer++.exe")
    _epp_settings()
    iso = SCENES / "disc-archive" / "disc-01.iso"
    subprocess.run(
        ["powershell", "-NoProfile", "-Command", f"Dismount-DiskImage -ImagePath '{iso}'"],
        capture_output=True, timeout=30)
    subprocess.run(
        ["powershell", "-NoProfile", "-Command",
         f"Mount-DiskImage -ImagePath '{iso}' | Out-Null; "
         "(Get-DiskImage -ImagePath '" + str(iso) + "' | Get-Volume).DriveLetter"],
        capture_output=True, text=True, timeout=60)
    time.sleep(2.0)
    r = subprocess.run(
        ["powershell", "-NoProfile", "-Command",
         f"(Get-DiskImage -ImagePath '{iso}' | Get-Volume).DriveLetter"],
        capture_output=True, text=True, timeout=30)
    letter = r.stdout.strip()
    if not letter:
        print(f"  FAIL mount: {r.stderr[:200]}")
        return
    print(f"  mounted at {letter}:")
    launch_win(EPP, [f"{letter}:\\"], shot("raw-to-iso", "raw-to-iso-iso-output-mounted.webp"),
               "raw-to-iso/raw-to-iso-iso-output-mounted.webp",
               by_pid=True, title_re=rf"^{letter}:\\", size=(1100, 700))
    kill_image("Explorer++.exe")
    subprocess.run(
        ["powershell", "-NoProfile", "-Command", f"Dismount-DiskImage -ImagePath '{iso}'"],
        capture_output=True, timeout=30)


# ---------------------------------------------------------------------- code ---
def group_code() -> None:
    print("== code ==")
    _code_settings()

    def zoom(hwnd, n=2):
        winlib.focus(hwnd)
        for _ in range(n):
            winlib.chord(0x11, 0xBB)  # Ctrl+=
            time.sleep(0.25)

    # 1. legacy @font-face cascade with .eot URLs
    launch_win(CODE, ["-n", SCENES / "legacy-site" / "css" / "fonts.css"],
               shot("eot-to-ttf", "eot-to-ttf-fontsource-recovery.webp"),
               "eot-to-ttf/eot-to-ttf-fontsource-recovery.webp",
               by_pid=False, title_re=r"fonts\.css.*Visual Studio Code",
               timeout=25, wait=4.0, size=(1180, 800), pre=zoom)
    kill_image("Code.exe")

    # 2. .gltf JSON scene graph (top of file)
    launch_win(CODE, ["-n", SCENES / "models" / "forest-scene.gltf"],
               shot("glb-to-gltf", "glb-to-gltf-json-editor.webp"),
               "glb-to-gltf/glb-to-gltf-json-editor.webp",
               by_pid=False, title_re=r"forest-scene\.gltf.*Visual Studio Code",
               timeout=25, wait=4.0, size=(1180, 800), pre=zoom)
    kill_image("Code.exe")

    # 3. .gltf embedded base64 buffer (end of file: "buffers" is the last key)
    def to_buffers(hwnd):
        winlib.focus(hwnd)
        winlib.chord(0x11, 0x23)  # Ctrl+End
        time.sleep(0.8)
        winlib.chord(0x11, 0x22)  # Ctrl+PageUp — a screenful up for context
        time.sleep(0.6)

    launch_win(CODE, ["-n", SCENES / "models" / "forest-scene.gltf"],
               shot("glb-to-gltf", "glb-to-gltf-base64-buffer.webp"),
               "glb-to-gltf/glb-to-gltf-base64-buffer.webp",
               by_pid=False, title_re=r"forest-scene\.gltf.*Visual Studio Code",
               timeout=25, wait=4.0, size=(1180, 800), pre=to_buffers)
    kill_image("Code.exe")

    # 4. exported CSV (spreadsheet-ready view)
    launch_win(CODE, ["-n", SCENES / "spss-export" / "survey_2024.csv"],
               shot("sav-to-csv", "sav-to-csv-csv-excel.webp"),
               "sav-to-csv/sav-to-csv-csv-excel.webp",
               by_pid=False, title_re=r"survey_2024\.csv.*Visual Studio Code",
               timeout=25, wait=4.0, size=(1180, 800), pre=zoom)
    kill_image("Code.exe")

    # 5. header spot-check: SPSS dictionary (left) vs exported CSV (right),
    #    both in VS Code windows (English UI)
    sw, sh = winlib.screen_size()
    half = sw // 2
    kill_image("Code.exe")
    var_proc = subprocess.Popen([str(CODE), "-n", str(SCENES / "spss-export" / "survey_2024-variables.txt")])
    var_win = winlib.find(title_re=r"survey_2024-variables\.txt.*Visual Studio Code", timeout=30)
    csv_proc = subprocess.Popen([str(CODE), "--new-window", "-n",
                                 str(SCENES / "spss-export" / "survey_2024.csv")])
    csv_win = winlib.find(title_re=r"survey_2024\.csv.*Visual Studio Code", timeout=30)
    if var_win and csv_win:
        time.sleep(4)
        winlib.set_pos(var_win["hwnd"], 0, 0, half - 10, sh - 80)
        winlib.set_pos(csv_win["hwnd"], half + 10, 0, half - 10, sh - 80)
        zoom(var_win["hwnd"], 1)
        zoom(csv_win["hwnd"], 1)
        winlib.focus(var_win["hwnd"])
        time.sleep(1.5)
        out = shot("sav-to-csv", "sav-to-csv-verify-header.webp")
        winlib.capture_screen(out)
        ok(out, "sav-to-csv/sav-to-csv-verify-header.webp")
    else:
        print(f"  FAIL sav-to-csv-verify-header: var={bool(var_win)} csv={bool(csv_win)}")
    kill_image("Code.exe")


# ------------------------------------------------------------------- blender ---
def group_blender() -> None:
    print("== blender ==")
    kill_image("blender.exe")
    launch_win(BLENDER, ["--python", HERE / "_blender_pbr.py"],
               shot("blend-to-glb", "blend-to-glb-pbr-materials.webp"),
               "blend-to-glb/blend-to-glb-pbr-materials.webp",
               by_pid=True, timeout=40, wait=6.0, size=(1280, 860))
    kill_image("blender.exe")
    launch_win(BLENDER, ["--python", HERE / "_blender_stl.py"],
               shot("prt-to-stl", "prt-to-stl-stl-in-slicer.webp"),
               "prt-to-stl/prt-to-stl-stl-in-slicer.webp",
               by_pid=True, timeout=40, wait=6.0, size=(1280, 860))
    kill_image("blender.exe")


# ------------------------------------------------------------------- freecad ---
def group_freecad() -> None:
    print("== freecad ==")
    kill_image("FreeCAD.exe")
    launch_win(FREECAD, [HERE / "_freecad_step.py"],
               shot("prt-to-stl", "prt-to-stl-creo-step-export.webp"),
               "prt-to-stl/prt-to-stl-creo-step-export.webp",
               by_pid=False, title_re=r"bracket_part.*FreeCAD",
               timeout=90, wait=8.0, size=(1280, 860))
    kill_image("FreeCAD.exe")


# ------------------------------------------------------------------- calibre ---
def group_calibre() -> None:
    print("== calibre ==")
    import json
    import os

    gui = Path.home() / "AppData" / "Roaming" / "calibre" / "gui.json"
    data = {}
    if gui.exists():
        try:
            data = json.loads(gui.read_text(encoding="utf-8"))
        except Exception:
            data = {}
    data["language"] = "en"
    gui.parent.mkdir(parents=True, exist_ok=True)
    gui.write_text(json.dumps(data, indent=2), encoding="utf-8")
    print(f"  gui.json language: {data.get('language')}")

    env = dict(os.environ)
    env["CALIBRE_OVERRIDE_LANG"] = "en"
    env["LANG"] = "en_US.UTF-8"

    kill_image("ebook-viewer.exe")
    proc = subprocess.Popen([str(CALIBRE), str(SCENES / "epub-source" / "book.epub")], env=env)
    info = winlib.find(pid=proc.pid, timeout=40)
    if not info:
        print("  FAIL epub-reader: no window")
        return
    winlib.set_size(info["hwnd"], 1100, 860)
    winlib.focus(info["hwnd"])
    time.sleep(9)
    # dismiss the welcome hint by clicking inside the text area, then flip a page
    winlib.click(info["hwnd"], 550, 400)
    time.sleep(0.8)
    winlib.key(0x27)  # Right arrow — flips page
    time.sleep(1.5)
    out = shot("opf-to-epub", "opf-to-epub-epub-reader.webp")
    winlib.capture(info["hwnd"], out)
    ok(out, "opf-to-epub/opf-to-epub-epub-reader.webp")
    kill_image("ebook-viewer.exe")


# ------------------------------------------------------------------ audacity ---
def group_audacity() -> None:
    print("== audacity ==")
    cfg = Path.home() / "AppData" / "Roaming" / "audacity" / "audacity.cfg"
    cfg.parent.mkdir(parents=True, exist_ok=True)
    text = cfg.read_text(encoding="utf-8") if cfg.exists() else ""
    if "[Locale]" not in text:
        text = text.rstrip() + "\n\n[Locale]\nLanguage=en\n"
    else:
        import re
        text = re.sub(r"\[Locale\][^\[]*", "[Locale]\nLanguage=en\n", text)
    cfg.write_text(text, encoding="utf-8")
    check = cfg.read_text(encoding="utf-8")
    print(f"  cfg Language=en: {'Language=en' in check}")

    kill_image("Audacity.exe")
    kill_image("setup_wm.exe")   # stray legacy-WMP setup wizard (Chinese UI)
    proc = subprocess.Popen([str(AUDACITY), str(SCENES / "voicemail-export" / "voicemail-001.wav")])

    # The .aup3 association prompt is modal and blocks creation of the main
    # window — answer it (click "No") before looking for the main window.
    dlg = winlib.find(pid=proc.pid, cls="#32770", timeout=30)
    if dlg:
        winlib.focus(dlg["hwnd"])
        winlib.click_button(dlg["hwnd"], r"^&?No$")
        print("  association prompt: dismissed")
        time.sleep(2)

    info = (winlib.find(pid=proc.pid, cls="wxWindowNR", timeout=40)
            or winlib.find(pid=proc.pid, title_re=r"Audacity", timeout=15))
    if info:
        # wx may briefly report a zero-sized frame while it lays out —
        # wait until the window has real dimensions.
        deadline = time.time() + 20
        while time.time() < deadline:
            l, t, r, b = winlib.winfo(info["hwnd"])["rect"]
            if (r - l) > 100 and (b - t) > 100:
                break
            time.sleep(0.5)
    if not info:
        print("  FAIL waveform: no main window")
        return
    winlib.set_size(info["hwnd"], 1280, 820)
    winlib.focus(info["hwnd"])
    time.sleep(6)
    # Any further popups (welcome hint) still get ESC.
    _dismiss_dialogs(proc.pid, info["hwnd"], keys=(0x1B,), timeout=12)
    winlib.focus(info["hwnd"])
    time.sleep(1.5)
    out = shot("gsm-to-wav", "gsm-to-wav-waveform.webp")
    winlib.capture(info["hwnd"], out)
    ok(out, "gsm-to-wav/gsm-to-wav-waveform.webp")
    kill_image("Audacity.exe")


# ----------------------------------------------------------------- installer ---
def group_installer() -> None:
    print("== installer ==")
    bundles = Path(r"E:\googleProduct\nicheFileTools\desktop\src-tauri\target\release\bundle")
    setup = None
    for sub, pattern in (("nsis", "*.exe"), ("msi", "*.msi")):
        d = bundles / sub
        if d.exists():
            hits = sorted(d.glob(pattern), key=lambda p: p.stat().st_mtime, reverse=True)
            if hits:
                setup = hits[0]
                break
    if not setup:
        print("  FAIL installer: no bundle found")
        return
    print(f"  bundle: {setup.name}")
    if setup.suffix == ".exe":
        # NSIS: language selector first, then the wizard
        proc = subprocess.Popen([str(setup)])
        sel = winlib.find(cls="#32770", title_re=r"Language", timeout=30)
        if sel:
            winlib.focus(sel["hwnd"])
            time.sleep(0.5)
            winlib.type_text("EN")       # jump to English in the combobox
            time.sleep(0.4)
            winlib.key(0x0D)            # Enter — OK
            time.sleep(1.5)
        wizard = (winlib.find(cls="#32770", title_re=r"Setup", timeout=30)
                  or winlib.find(cls="#32770", timeout=15))
        if wizard is None:
            print("  FAIL installer: no wizard window")
            kill_pid(proc.pid)
            return
        winlib.focus(wizard["hwnd"])
        time.sleep(1.5)
        out = shot("kfx-to-epub", "kfx-to-epub-desktop-app-install.webp")
        winlib.capture(wizard["hwnd"], out)
        ok(out, "kfx-to-epub/kfx-to-epub-desktop-app-install.webp")
        kill_pid(proc.pid)
        subprocess.run(["taskkill", "/IM", "nichefiletools-desktop.exe", "/F"], capture_output=True)
        subprocess.run(["taskkill", "/IM", "nichefiletools.exe", "/F"], capture_output=True)
    else:
        proc = subprocess.Popen(["msiexec", "/i", str(setup)])
        info = winlib.find(pid=proc.pid, timeout=30)
        if info is None:
            info = winlib.find(cls="#32770", title_re=r"nichefiletools", timeout=30)
        if info is None:
            print("  FAIL installer: no wizard window")
            kill_pid(proc.pid)
            return
        winlib.focus(info["hwnd"])
        time.sleep(2.0)
        out = shot("kfx-to-epub", "kfx-to-epub-desktop-app-install.webp")
        winlib.capture(info["hwnd"], out)
        ok(out, "kfx-to-epub/kfx-to-epub-desktop-app-install.webp")
        kill_pid(proc.pid)
        subprocess.run(["taskkill", "/IM", "msiexec.exe", "/F"], capture_output=True)


# ------------------------------------------------------------------ 7-zip ---
SEVENZIP_FM = SCENES / "_tools" / "7zip" / "7zFM.exe"


def group_sevenzip() -> None:
    """opf-to-epub zip-folder scene: 7-Zip file manager (English) with the
    OPF source folder selected and the Add-to-archive dialog open."""
    print("== 7-zip ==")
    if not SEVENZIP_FM.exists():
        print("  FAIL 7-zip: not installed")
        return
    subprocess.run(["reg", "add", r"HKCU\Software\7-Zip", "/v", "Lang",
                    "/t", "REG_SZ", "/d", "en", "/f"], capture_output=True)
    kill_image("7zFM.exe")
    proc = subprocess.Popen([str(SEVENZIP_FM), str(SCENES / "epub-source")])
    info = winlib.find(pid=proc.pid, timeout=25) or winlib.find(cls="FM", timeout=20)
    if not info:
        print("  FAIL zip-folder: no window")
        return
    winlib.set_size(info["hwnd"], 1100, 700)
    winlib.focus(info["hwnd"])
    time.sleep(2.0)
    winlib.chord(0x11, 0x41)          # Ctrl+A — select the whole source folder
    time.sleep(0.6)
    # click the toolbar "Add" button (blue plus, leftmost tool button)
    winlib.click(info["hwnd"], 55, 78)
    time.sleep(1.5)
    dlg = winlib.find(pid=proc.pid, title_re=r"Add", timeout=10)
    if dlg:
        out = shot("opf-to-epub", "opf-to-epub-zip-folder.webp")
        winlib.capture(dlg["hwnd"], out)
        ok(out, "opf-to-epub/opf-to-epub-zip-folder.webp")
        winlib.escape(dlg["hwnd"])
    else:
        # fallback: file manager with the folder contents selected
        out = shot("opf-to-epub", "opf-to-epub-zip-folder.webp")
        winlib.capture(info["hwnd"], out)
        ok(out, "opf-to-epub/opf-to-epub-zip-folder.webp (fallback, no dialog)")
    kill_image("7zFM.exe")


# -------------------------------------------------------------------- viewer ---
VIEWER_HTML = """<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>glTF Viewer</title>
<style>
  html,body{margin:0;height:100%;overflow:hidden;background:#141619;
            font:13px/1.4 system-ui,sans-serif;color:#dfe3e8}
  #bar{position:fixed;top:12px;left:12px;z-index:9;background:rgba(20,22,25,.85);
       border:1px solid #33373d;border-radius:8px;padding:8px 12px}
  #bar b{color:#8ecdf7}
</style>
<script type="importmap">
{"imports":{"three":"https://unpkg.com/three@0.169.0/build/three.module.js",
"three/addons/":"https://unpkg.com/three@0.169.0/examples/jsm/"}}
</script></head>
<body>
<div id="bar">forest-scene.gltf — <b>glTF 2.0</b> · 14 objects · 8 materials</div>
<script type="module">
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x141619);
scene.add(new THREE.GridHelper(20, 40, 0x2a2e33, 0x1d2126));
const key = new THREE.DirectionalLight(0xffffff, 2.6); key.position.set(6,10,4); scene.add(key);
const fill = new THREE.DirectionalLight(0x9db8d6, 1.0); fill.position.set(-6,4,-6); scene.add(fill);
scene.add(new THREE.HemisphereLight(0xbfd6ee, 0x2c2f33, 0.8));
const camera = new THREE.PerspectiveCamera(45, innerWidth/innerHeight, .01, 200);
camera.position.set(9, 6.5, 11);
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(devicePixelRatio);
document.body.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.4, 0);
new GLTFLoader().load('forest-scene.gltf', (g) => {
  scene.add(g.scene);
  document.getElementById('bar').dataset.loaded = '1';
});
(function tick(){ controls.update(); renderer.render(scene, camera);
  requestAnimationFrame(tick); })();
</script></body></html>
"""


def group_viewer() -> None:
    print("== viewer ==")
    vdir = SCENES / "_tools" / "viewer"
    vdir.mkdir(parents=True, exist_ok=True)
    (vdir / "viewer.html").write_text(VIEWER_HTML, encoding="utf-8")
    src = SCENES / "models" / "forest-scene.gltf"
    (vdir / "forest-scene.gltf").write_bytes(src.read_bytes())

    handler = SimpleHTTPRequestHandler
    import functools
    handler = functools.partial(SimpleHTTPRequestHandler, directory=str(vdir))
    httpd = HTTPServer(("127.0.0.1", 0), handler)
    port = httpd.server_address[1]
    import threading
    threading.Thread(target=httpd.serve_forever, daemon=True).start()

    from playwright.sync_api import sync_playwright

    out = shot("glb-to-gltf", "glb-to-gltf-viewer-verify.webp")
    with sync_playwright() as p:
        b = p.chromium.launch()
        page = b.new_page(viewport={"width": 1280, "height": 800}, device_scale_factor=2)
        page.goto(f"http://127.0.0.1:{port}/viewer.html")
        page.wait_for_function("document.getElementById('bar').dataset.loaded == '1'", timeout=30000)
        page.wait_for_timeout(2500)
        page.screenshot(path=str(out.with_suffix(".png")))
        b.close()
    httpd.shutdown()
    from PIL import Image

    img = Image.open(out.with_suffix(".png")).convert("RGB")
    if img.width != 1200:
        img = img.resize((1200, round(img.height * 1200 / img.width)), Image.LANCZOS)
    img.save(out, "WEBP", lossless=True, method=6)
    out.with_suffix(".png").unlink()
    ok(out, "glb-to-gltf/glb-to-gltf-viewer-verify.webp")


GROUPS = {
    "explorer": group_explorer,
    "hxd": group_hxd,
    "fontview": group_fontview,
    "wmplayer": group_wmplayer,
    "iso": group_iso,
    "code": group_code,
    "blender": group_blender,
    "freecad": group_freecad,
    "calibre": group_calibre,
    "audacity": group_audacity,
    "installer": group_installer,
    "sevenzip": group_sevenzip,
    "viewer": group_viewer,
}

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default=",".join(GROUPS))
    args = ap.parse_args()
    wanted = [g.strip() for g in args.only.split(",") if g.strip()]
    for g in wanted:
        if g in GROUPS:
            try:
                GROUPS[g]()
            except Exception as e:  # keep the pipeline moving
                print(f"  !! group {g} crashed: {e!r}")
        else:
            print(f"  ?? unknown group {g}")
    print(f"\ncaptured {len(DONE)} shots:")
    for d in DONE:
        print(f"  - {d}")
