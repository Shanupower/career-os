"""Greenhouse public job board API provider."""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path

import requests

from providers.base_provider import JobProvider, build_canonical_job, filter_jobs
from providers.config_paths import resolve_config

logger = logging.getLogger(__name__)

CONFIG_PATH = resolve_config("greenhouse.json", "greenhouse_boards.json")
API_URL = "https://boards-api.greenhouse.io/v1/boards/{board}/jobs?content=true"


class GreenhouseProvider(JobProvider):
    provider_name = "greenhouse"

    def _load_boards(self) -> list[dict]:
        if not CONFIG_PATH.exists():
            return []
        return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))

    def _fetch_board(self, board: str) -> list[dict]:
        url = API_URL.format(board=board)
        try:
            resp = requests.get(url, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            return data.get("jobs") or []
        except Exception as exc:
            logger.warning("Greenhouse board %s failed: %s", board, exc)
            return []

    def _normalize_posting(
        self,
        posting: dict,
        company: str,
        board: str,
        search_term: str,
        search_location: str,
    ) -> dict:
        location_parts = []
        loc_obj = posting.get("location") or {}
        if isinstance(loc_obj, dict):
            location_parts.append(loc_obj.get("name") or "")
        elif isinstance(loc_obj, str):
            location_parts.append(loc_obj)
        for office in posting.get("offices") or []:
            if isinstance(office, dict) and office.get("name"):
                location_parts.append(office["name"])
        location = ", ".join(p for p in location_parts if p) or "Unspecified"

        is_remote = bool(re.search(r"\bremote\b", location, re.I))
        absolute_url = posting.get("absolute_url") or posting.get("internal_job_id") or ""
        if absolute_url and not str(absolute_url).startswith("http"):
            absolute_url = f"https://boards.greenhouse.io/{board}/jobs/{posting.get('id', '')}"

        updated = posting.get("updated_at") or posting.get("first_published") or ""

        return build_canonical_job(
            provider="greenhouse",
            source=board,
            title=posting.get("title") or "",
            company=company,
            location=location,
            job_url=str(absolute_url) if absolute_url else "",
            description=posting.get("content") or "",
            is_remote=is_remote,
            date_posted=str(updated) if updated else "",
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
        boards = self._load_boards()
        all_jobs: list[dict] = []
        primary_term = search_terms[0] if search_terms else ""
        primary_loc = locations[0] if locations else ""

        for entry in boards:
            company = entry.get("company") or entry.get("board") or ""
            board = entry.get("board") or ""
            if not board:
                continue
            postings = self._fetch_board(board)
            for posting in postings:
                job = self._normalize_posting(posting, company, board, primary_term, primary_loc)
                if job["title"]:
                    all_jobs.append(job)

        return filter_jobs(all_jobs, search_terms, locations, remote_filters, country)
