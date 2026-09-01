"""Smoke-test winlib: open an Explorer window, set details view, capture."""

import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import winlib

DIR = r"C:\nft-scenes\voicemail-export"
OUT = Path(__file__).parent / "_smoke_explorer.png"

subprocess.Popen(["explorer.exe", DIR])
w = winlib.find(cls="CabinetWClass", title_re="voicemail", timeout=10)
print("window:", w)
assert w, "Explorer window not found"
winlib.focus(w["hwnd"])
winlib.set_size(w["hwnd"], 1280, 880)
winlib.focus(w["hwnd"])
winlib.chord(0x11, 0x10, 0x35)  # Ctrl+Shift+5 -> Details view
time.sleep(0.8)
size = winlib.capture(w["hwnd"], OUT)
print("captured:", size, "->", OUT)

# close the window (Alt+F4 under focus)
winlib.focus(w["hwnd"])
winlib.chord(0x12, 0x73)  # Alt+F4
