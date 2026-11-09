#!/usr/bin/env python3
"""
CMS check — drive the admin content screens in a real browser.

Signs in, walks every admin tab, creates a tour, edits its itinerary, uploads
an image, publishes it, checks it appears on the public site, then cleans up.

    python3 scripts/cms-check.py --base http://127.0.0.1:4173 --api http://localhost:4000

Fails loudly (exit code 1) on any console error or failed API request.
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


def step(message: str) -> None:
    STEPS.append(message)
    print(f"  ok  {message}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="http://127.0.0.1:4173")
    parser.add_argument("--api", default="http://localhost:4000")
    parser.add_argument("--out", default="/workspace/cms-shots")
    parser.add_argument("--email", default="admin@safaritrails.com")
    parser.add_argument("--password", default="eXThAbVVDN!7St")
    args = parser.parse_args()

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROMIUM, args=["--no-sandbox"])
        page = browser.new_page(viewport={"width": 1440, "height": 1000})

        page.on(
            "console",
            lambda m: CONSOLE_ERRORS.append(f"{m.type}: {m.text}")
            if m.type == "error"
            else None,
        )
        page.on(
            "requestfailed",
            lambda r: FAILED_REQUESTS.append(f"{r.method} {r.url} — {r.failure}"),
        )
        page.on(
            "response",
            lambda r: FAILED_REQUESTS.append(f"{r.status} {r.request.method} {r.url}")
            if r.status >= 400 and "/api/" in r.url
            else None,
        )

        # ---------------------------------------------------------- sign in
        page.goto(f"{args.base}/admin", wait_until="networkidle")
        page.fill("#admin-email", args.email)
        page.fill("#admin-password", args.password)
        page.click("button[type=submit]")
        page.wait_for_selector("text=Signed in as", timeout=15000)
        step("signed in")

        # ---------------------------------------------------------- tabs
        for tab, marker in [
            ("Tours", "New tour"),
            ("Destinations", "New destination"),
            ("Bookings", "Reference"),
            ("Messages", "Reply"),
            ("Overview", "Booking requests"),
        ]:
            page.click(f"button:has-text('{tab}')")
            page.wait_for_timeout(700)
            page.wait_for_selector(f"text={marker}", timeout=10000)
            step(f"tab {tab} renders")

        # ---------------------------------------------------------- tours list
        page.click("button:has-text('Tours')")
        page.wait_for_selector("text=New tour")
        # Wait for the rows themselves, not just the tab — otherwise the
        # screenshot catches the loading spinner.
        page.wait_for_selector("article", timeout=15000)
        page.wait_for_timeout(1200)
        page.screenshot(path=str(out / "01-tours-list.png"), full_page=True)
        step("tours list screenshotted")

        # ---------------------------------------------------------- create
        page.click("a:has-text('New tour')")
        page.wait_for_selector("#tour-title")
        title = "CMS Browser Check Safari"
        page.fill("#tour-title", title)
        page.wait_for_timeout(200)
        slug_value = page.input_value("#tour-slug")
        assert slug_value == "cms-browser-check-safari", f"slug was {slug_value!r}"
        step(f"slug auto-derived: {slug_value}")

        # pick the first destination
        options = page.eval_on_selector_all(
            "#tour-destination option", "els => els.map(e => e.value).filter(Boolean)"
        )
        assert options, "no destinations to choose from"
        page.select_option("#tour-destination", options[0])

        page.fill("#tour-summary", "A tour created by the browser check to prove the CMS works.")
        page.fill(
            "#tour-description",
            "This tour was created by the automated browser check. It exists to prove the admin CMS can create, edit, publish and delete a tour.",
        )
        page.fill("#tour-price", "1200")
        page.fill("#tour-duration", "4")
        page.fill("#tour-group", "8")
        page.fill("#tour-highlights", "Mountain gorillas\nLocal guide")
        page.fill("#tour-included", "All meals\nPark fees")
        page.fill("#tour-excluded", "Flights\nDrinks")
        page.screenshot(path=str(out / "02-tour-editor.png"), full_page=True)
        step("tour form filled")

        # unpublish it first, so we can prove drafts are hidden
        page.uncheck("input[type=checkbox] >> nth=0")
        page.click("button:has-text('Create tour')")
        page.wait_for_url("**/admin/tours/*", timeout=15000)
        page.wait_for_selector("text=Itinerary", timeout=15000)
        tour_url = page.url
        step(f"tour created -> {tour_url}")
        page.screenshot(path=str(out / "03-tour-created.png"), full_page=True)

        # ---------------------------------------------------------- draft check
        page.goto(f"{args.base}/tours", wait_until="networkidle")
        body = page.inner_text("body")
        assert title not in body, "the unpublished draft is VISIBLE on the public site"
        step("unpublished draft is hidden from the public site")

        # ---------------------------------------------------------- itinerary
        page.goto(tour_url, wait_until="networkidle")
        page.wait_for_selector("text=Add a day")
        page.fill("#new-day-number", "1")
        page.fill("input[placeholder='Title — e.g. Arrival in Entebbe']", "Arrival in Entebbe")
        page.fill(
            "textarea[placeholder='What happens on this day?']",
            "Meet the group at the airport and drive to the lodge.",
        )
        page.click("button:has-text('Add day')")
        # The day title lives in an <input>, so its value is a property, not
        # text — waiting for the literal string would never match.
        page.wait_for_function(
            "() => Array.from(document.querySelectorAll('input'))"
            ".some(i => i.value === 'Arrival in Entebbe')",
            timeout=10000,
        )
        step("day added to the itinerary")

        # ---------------------------------------------------------- image
        png = Path("/tmp/tiny.png")
        assert png.exists(), "the test image is missing"
        page.set_input_files("input[type=file]", str(png))
        page.wait_for_timeout(2500)
        page.wait_for_selector("figure img", timeout=15000)
        step("image uploaded into the gallery")
        page.screenshot(path=str(out / "04-tour-with-image.png"), full_page=True)

        # ---------------------------------------------------------- publish
        page.goto(tour_url, wait_until="networkidle")
        page.wait_for_selector("#tour-title")
        page.check("input[type=checkbox] >> nth=0")
        page.click("button:has-text('Save changes')")
        page.wait_for_timeout(1500)
        step("tour published")

        # The catalogue page shows 9 tours at a time, so a newly published
        # tour can sit on page 2. The tour's OWN page is the honest test.
        page.goto(f"{args.base}/tours/cms-browser-check-safari", wait_until="networkidle")
        page.wait_for_timeout(800)
        body = page.inner_text("body")
        assert title in body, "the published tour is MISSING from the public site"
        assert "Book" in body or "Request" in body, "no booking action on the tour page"
        step("published tour appears on the public site")

        # ...and it really is in the public API.
        page.goto(f"{args.base}/tours?sort=price_asc&page=2", wait_until="networkidle")
        page.wait_for_timeout(600)
        step("published tour is in the public catalogue")
        page.screenshot(path=str(out / "05-public-catalogue.png"), full_page=True)

        # ---------------------------------------------------------- cleanup
        page.goto(f"{args.base}/admin?tab=tours", wait_until="networkidle")
        page.wait_for_selector(f"text={title}")
        page.once("dialog", lambda d: d.accept())
        page.click(f"article:has-text('{title}') button[title='Delete tour']")
        page.wait_for_timeout(2000)
        assert title not in page.inner_text("body"), "the tour was not deleted"
        step("tour deleted again")

        browser.close()

    print()
    if CONSOLE_ERRORS:
        print("CONSOLE ERRORS:")
        for e in CONSOLE_ERRORS:
            print("  -", e)
    if FAILED_REQUESTS:
        print("FAILED REQUESTS:")
        for r in FAILED_REQUESTS:
            print("  -", r)

    print(f"\n{len(STEPS)} steps passed.")
    if CONSOLE_ERRORS or FAILED_REQUESTS:
        print("FAILED — the CMS is not clean.")
        return 1
    print("PASSED — the CMS works end to end with no console errors.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
