"""Minimal Win32 helpers for the native-shot capture pipeline (ctypes only).

Used by capture_native_shots.py to drive real desktop windows: find a window
by PID/class/title, resize it, bring it to the foreground, send key chords,
and capture it with PrintWindow(PW_RENDERFULLCONTENT) — which renders even
Chromium/Electron windows correctly.
"""

import ctypes
import ctypes.wintypes as wt
import re
import time
from pathlib import Path

from PIL import Image

user32 = ctypes.windll.user32
gdi32 = ctypes.windll.gdi32
kernel32 = ctypes.windll.kernel32

PW_RENDERFULLCONTENT = 2
VK_CONTROL = 0x11
VK_SHIFT = 0x10
VK_MENU = 0x12
VK_APPS = 0x5D  # context-menu key
KEYEVENTF_KEYUP = 0x0002

WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, wt.HWND, wt.LPARAM)


def windows():
    acc = []

    @WNDENUMPROC
    def _wnd_proc(hwnd, lparam):
        acc.append(hwnd)
        return True

    user32.EnumWindows(_wnd_proc, 0)
    return acc


def winfo(hwnd):
    pid = wt.DWORD()
    user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
    buf = ctypes.create_unicode_buffer(256)
    user32.GetWindowTextW(hwnd, buf, 256)
    cls = ctypes.create_unicode_buffer(256)
    user32.GetClassNameW(hwnd, cls, 256)
    rect = wt.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(rect))
    return {
        "hwnd": hwnd, "pid": pid.value, "title": buf.value,
        "cls": cls.value, "rect": (rect.left, rect.top, rect.right, rect.bottom),
        "visible": bool(user32.IsWindowVisible(hwnd)),
    }


def find(cls=None, title_re=None, pid=None, visible=True, timeout=15):
    """Poll for a window matching the given filters."""
    rx = re.compile(title_re) if title_re else None
    deadline = time.time() + timeout
    while time.time() < deadline:
        for hwnd in windows():
            i = winfo(hwnd)
            if visible and not i["visible"]:
                continue
            if cls and i["cls"] != cls:
                continue
            if pid and i["pid"] != pid:
                continue
            if rx and not rx.search(i["title"]):
                continue
            return i
        time.sleep(0.3)
    return None


def latest(cls, title_re=None):
    """Newest matching window (highest hwnd is roughly the most recent)."""
    rx = re.compile(title_re) if title_re else None
    hits = [i for i in (winfo(h) for h in windows())
            if i["cls"] == cls and i["visible"] and (not rx or rx.search(i["title"]))]
    return max(hits, key=lambda i: i["hwnd"]) if hits else None


def set_size(hwnd, w, h):
    user32.SetWindowPos(hwnd, 0, 40, 40, w, h, 0x0040)  # SWP_SHOWWINDOW
    time.sleep(0.4)


def set_pos(hwnd, x, y, w, h):
    user32.SetWindowPos(hwnd, 0, x, y, w, h, 0x0040)
    time.sleep(0.4)


def screen_size():
    return (
        user32.GetSystemMetrics(0),
        user32.GetSystemMetrics(1),
    )


def escape(hwnd):
    focus(hwnd)
    user32.keybd_event(0x1B, 0, 0, 0)  # ESC
    user32.keybd_event(0x1B, 0, KEYEVENTF_KEYUP, 0)
    time.sleep(0.2)


def capture_screen(out: Path, width=1200):
    """BitBlt the primary screen -> crop -> resize to `width`."""
    w, h = screen_size()
    hdc = user32.GetDC(0)
    mem = gdi32.CreateCompatibleDC(hdc)
    bmp = gdi32.CreateCompatibleBitmap(hdc, w, h)
    gdi32.SelectObject(mem, bmp)
    gdi32.BitBlt(mem, 0, 0, w, h, hdc, 0, 0, 0x00CC0020)  # SRCCOPY

    class BMIH(ctypes.Structure):
        _fields_ = [("biSize", wt.DWORD), ("biWidth", wt.LONG), ("biHeight", wt.LONG),
                    ("biPlanes", wt.WORD), ("biBitCount", wt.WORD), ("biCompression", wt.DWORD),
                    ("biSizeImage", wt.DWORD), ("biXPelsPerMeter", wt.LONG),
                    ("biYPelsPerMeter", wt.LONG), ("biClrUsed", wt.DWORD), ("biClrImportant", wt.DWORD)]

    bmi = BMIH(ctypes.sizeof(BMIH), w, -h, 1, 32, 0, 0, 0, 0, 0, 0)
    buf = ctypes.create_string_buffer(w * h * 4)
    gdi32.GetDIBits(mem, bmp, 0, h, buf, ctypes.byref(bmi), 0)
    img = Image.frombuffer("RGB", (w, h), buf.raw, "raw", "BGRX", 0, 1)
    gdi32.DeleteObject(bmp)
    gdi32.DeleteDC(mem)
    user32.ReleaseDC(0, hdc)
    if img.width != width:
        img = img.resize((width, round(img.height * width / img.width)), Image.LANCZOS)
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, "WEBP", lossless=True, method=6)
    return img.size


def focus(hwnd):
    # Attach to the target's input thread so SetForegroundWindow is allowed.
    fg = user32.GetForegroundWindow()
    t1 = kernel32.GetCurrentThreadId()
    t2 = user32.GetWindowThreadProcessId(hwnd, None)
    if fg:
        t3 = user32.GetWindowThreadProcessId(fg, None)
        user32.AttachThreadInput(t1, t3, True)
    user32.AttachThreadInput(t1, t2, True)
    user32.SetForegroundWindow(hwnd)
    user32.BringWindowToTop(hwnd)
    if fg:
        t3 = user32.GetWindowThreadProcessId(fg, None)
        user32.AttachThreadInput(t1, t3, False)
    user32.AttachThreadInput(t1, t2, False)
    time.sleep(0.35)


def key(vk, up=False):
    user32.keybd_event(vk, 0, KEYEVENTF_KEYUP if up else 0, 0)


def chord(*vks, hold=0.06):
    for v in vks:
        key(v)
        time.sleep(hold)
    for v in reversed(vks):
        key(v, True)
        time.sleep(hold)


def click(hwnd, fx, fy):
    """Left-click at (fx, fy) relative to the window's top-left."""
    rect = wt.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(rect))
    x, y = rect.left + fx, rect.top + fy
    user32.SetCursorPos(x, y)
    time.sleep(0.15)
    user32.mouse_event(0x0002, 0, 0, 0, 0)   # LEFTDOWN
    time.sleep(0.05)
    user32.mouse_event(0x0004, 0, 0, 0, 0)   # LEFTUP
    time.sleep(0.3)


def type_text(text: str):
    for ch in text:
        user32.keybd_event(ord(ch.upper()), 0, 0, 0)
        user32.keybd_event(ord(ch.upper()), 0, KEYEVENTF_KEYUP, 0)
        time.sleep(0.03)


def type_unicode(text: str, delay=0.03):
    """Type text via KEYEVENTF_UNICODE — bypasses the active IME (Chinese
    input methods would otherwise swallow letters typed into Electron)."""
    for ch in text:
        user32.keybd_event(0, ord(ch), 0x0004, 0)
        user32.keybd_event(0, ord(ch), 0x0004 | KEYEVENTF_KEYUP, 0)
        time.sleep(delay)


def _find_button(parent_hwnd, rx):
    """Depth-first search for a Button control whose caption matches rx.

    Modern dialogs nest buttons inside CtrlNotifySink containers, so a plain
    FindWindowEx(parent, 'Button') walk is not enough."""
    child = None
    while True:
        child = user32.FindWindowExW(parent_hwnd, child, None, None)
        if not child:
            return None
        cls = ctypes.create_unicode_buffer(256)
        user32.GetClassNameW(child, cls, 256)
        if cls.value == "Button":
            buf = ctypes.create_unicode_buffer(256)
            user32.GetWindowTextW(child, buf, 256)
            if rx.search(buf.value):
                return child
        hit = _find_button(child, rx)
        if hit:
            return hit


def click_button(parent_hwnd, caption_re):
    """Find a (possibly nested) Button control by caption regex and click it.

    Works for native/WX message boxes where keyboard dismissal fails."""
    import re
    rx = re.compile(caption_re, re.IGNORECASE)
    hwnd = _find_button(parent_hwnd, rx)
    if not hwnd:
        return False
    rect = wt.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(rect))
    x = (rect.left + rect.right) // 2
    y = (rect.top + rect.bottom) // 2
    user32.SetCursorPos(x, y)
    time.sleep(0.15)
    user32.mouse_event(0x0002, 0, 0, 0, 0)   # LEFTDOWN
    time.sleep(0.05)
    user32.mouse_event(0x0004, 0, 0, 0, 0)   # LEFTUP
    time.sleep(0.3)
    return True


def capture(hwnd, out: Path, width=1200):
    """PrintWindow capture -> crop shadow borders -> resize to `width`."""
    rect = wt.RECT()
    user32.DwmGetWindowAttribute = ctypes.windll.dwmapi.DwmGetWindowAttribute
    DWMWA_EXTENDED_FRAME_BOUNDS = 9
    hr = ctypes.windll.dwmapi.DwmGetWindowAttribute(
        hwnd, DWMWA_EXTENDED_FRAME_BOUNDS, ctypes.byref(rect), ctypes.sizeof(rect))
    if hr != 0:
        user32.GetWindowRect(hwnd, ctypes.byref(rect))
    w, h = rect.right - rect.left, rect.bottom - rect.top
    hdc = user32.GetWindowDC(hwnd)
    mem = gdi32.CreateCompatibleDC(hdc)
    bmp = gdi32.CreateCompatibleBitmap(hdc, w, h)
    gdi32.SelectObject(mem, bmp)
    user32.PrintWindow(hwnd, mem, PW_RENDERFULLCONTENT)

    class BMIH(ctypes.Structure):
        _fields_ = [("biSize", wt.DWORD), ("biWidth", wt.LONG), ("biHeight", wt.LONG),
                    ("biPlanes", wt.WORD), ("biBitCount", wt.WORD), ("biCompression", wt.DWORD),
                    ("biSizeImage", wt.DWORD), ("biXPelsPerMeter", wt.LONG),
                    ("biYPelsPerMeter", wt.LONG), ("biClrUsed", wt.DWORD), ("biClrImportant", wt.DWORD)]

    bmi = BMIH(ctypes.sizeof(BMIH), w, -h, 1, 32, 0, 0, 0, 0, 0, 0)
    buf = ctypes.create_string_buffer(w * h * 4)
    gdi32.GetDIBits(mem, bmp, 0, h, buf, ctypes.byref(bmi), 0)
    img = Image.frombuffer("RGBA", (w, h), buf.raw, "raw", "BGRA", 0, 1)

    gdi32.DeleteObject(bmp)
    gdi32.DeleteDC(mem)
    user32.ReleaseDC(hwnd, hdc)

    # trim fully-transparent margins (window shadows)
    bbox = img.getchannel("A").getbbox()
    if bbox:
        img = img.crop(bbox)
    img = img.convert("RGB")
    if img.width != width:
        img = img.resize((width, round(img.height * width / img.width)), Image.LANCZOS)
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, "WEBP", lossless=True, method=6)
    return img.size
