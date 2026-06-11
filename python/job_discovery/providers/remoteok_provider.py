"""RemoteOK public JSON API provider."""

from __future__ import annotations

import logging

import requests

from providers.base_provider import JobProvider, build_canonical_job, filter_jobs

logger = logging.getLogger(__name__)

API_URL = "https://remoteok.com/api"


class RemoteOKProvider(JobProvider):
    provider_name = "remoteok"

    def _fetch_all(self) -> list[dict]:
        try:
            resp = requests.get(
                API_URL,
                headers={"User-Agent": "CareerOS/1.0"},
                timeout=30,
            )
            resp.raise_for_status()
            data = resp.json()
            if not isinstance(data, list):
                return []
            return [item for item in data if isinstance(item, dict) and item.get("position")]
        except Exception as exc:
            logger.warning("RemoteOK fetch failed: %s", exc)
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
            title = posting.get("position") or posting.get("title") or ""
            company = posting.get("company") or "Unknown"
            location = posting.get("location") or "Remote"
            url = posting.get("url") or posting.get("apply_url") or ""
            description = posting.get("description") or ""
            tags = posting.get("tags") or []
            if tags and not description:
                description = "Tags: " + ", ".join(str(t) for t in tags)

            job = build_canonical_job(
                provider="remoteok",
                source="remoteok",
                title=title,
                company=company,
                location=location,
                job_url=url,
                description=description,
                salary=posting.get("salary") or "",
                is_remote=True,
                date_posted=str(posting.get("date") or posting.get("epoch") or ""),
                search_term=primary_term,
                search_location=primary_loc,
                site="remoteok",
            )
            if job["title"]:
                all_jobs.append(job)

        return filter_jobs(all_jobs, search_terms, locations, remote_filters, country)
