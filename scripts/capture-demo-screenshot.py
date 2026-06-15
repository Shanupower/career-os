#!/usr/bin/env python3
"""Capture demo dashboard screenshot for README hero."""
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs/assets/demo-dashboard.png"
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
BASE = f"http://localhost:{PORT}"


def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1280, "height": 720})
        page.goto(BASE, wait_until="networkidle", timeout=120000)
        page.get_by_role("button", name="Explore live demo").click(timeout=30000)
        page.wait_for_timeout(1500)
        page.get_by_role("button", name="Jobs", exact=True).click(timeout=10000)
        page.wait_for_timeout(2000)
        page.screenshot(path=str(OUT), full_page=False)
        browser.close()

    print(f"Saved {OUT}")


if __name__ == "__main__":
    main()
