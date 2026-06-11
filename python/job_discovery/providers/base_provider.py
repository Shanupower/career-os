"""Base provider interface and shared helpers."""

from __future__ import annotations

import re
from abc import ABC, abstractmethod
from datetime import datetime, timezone

from normalize_jobs import _make_job_id


class JobProvider(ABC):
    provider_name = "base"

    @abstractmethod
    def fetch_jobs(
        self,
        search_terms: list[str],
        locations: list[str],
        remote_filters: list[str],
        country: str = "India",
    ) -> list[dict]:
        raise NotImplementedError


def build_canonical_job(
    *,
    provider: str,
    source: str,
    title: str,
    company: str,
    location: str,
    job_url: str = "",
    description: str = "",
    salary: str = "",
    employment_type: str = "",
    is_remote: bool = False,
    date_posted: str = "",
    search_term: str = "",
    search_location: str = "",
    scraped_at: str | None = None,
    site: str = "",
) -> dict:
    scraped = scraped_at or datetime.now(timezone.utc).isoformat()
    site_val = site or source
    return {
        "jobId": _make_job_id(job_url, title, company, location),
        "provider": provider,
        "source": source,
        "title": title,
        "company": company,
        "location": location,
        "site": site_val,
        "jobUrl": job_url,
        "description": description,
        "datePosted": date_posted,
        "salary": salary,
        "employmentType": employment_type,
        "isRemote": is_remote,
        "searchTerm": search_term,
        "searchLocation": search_location,
        "scrapedAt": scraped,
        "status": "new",
    }


def _normalize_terms(terms: list[str]) -> list[str]:
    return [t.strip().lower() for t in terms if t and t.strip()]


def _normalize_locations(locations: list[str]) -> list[str]:
    return [loc.strip().lower() for loc in locations if loc and loc.strip()]


def matches_search_terms(job: dict, search_terms: list[str]) -> bool:
    terms = _normalize_terms(search_terms)
    if not terms:
        return True
    haystack = f"{job.get('title', '')} {job.get('description', '')}".lower()
    return any(term in haystack for term in terms)


def matches_location_filters(job: dict, locations: list[str], remote_filters: list[str]) -> bool:
    locs = _normalize_locations(locations)
    if not locs:
        return True

    job_loc = (job.get("location") or "").lower()
    is_remote = bool(job.get("isRemote"))
    remote_in_filters = any(f.lower() == "remote" for f in remote_filters)
    wants_remote = "remote" in locs or remote_in_filters

    if wants_remote and is_remote:
        return True

    non_remote_locs = [loc for loc in locs if loc != "remote"]
    if not non_remote_locs:
        return wants_remote and is_remote

    return any(loc in job_loc or job_loc in loc for loc in non_remote_locs)


def matches_country(job: dict, country: str) -> bool:
    if not country:
        return True
    country_lower = country.strip().lower()
    job_loc = (job.get("location") or "").lower()
    aliases = {
        "india": ["india", "in", "bangalore", "bengaluru", "hyderabad", "mumbai", "pune", "delhi", "ncr", "gurgaon", "gurugram", "chennai", "kolkata"],
        "usa": ["usa", "us", "united states", "san francisco", "new york", "seattle", "austin"],
    }
    tokens = aliases.get(country_lower, [country_lower])
    if any(token in job_loc for token in tokens):
        return True
    if job.get("isRemote"):
        return True
    return not job_loc


def filter_jobs(
    jobs: list[dict],
    search_terms: list[str],
    locations: list[str],
    remote_filters: list[str],
    country: str = "India",
) -> list[dict]:
    return [
        job
        for job in jobs
        if matches_search_terms(job, search_terms)
        and matches_location_filters(job, locations, remote_filters)
        and matches_country(job, country)
    ]
