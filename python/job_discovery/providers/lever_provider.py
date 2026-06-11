"""Lever public postings API provider."""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path

import requests

from providers.base_provider import JobProvider, build_canonical_job, filter_jobs
from providers.config_paths import resolve_config

logger = logging.getLogger(__name__)

CONFIG_PATH = resolve_config("lever.json", "lever_companies.json")
API_URL = "https://api.lever.co/v0/postings/{company}"


class LeverProvider(JobProvider):
    provider_name = "lever"

    def _load_companies(self) -> list[str]:
        if not CONFIG_PATH.exists():
            return []
        data = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
        return [c for c in data if isinstance(c, str) and c.strip()]

    def _fetch_company(self, company: str) -> list[dict]:
        url = API_URL.format(company=company)
        try:
            resp = requests.get(url, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            return data if isinstance(data, list) else []
        except Exception as exc:
            logger.warning("Lever company %s failed: %s", company, exc)
            return []

    def _normalize_posting(
        self,
        posting: dict,
        company: str,
        search_term: str,
        search_location: str,
    ) -> dict:
        categories = posting.get("categories") or {}
        location = categories.get("location") or posting.get("workplaceType") or "Unspecified"
        if isinstance(location, list):
            location = ", ".join(location)

        commitment = categories.get("commitment") or ""
        is_remote = bool(
            re.search(r"\bremote\b", str(location), re.I)
            or str(posting.get("workplaceType", "")).lower() == "remote"
        )

        return build_canonical_job(
            provider="lever",
            source=company,
            title=posting.get("text") or "",
            company=posting.get("company") or company.title(),
            location=str(location),
            job_url=posting.get("hostedUrl") or posting.get("applyUrl") or "",
            description=posting.get("descriptionPlain") or posting.get("description") or "",
            employment_type=str(commitment),
            is_remote=is_remote,
            date_posted=str(posting.get("createdAt") or ""),
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

        for company in companies:
            postings = self._fetch_company(company)
            for posting in postings:
                job = self._normalize_posting(posting, company, primary_term, primary_loc)
                if job["title"]:
                    all_jobs.append(job)

        return filter_jobs(all_jobs, search_terms, locations, remote_filters, country)
