# -*- coding: utf-8 -*-
"""端到端：模拟桌面端完整回流回路。
桌面 Rust 端 request_token 的等价 HTTP 调用 → 浏览器打开 /free-trial?token=... →
页面展示 key（Key ready）→ redeem 成功。验证前后端契约与 UI 渲染。"""
import sys
import time
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3002"
DEV = f"desktop-e2e-{int(time.time())}"

def check(name, ok, detail=""):
    print(("PASS " if ok else "FAIL ") + name + (f" | {detail}" if detail and not ok else ""))
    if not ok:
        globals().setdefault("fails", []).append(name)

check_globals = globals()
fails = []
check_globals["fails"] = fails

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context()
    context.grant_permissions(["clipboard-read", "clipboard-write"])
    page = context.new_page()

    # 1) 模拟桌面端 request_token（key_reflow.rs 的 HTTP 契约：POST {device_id}）
    r = page.request.post(BASE + "/api/desktop-token", data={"device_id": DEV})
    tok = r.json().get("token")
    check("桌面端契约: POST desktop-token 成功", r.status == 200 and len(tok or "") == 24, r.json())

    # 2) 模拟「直接打开浏览器」路径（utm_source=desktop_app_direct）
    r = page.goto(f"{BASE}/free-trial?token={tok}&utm_source=desktop_app_direct", wait_until="networkidle")
    page.wait_for_timeout(1000)
    check("路径1: 页面 200", r.status == 200)
    check("路径1: 显示 Key ready", page.locator("text=Key ready").count() == 1)
    key_el = page.locator("code.font-mono")
    key = key_el.inner_text().strip() if key_el.count() else ""
    check("路径1: 密钥可见 NF-XXXX-XXXX-XXXX", key.startswith("NF-") and len(key) == 17, key)
    check("路径1: Copy key 按钮存在", page.locator("text=Copy key").count() >= 1)
    check("路径1: 24h/一次性/每设备一次提示", "One free key per device" in page.content())

    # 3) Copy key 点击反馈
    page.get_by_role("button", name="Copy key").click()
    page.wait_for_timeout(600)
    n = page.locator("button", has_text="Copied").count()
    if n == 0:
        clip = page.evaluate("""async () => {
          try { await navigator.clipboard.writeText('X'); return 'ok'; }
          catch (e) { return e.name + ': ' + e.message; }
        }""")
        print(f"    [diag] Copied count=0, direct clipboard write => {clip}")
    check("路径1: 点击后 Copied! 反馈", n == 1)

    # 4) 模拟用户拿 key 回桌面端核销（redeem_key.rs 的 HTTP 契约）
    rr = page.request.post(BASE + "/api/desktop-redeem", data={"token": tok, "key": key, "device_id": DEV})
    check("桌面端契约: redeem 成功(授予2次额度)", rr.status == 200, rr.status)

    # 5) 同 token 二次打开页面 → invalid（一次性）
    r = page.goto(f"{BASE}/free-trial?token={tok}", wait_until="networkidle")
    page.wait_for_timeout(800)
    check("一次性: 二次访问显示 Invalid link", page.locator("text=Invalid link").count() == 1)

    # 6) 路径2（复制链接/跨设备）：新 context 模拟另一台设备浏览器
    ctx2 = browser.new_context()
    p2 = ctx2.new_page()
    tok2_r = p2.request.post(BASE + "/api/desktop-token", data={"device_id": DEV + "-b"})
    tok2 = tok2_r.json().get("token")
    r = p2.goto(f"{BASE}/free-trial?token={tok2}&utm_source=desktop_app_copy_link", wait_until="networkidle")
    p2.wait_for_timeout(1000)
    check("路径2(跨设备): Key ready", p2.locator("text=Key ready").count() == 1)
    ctx2.close()

    browser.close()

print(f"\n===== {len(fails) == 0 and 'ALL PASS' or 'FAILED'} =====")
for f in fails:
    print(" -", f)
sys.exit(1 if fails else 0)
