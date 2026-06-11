"""Naukri.com provider — experimental skeleton.

Full implementation requires Playwright scraping due to lack of a public API.
Use JobSpy with site_name='naukri' as an alternative when available.
"""

from __future__ import annotations

import logging

from providers.base_provider import JobProvider

logger = logging.getLogger(__name__)


class NaukriProvider(JobProvider):
    provider_name = "naukri"

    def fetch_jobs(
        self,
        search_terms: list[str],
        locations: list[str],
        remote_filters: list[str],
        country: str = "India",
    ) -> list[dict]:
        logger.info(
            "Naukri provider is not yet implemented. "
            "Use providers=india with JobSpy or contribute a scraper — see CONTRIBUTING.md."
        )
        _ = (search_terms, locations, remote_filters, country)
        return []
