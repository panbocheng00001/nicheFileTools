# -*- coding: utf-8 -*-
"""no-prose 修复验证：prose 容器内样式化链接的文字颜色不得与背景同色。"""
import sys
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
fails = []

def check(name, ok, detail=""):
    print(("PASS " if ok else "FAIL ") + name + (f" | {detail}" if detail and not ok else ""))
    if not ok:
        fails.append(name)

def contrast_ok(color, bg):
    return color != bg

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={"width": 1440, "height": 1000})
    page = ctx.new_page()

    for theme in ["light", "dark"]:
        ctx.add_init_script(f"localStorage.setItem('theme','{theme}')")
        page.goto(BASE + "/pricing", wait_until="networkidle")
        page.wait_for_timeout(500)

        for label, sel in [("主按钮 Download & try free", "a.bg-primary"), ("次按钮 How licenses work", "a.border")]:
            el = page.locator(sel).first
            color = el.evaluate("e => getComputedStyle(e).color")
            bg = el.evaluate("e => getComputedStyle(e).backgroundColor")
            deco = el.evaluate("e => getComputedStyle(e).textDecorationLine")
            check(f"[pricing:{theme}] {label} 文字≠背景", contrast_ok(color, bg), f"color={color} bg={bg}")
            check(f"[pricing:{theme}] {label} 无 prose 下划线", "underline" not in deco, deco)
        page.screenshot(path=f"shot_pricing_{theme}.png")

        # support 卡片与 convert CTA
        page.goto(BASE + "/support", wait_until="networkidle")
        page.wait_for_timeout(400)
        h = page.locator("a.no-prose h2").first
        deco = h.evaluate("e => getComputedStyle(e.closest('a')).textDecorationLine")
        check(f"[support:{theme}] 卡片链接无下划线", "underline" not in deco, deco)

        page.goto(BASE + "/convert/kfx-to-epub", wait_until="networkidle")
        page.wait_for_timeout(400)
        btn = page.locator("a.no-prose.bg-primary").first
        color = btn.evaluate("e => getComputedStyle(e).color")
        bg = btn.evaluate("e => getComputedStyle(e).backgroundColor")
        check(f"[convert:{theme}] CTA 文字≠背景", contrast_ok(color, bg), f"color={color} bg={bg}")

        # 纯文本 prose 链接仍保留主色下划线样式
        page.goto(BASE + "/license", wait_until="networkidle")
        plain = page.locator(".seo-prose a:not(.no-prose)").first
        deco = plain.evaluate("e => getComputedStyle(e).textDecorationLine")
        check(f"[license:{theme}] 正文链接保留下划线样式", "underline" in deco, deco)

    browser.close()

print("===== " + ("ALL PASS" if not fails else f"{len(fails)} FAILED") + " =====")
for f in fails:
    print(" -", f)
sys.exit(1 if fails else 0)
