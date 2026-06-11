"""JobSpy provider — wraps existing jobspy_adapter + normalize_jobs."""

from __future__ import annotations

import logging

import pandas as pd

from jobspy_adapter import fetch_jobs
from normalize_jobs import normalize_jobs
from providers.base_provider import JobProvider

logger = logging.getLogger(__name__)


def _should_use_remote(remote_filters: list[str], location: str) -> bool:
    loc = (location or "").lower()
    if loc == "remote":
        return True
    filters = [f.lower() for f in remote_filters]
    return "remote" in filters and loc == "remote"


class JobSpyProvider(JobProvider):
    provider_name = "jobspy"

    def __init__(self) -> None:
        self._last_raw_df: pd.DataFrame = pd.DataFrame()

    def fetch_jobs(
        self,
        search_terms: list[str],
        locations: list[str],
        remote_filters: list[str],
        country: str = "India",
    ) -> list[dict]:
        all_normalized: list[dict] = []
        frames: list[pd.DataFrame] = []

        for term in search_terms:
            for location in locations:
                remote = _should_use_remote(remote_filters, location)
                logger.info(
                    "JobSpy: fetching %r @ %r (remote=%s, country=%s)",
                    term, location, remote, country,
                )
                try:
                    df = fetch_jobs(term, location, remote=remote, country=country)
                except Exception as exc:
                    logger.warning("JobSpy fetch failed for %r @ %r: %s", term, location, exc)
                    continue

                if df is not None and not df.empty:
                    frames.append(df)
                    all_normalized.extend(normalize_jobs(df, term, location))

        self._last_raw_df = pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()
        return all_normalized

    @property
    def last_raw_df(self) -> pd.DataFrame:
        return self._last_raw_df
