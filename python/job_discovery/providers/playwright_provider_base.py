"""Reusable Playwright helper for browser-based providers."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable

logger = logging.getLogger(__name__)


def _debug_dir(root: Path) -> Path:
    path = root / "data" / "jobs" / "debug"
    path.mkdir(parents=True, exist_ok=True)
    return path


def run_with_browser(
    root: Path,
    provider_name: str,
    page_action: Callable,
    *,
    timeout_ms: int = 30000,
) -> list[dict]:
    """Launch chromium, run page_action(page), return jobs or [] on failure."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        logger.warning("%s: Playwright not installed; skipping browser fetch.", provider_name)
        return []

    browser = None
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            page = browser.new_page()
            page.set_default_timeout(timeout_ms)
            return page_action(page) or []
    except Exception as exc:
        logger.warning("%s browser fetch failed: %s", provider_name, exc)
        try:
            from playwright.sync_api import sync_playwright

            with sync_playwright() as playwright:
                browser = playwright.chromium.launch(headless=True)
                page = browser.new_page()
                stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
                screenshot = _debug_dir(root) / f"{provider_name}-{stamp}.png"
                page.screenshot(path=str(screenshot))
                logger.info("Saved debug screenshot: %s", screenshot)
        except Exception as shot_exc:
            logger.debug("Could not save screenshot: %s", shot_exc)
        return []
    finally:
        if browser is not None:
            try:
                browser.close()
            except Exception:
                pass
