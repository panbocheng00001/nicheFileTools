# -*- coding: utf-8 -*-
"""nichefiletools web 端 SEO/功能冒烟测试：页面可达、TDK、canonical、JSON-LD、内链、密钥回流全流程。"""
import json
import sys
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3002"
SITE = "https://nichefiletools.com"
results = []

def check(name, ok, detail=""):
    results.append((name, ok, detail))
    print(("PASS " if ok else "FAIL ") + name + (" | " + str(detail) if detail and not ok else ""))

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    console_errors, failed_urls = [], []
    page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
    page.on("response", lambda r: failed_urls.append(f"{r.status} {r.url}") if r.status >= 400 else None)

    def visit(path, title_contains=None, canonical=None):
        r = page.goto(BASE + path, wait_until="networkidle")
        check(f"[{path}] HTTP 200", r.status == 200, f"got {r.status}")
        t = page.title()
        if title_contains:
            check(f"[{path}] title 含 '{title_contains}'", title_contains.lower() in t.lower(), t)
        if canonical:
            loc = page.locator('link[rel="canonical"]')
            got = loc.get_attribute("href") if loc.count() else None
            check(f"[{path}] canonical", got == canonical, got)
        lds = page.locator('script[type="application/ld+json"]')
        types = []
        for i in range(lds.count()):
            try:
                data = json.loads(lds.nth(i).inner_text())
                types.append(data.get("@type", "?"))
            except Exception:
                types.append("INVALID-JSON")
        check(f"[{path}] JSON-LD 有效({types})", "INVALID-JSON" not in types and len(types) > 0, types)

    # 1) 首页
    visit("/", title_contains="nichefiletools")
    check("[/] 分类Hub入口存在", page.locator('a[href^="/category/"]').count() >= 4)
    check("[/] 工具卡 5 个", page.locator('a[href^="/tools/"]').count() >= 5)

    # 2) 工具页（A 类）
    visit("/tools/kfx-to-epub", "KFX to EPUB", canonical=f"{SITE}/tools/kfx-to-epub")
    check("[tool] H1 唯一", page.locator("h1").count() == 1, page.locator("h1").inner_text())
    check("[tool] 教程入口卡(→/convert)", page.locator('a[href="/convert/kfx-to-epub"]').count() >= 1)
    check("[tool] FAQ 渲染≥4", page.locator("dt").count() >= 4)

    # 3) C 类工具页（desktop-only）
    visit("/tools/raw-to-iso", "RAW to ISO", canonical=f"{SITE}/tools/raw-to-iso")
    body = page.content()
    check("[C类] 无上传控件", page.locator('input[type="file"]').count() == 0)
    check("[C类] 明示 desktop-only", "desktop" in body.lower())
    ld_all = [json.loads(page.locator('script[type="application/ld+json"]').nth(i).inner_text())
              for i in range(page.locator('script[type="application/ld+json"]').count())]
    check("[C类] 无 SoftwareApplication schema", all(d.get("@type") != "SoftwareApplication" for d in ld_all))

    # 4) 教程页
    visit("/convert/kfx-to-epub", "How to Convert KFX to EPUB", canonical=f"{SITE}/convert/kfx-to-epub")
    check("[convert] 方法对比表", page.locator("table").count() >= 1)
    check("[convert] 回链工具页", page.locator('a[href="/tools/kfx-to-epub"]').count() >= 1)

    # 5) 教程索引 + 分类 Hub
    visit("/convert", "Conversion")
    visit("/category/3d", "3D", canonical=f"{SITE}/category/3d")
    check("[category] 工具卡≥2", page.locator('a[href^="/tools/"]').count() >= 2)

    # 6) 合规/转化页
    for path, kw in [("/privacy", "Privacy"), ("/terms", "Terms"), ("/cookie", "Cookie"),
                     ("/about", "About"), ("/support", "Support"), ("/contact", "Contact"),
                     ("/pricing", "Pricing"), ("/license", "License"), ("/download", "Download")]:
        visit(path, kw)

    # 7) footer 法律链接真实
    page.goto(BASE + "/tools/kfx-to-epub", wait_until="networkidle")
    for href in ["/privacy", "/terms", "/cookie", "/contact"]:
        check(f"[footer] {href} 真实链接", page.locator(f'footer a[href="{href}"]').count() >= 1)

    # 8) free-trial
    page.goto(BASE + "/free-trial", wait_until="networkidle")
    page.wait_for_timeout(800)
    check("[free-trial] 无token显示invalid", page.locator("text=Invalid link").count() >= 1)
    page.goto(BASE + "/free-trial?token=FAKE123", wait_until="networkidle")
    can = page.locator('link[rel="canonical"]').get_attribute("href")
    check("[free-trial] 带参 canonical 归一", can == f"{SITE}/free-trial", can)
    # Next 归一化尾斜杠 → 用前缀匹配
    for h in ["/tools", "/convert", "/support", "/pricing"]:
        n = page.locator(f'a[href^="{h}"]').count()
        check(f"[free-trial] 导流链接 {h}", n >= 1, n)

    # 9) 404
    r = page.goto(BASE + "/tools/does-not-exist", wait_until="networkidle")
    check("[404] 状态码404", r.status == 404, r.status)
    check("[404] 页面渲染导航", page.locator("text=Page not found").count() == 1)
    console_errors.clear()  # 404 文档自身会产生一条预期内的 404 控制台消息

    # 10) robots/sitemap（原始请求，不经浏览器 XML 查看器）
    rb = page.request.get(BASE + "/robots.txt").text()
    check("[robots] Disallow /api/", "/api/" in rb)
    check("[robots] sitemap 声明", "sitemap.xml" in rb)
    sm = page.request.get(BASE + "/sitemap.xml").text()
    check("[sitemap] 含工具页", "/tools/kfx-to-epub" in sm)
    check("[sitemap] 含教程页", "/convert/kfx-to-epub" in sm)
    check("[sitemap] 含分类Hub", "/category/3d" in sm)
    check("[sitemap] 含合规页", "/privacy" in sm)
    check("[sitemap] 无token参数URL", "token=" not in sm)

    # 11) 密钥回流 API 全流程（device 终身一次 + 一次性 + 限流）
    api = page.request
    r1 = api.post(BASE + "/api/desktop-token", data={"device_id": "test-device-alpha"})
    check("[api] 发token 200", r1.status == 200, r1.status)
    tok = r1.json().get("token")
    rv = api.get(BASE + f"/api/desktop-validate?token={tok}")
    key = rv.json().get("key")
    check("[api] validate 返回 key", bool(key), rv.json())
    rr = api.post(BASE + "/api/desktop-redeem", data={"token": tok, "key": key, "device_id": "test-device-alpha"})
    check("[api] 核销成功", rr.status == 200, rr.status)
    rr2 = api.post(BASE + "/api/desktop-redeem", data={"token": tok, "key": key, "device_id": "test-device-alpha"})
    check("[api] token一次性(重复核销拒绝)", rr2.status == 400, rr2.status)
    r3 = api.post(BASE + "/api/desktop-token", data={"device_id": "test-device-alpha"})
    check("[api] 设备终身一次(核销后再取403)", r3.status == 403, r3.status)
    rv2 = api.get(BASE + f"/api/desktop-validate?token={tok}")
    check("[api] 已核销token不可再用", rv2.json().get("valid") is False, rv2.json())
    limited = False
    for i in range(10):
        if api.post(BASE + "/api/desktop-token", data={"device_id": f"dev-ratelimit-{i}"}).status == 429:
            limited = True
            break
    check("[api] IP限流 429", limited)
    check("[api] 缺 device_id 400", api.post(BASE + "/api/desktop-token", data={}).status == 400)

    # 12) 资源/控制台错误（排除外网字体）
    real_404 = [u for u in failed_urls if "localhost" in u
                and "does-not-exist" not in u and "FAKE" not in u
                and ".hot-update." not in u]  # dev HMR 残留，生产构建不存在
    check("[资源] 无本站 404 资源", len(real_404) == 0, real_404[:5])
    real_errors = [e for e in console_errors if "net::" not in e and "RSC payload" not in e and "hmrRefresh" not in e]
    check("[console] 无 JS 错误", len(real_errors) == 0, real_errors[:3])

    browser.close()

fails = [r for r in results if not r[1]]
print(f"\n===== {len(results) - len(fails)}/{len(results)} PASS =====")
if fails:
    print("FAILED:")
    for n, _, d in fails:
        print(" -", n, "|", d)
sys.exit(1 if fails else 0)
