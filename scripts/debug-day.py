#!/usr/bin/env python3
"""Debug the add-a-day flow: dump console output, requests and responses."""
import os
import sys

os.environ.setdefault("PLAYWRIGHT_BROWSERS_PATH", "/root/.cache/ms-playwright")
from playwright.sync_api import sync_playwright  # noqa: E402

CHROMIUM = "/root/.cache/ms-playwright/chromium-1243/chrome-linux/chrome"
BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:4173"
TOUR = sys.argv[2] if len(sys.argv) > 2 else "35"

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=CHROMIUM, args=["--no-sandbox"])
    page = browser.new_page(viewport={"width": 1440, "height": 1200})

    page.on("console", lambda m: print(f"  CONSOLE {m.type}: {m.text[:300]}"))
    page.on("pageerror", lambda e: print(f"  PAGEERROR: {str(e)[:300]}"))

    def on_response(r):
        if "/api/" in r.url:
            body = ""
            try:
                body = r.text()[:300]
            except Exception:
                pass
            print(f"  RESP {r.status} {r.request.method} {r.url} -> {body}")

    page.on("response", on_response)

    page.goto(f"{BASE}/admin", wait_until="networkidle")
    page.fill("#admin-email", "admin@safaritrails.com")
    page.fill("#admin-password", "eXThAbVVDN!7St")
    page.click("button[type=submit]")
    page.wait_for_selector("text=Signed in as", timeout=15000)

    print("== navigate to the tour editor ==")
    page.goto(f"{BASE}/admin/tours/{TOUR}", wait_until="networkidle")
    page.wait_for_selector("text=Add a day", timeout=15000)

    print("== how many forms are on the page? ==")
    print("  forms:", page.eval_on_selector_all("form", "els => els.length"))
    print(
        "  nested?:",
        page.eval_on_selector_all(
            "form form", "els => els.length"
        ),
    )
    print("  add-day form inside another form:", page.evaluate(
        "() => { const f = document.querySelector('#new-day-number'); "
        "let n = f, depth = 0; while ((n = n.parentElement)) if (n.tagName === 'FORM') depth++; "
        "return depth; }"
    ))

    print("== fill and submit ==")
    page.fill("#new-day-number", "1")
    page.fill("input[placeholder='Title — e.g. Arrival in Entebbe']", "Arrival in Entebbe")
    page.fill("textarea[placeholder='What happens on this day?']", "Meet the group at the airport.")
    page.click("button:has-text('Add day')")
    page.wait_for_timeout(3000)

    print("== resulting inputs ==")
    print(page.evaluate(
        "() => Array.from(document.querySelectorAll('input')).map(i => i.value).filter(Boolean)"
    ))

    browser.close()
