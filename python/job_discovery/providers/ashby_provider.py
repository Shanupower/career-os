"""Ashby public job board API provider."""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path

import requests

from providers.base_provider import JobProvider, build_canonical_job, filter_jobs
from providers.config_paths import resolve_config

logger = logging.getLogger(__name__)

CONFIG_PATH = resolve_config("ashby.json", "ashby_companies.json")
API_URL = "https://api.ashbyhq.com/posting-api/job-board/{slug}"


class AshbyProvider(JobProvider):
    provider_name = "ashby"

    def _load_companies(self) -> list[str]:
        if not CONFIG_PATH.exists():
            return []
        data = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
        return [c for c in data if isinstance(c, str) and c.strip()]

    def _fetch_company(self, slug: str) -> list[dict]:
        url = API_URL.format(slug=slug)
        try:
            resp = requests.get(url, params={"includeCompensation": "true"}, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            return data.get("jobs") or []
        except Exception as exc:
            logger.warning("Ashby company %s failed: %s", slug, exc)
            return []

    def _format_salary(self, compensation: dict | None) -> str:
        if not compensation:
            return ""
        summary = compensation.get("compensationTierSummary") or compensation.get("scrapeableCompensationSalarySummary")
        if summary:
            return str(summary)
        min_val = compensation.get("minValue")
        max_val = compensation.get("maxValue")
        if min_val or max_val:
            return f"{min_val or ''}-{max_val or ''}".strip("-")
        return ""

    def _normalize_posting(
        self,
        posting: dict,
        slug: str,
        search_term: str,
        search_location: str,
    ) -> dict:
        if posting.get("isListed") is False:
            return {}

        location = posting.get("location") or "Unspecified"
        if isinstance(location, dict):
            location = location.get("name") or str(location)
        workplace = posting.get("workplaceType") or posting.get("locationType") or ""
        is_remote = bool(
            re.search(r"\bremote\b", str(location), re.I)
            or str(workplace).lower() == "remote"
        )

        return build_canonical_job(
            provider="ashby",
            source=slug,
            title=posting.get("title") or "",
            company=posting.get("companyName") or slug.replace("-", " ").title(),
            location=str(location),
            job_url=posting.get("jobUrl") or posting.get("applyUrl") or "",
            description=posting.get("descriptionPlain") or posting.get("description") or "",
            salary=self._format_salary(posting.get("compensation")),
            is_remote=is_remote,
            date_posted=str(posting.get("publishedAt") or posting.get("updatedAt") or ""),
            search_term=search_term,
            search_location=search_location,
        )

    def fetch_jobs(
        self,
        search_terms: list[str],
        locations: list[str],
        remote_filters: list[str],
        country: str = "India",
    ) -> list[dict]:
        companies = self._load_companies()
        all_jobs: list[dict] = []
        primary_term = search_terms[0] if search_terms else ""
        primary_loc = locations[0] if locations else ""

        for slug in companies:
            postings = self._fetch_company(slug)
            for posting in postings:
                job = self._normalize_posting(posting, slug, primary_term, primary_loc)
                if job and job.get("title"):
                    all_jobs.append(job)

        return filter_jobs(all_jobs, search_terms, locations, remote_filters, country)
