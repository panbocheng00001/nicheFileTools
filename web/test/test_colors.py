# -*- coding: utf-8 -*-
"""色调调整验证：截取 亮/暗 两种主题的关键页面截图，并断言关键色值。"""
import sys
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3003"
fails = []

def check(name, ok, detail=""):
    print(("PASS " if ok else "FAIL ") + name + (f" | {detail}" if detail and not ok else ""))
    if not ok:
        fails.append(name)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={"width": 1440, "height": 1000}, device_scale_factor=1)
    page = ctx.new_page()

    for theme in ["light", "dark"]:
        # next-themes: 预写 localStorage 再打开页面，避免闪烁
        ctx.add_init_script(f"localStorage.setItem('theme','{theme}')")
        page.goto(BASE + "/tools/raw-to-wav", wait_until="networkidle")
        page.wait_for_timeout(600)
        page.screenshot(path=f"shot_tools_{theme}.png", full_page=False)
        bg = page.evaluate("getComputedStyle(document.body).backgroundColor")
        btn = page.evaluate(
            "getComputedStyle(document.querySelector('button.bg-primary')).backgroundColor"
        )
        print(f"    [{theme}] body={bg} primary-btn={btn}")
        if theme == "light":
            check("[light] 背景近白(非纯白)", bg == "rgb(250, 250, 250)", bg)
            check("[light] 主按钮柔灰非近黑", btn == "rgb(63, 63, 70)", btn)
        else:
            check("[dark] 背景深灰蓝非纯黑", bg == "rgb(16, 16, 20)", bg)
            check("[dark] 主按钮柔和绿非荧光", btn == "rgb(74, 222, 128)", btn)

    # 首页 hero 截图
    ctx.add_init_script("localStorage.setItem('theme','dark')")
    page.goto(BASE + "/", wait_until="networkidle")
    page.wait_for_timeout(500)
    page.screenshot(path="shot_home_dark.png")

    browser.close()

print("===== " + ("ALL PASS" if not fails else f"{len(fails)} FAILED") + " =====")
for f in fails:
    print(" -", f)
sys.exit(1 if fails else 0)
