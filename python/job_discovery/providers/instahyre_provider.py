"""Instahyre provider — skeleton / Playwright-ready."""

from __future__ import annotations

import logging

from providers.base_provider import JobProvider

logger = logging.getLogger(__name__)


class InstahyreProvider(JobProvider):
    provider_name = "instahyre"

    def fetch_jobs(
        self,
        search_terms: list[str],
        locations: list[str],
        remote_filters: list[str],
        country: str = "India",
    ) -> list[dict]:
        logger.info("Instahyre provider is skeleton mode.")
        _ = (search_terms, locations, remote_filters, country)
        # Future: use playwright_provider_base.run_with_browser for scraping
        return []
