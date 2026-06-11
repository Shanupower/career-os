"""Y Combinator Work at a Startup jobs API provider."""

from __future__ import annotations

import logging

import requests

from providers.base_provider import JobProvider, build_canonical_job, filter_jobs

logger = logging.getLogger(__name__)

API_URL = "https://www.workatastartup.com/api/jobs"


class YCProvider(JobProvider):
    provider_name = "yc"

    def _fetch_all(self) -> list[dict]:
        try:
            resp = requests.get(API_URL, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            if isinstance(data, dict):
                return data.get("jobs") or data.get("data") or []
            if isinstance(data, list):
                return data
            return []
        except Exception as exc:
            logger.warning("YC jobs fetch failed: %s", exc)
            return []

    def fetch_jobs(
        self,
        search_terms: list[str],
        locations: list[str],
        remote_filters: list[str],
        country: str = "India",
    ) -> list[dict]:
        primary_term = search_terms[0] if search_terms else ""
        primary_loc = locations[0] if locations else ""
        all_jobs: list[dict] = []

        for posting in self._fetch_all():
            title = posting.get("title") or posting.get("role") or ""
            company_info = posting.get("company") or {}
            if isinstance(company_info, dict):
                company = company_info.get("name") or company_info.get("slug") or "YC Startup"
            else:
                company = str(company_info) or "YC Startup"
            location = posting.get("location") or posting.get("city") or "Unspecified"
            url = posting.get("url") or posting.get("apply_url") or posting.get("link") or ""
            description = posting.get("description") or posting.get("snippet") or ""

            job = build_canonical_job(
                provider="yc",
                source="workatastartup",
                title=title,
                company=company,
                location=str(location),
                job_url=url,
                description=description,
                is_remote="remote" in str(location).lower(),
                search_term=primary_term,
                search_location=primary_loc,
                site="workatastartup",
            )
            if job["title"]:
                all_jobs.append(job)

        return filter_jobs(all_jobs, search_terms, locations, remote_filters, country)
