#!/usr/bin/env python3
"""
End-to-end UI check for Safari Trails.

Drives the real site in a real browser against the real API: navigates every
page, exercises the filters, submits a booking form, signs into the operator
dashboard — and captures a screenshot of each step.

    python3 scripts/ui-check.py [--base http://localhost:5173] [--out screenshots]

Fails loudly (exit code 1) if any page logs a console error or a network
request to the API fails.
"""
import argparse
import os
import sys
import time
from pathlib import Path

os.environ.setdefault("PLAYWRIGHT_BROWSERS_PATH", "/root/.cache/ms-playwright")

from playwright.sync_api import sync_playwright  # noqa: E402

CHROMIUM = "/root/.cache/ms-playwright/chromium-1243/chrome-linux/chrome"

CONSOLE_ERRORS: list[str] = []
FAILED_REQUESTS: list[str] = []
STEPS: list[str] = []


def scroll_through(page) -> None:
    """Scroll the whole page so IntersectionObserver reveals fire.

    A full-page screenshot does not scroll, so scroll-animated sections would
    be captured still at opacity 0.
    """
    height = page.evaluate("document.body.scrollHeight")
    step = max(300, height // 8)
    position = 0
    while position < height:
        position += step
        page.evaluate(f"window.scrollTo(0, {position})")
        page.wait_for_timeout(140)
    page.evaluate("window.scrollTo(0, 0)")
    page.wait_for_timeout(450)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="http://localhost:5173")
    parser.add_argument("--out", default="screenshots")
    parser.add_argument("--headed", action="store_true")
    args = parser.parse_args()

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    def shot(page, name: str, full: bool = True) -> None:
        if full:
            scroll_through(page)
        path = out / f"{name}.png"
        page.screenshot(path=str(path), full_page=full)
        STEPS.append(f"  saved {path}")

    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=CHROMIUM,
            headless=not args.headed,
            args=["--no-sandbox", "--disable-dev-shm-usage"],
        )

        context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            device_scale_factor=1,
        )
        page = context.new_page()

        page.on(
            "console",
            lambda msg: CONSOLE_ERRORS.append(f"[{page.url}] {msg.text}")
            if msg.type == "error"
            else None,
        )
        page.on(
            "requestfailed",
            lambda req: FAILED_REQUESTS.append(f"{req.method} {req.url} — {req.failure}")
            if "/api/" in req.url
            else None,
        )
        page.on(
            "response",
            lambda res: FAILED_REQUESTS.append(f"{res.status} {res.url}")
            if "/api/" in res.url and res.status >= 400
            else None,
        )

        base = args.base.rstrip("/")

        # ------------------------------------------------------------------
        print("1. Home")
        page.goto(base, wait_until="networkidle")
        page.wait_for_timeout(900)
        assert page.locator("h1").first.is_visible(), "home hero heading missing"
        shot(page, "01-home")

        # Featured tours must have rendered from the API
        cards = page.locator("a[href^='/tours/']")
        print(f"   tour links on home: {cards.count()}")
        assert cards.count() >= 3, "expected featured tours on the home page"

        # ------------------------------------------------------------------
        print("2. Tours list + filters")
        page.goto(f"{base}/tours", wait_until="networkidle")
        page.wait_for_timeout(700)
        shot(page, "02-tours")

        before = page.locator("a[href^='/tours/']").count()
        # React controls these checkboxes, so use click() rather than check()
        # (Playwright's check() re-reads the DOM before React has re-rendered).
        page.get_by_role("checkbox").first.click()
        page.wait_for_timeout(1200)
        after = page.locator("a[href^='/tours/']").count()
        print(f"   results before filter: {before} -> after: {after}")
        print(f"   url now: {page.url}")
        assert after <= before, "filter did not narrow the results"
        assert "destination=" in page.url, "filter did not reach the URL"
        shot(page, "03-tours-filtered")

        # Search
        page.goto(f"{base}/tours", wait_until="networkidle")
        page.wait_for_timeout(500)
        page.fill("#filter-q", "gorilla")
        page.wait_for_timeout(900)
        search_hits = page.locator("a[href^='/tours/']").count()
        print(f"   results for 'gorilla': {search_hits}")
        shot(page, "04-tours-search")

        # ------------------------------------------------------------------
        print("3. Tour detail")
        page.goto(f"{base}/tours/mountain-gorilla-trekking-bwindi", wait_until="networkidle")
        page.wait_for_timeout(800)
        assert "Mountain Gorilla" in page.locator("h1").first.inner_text()
        # open a second itinerary day
        days = page.locator("button[aria-expanded]")
        if days.count() > 1:
            days.nth(1).click()
            page.wait_for_timeout(400)
        shot(page, "05-tour-detail")

        # ------------------------------------------------------------------
        print("4. Booking modal")
        page.get_by_role("button", name="Request to book").click()
        page.wait_for_timeout(600)
        assert page.locator("#booking-name").is_visible(), "booking form did not open"
        shot(page, "06-booking-modal", full=False)

        page.fill("#booking-name", "UI Check Guest")
        page.fill("#booking-email", "ui-check@example.com")
        page.select_option("#booking-travellers", "2")
        page.fill("#booking-date", "2026-12-20")
        page.fill("#booking-message", "Automated end-to-end check.")
        page.get_by_role("button", name="Send booking request").click()
        page.wait_for_timeout(1400)
        assert "Request received" in page.locator("body").inner_text(), "booking not confirmed"
        shot(page, "07-booking-confirmed", full=False)

        # ------------------------------------------------------------------
        print("5. Destinations")
        page.goto(f"{base}/destinations", wait_until="networkidle")
        page.wait_for_timeout(800)
        shot(page, "08-destinations")

        page.goto(f"{base}/destinations/lake-bunyonyi", wait_until="networkidle")
        page.wait_for_timeout(700)
        shot(page, "09-destination-detail")

        # ------------------------------------------------------------------
        print("6. Contact")
        page.goto(f"{base}/contact", wait_until="networkidle")
        page.wait_for_timeout(600)
        page.fill("#contact-name", "UI Check")
        page.fill("#contact-email", "ui-check@example.com")
        page.fill("#contact-subject", "Automated check")
        page.fill("#contact-message", "This message was sent by the UI verification script.")
        page.get_by_role("button", name="Send message").click()
        page.wait_for_timeout(1200)
        assert "Message sent" in page.locator("body").inner_text(), "contact form not confirmed"
        shot(page, "10-contact")

        # ------------------------------------------------------------------
        print("7. Admin")
        page.goto(f"{base}/admin", wait_until="networkidle")
        page.wait_for_timeout(500)
        shot(page, "11-admin-login", full=False)

        page.fill("#admin-email", "admin@safaritrails.com")
        page.fill("#admin-password", "SafariTrails2026!")
        page.get_by_role("button", name="Sign in").click()
        page.wait_for_timeout(1500)
        assert "Bookings" in page.locator("body").inner_text(), "admin login failed"
        shot(page, "12-admin-dashboard")

        # ------------------------------------------------------------------
        print("8. Mobile")
        mobile = browser.new_context(
            viewport={"width": 390, "height": 844},
            device_scale_factor=2,
            is_mobile=True,
            has_touch=True,
        )
        mpage = mobile.new_page()
        mpage.goto(base, wait_until="networkidle")
        mpage.wait_for_timeout(900)
        mpage.screenshot(path=str(out / "13-mobile-home.png"), full_page=True)
        STEPS.append(f"  saved {out / '13-mobile-home.png'}")

        mpage.get_by_label("Open menu").click()
        mpage.wait_for_timeout(500)
        mpage.screenshot(path=str(out / "14-mobile-menu.png"), full_page=False)
        STEPS.append(f"  saved {out / '14-mobile-menu.png'}")

        mpage.get_by_role("link", name="Tours").first.click()
        mpage.wait_for_timeout(1200)
        mpage.screenshot(path=str(out / "15-mobile-tours.png"), full_page=True)
        STEPS.append(f"  saved {out / '15-mobile-tours.png'}")

        # ------------------------------------------------------------------
        print("9. 404")
        page.goto(f"{base}/this-page-does-not-exist", wait_until="networkidle")
        page.wait_for_timeout(400)
        shot(page, "16-not-found")

        browser.close()

    print("\n--- results ---")
    print("\n".join(STEPS))
    print(f"\nconsole errors : {len(CONSOLE_ERRORS)}")
    for e in CONSOLE_ERRORS[:20]:
        print("  ", e)
    print(f"failed requests: {len(FAILED_REQUESTS)}")
    for r in FAILED_REQUESTS[:20]:
        print("  ", r)

    if CONSOLE_ERRORS or FAILED_REQUESTS:
        print("\nFAILED")
        return 1
    print("\nPASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
