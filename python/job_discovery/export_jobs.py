"""Export raw, normalized, and discovered job files."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd


def _jobs_dir(root: Path) -> Path:
    path = root / "data" / "jobs"
    path.mkdir(parents=True, exist_ok=True)
    return path


def export_raw_csv(df: pd.DataFrame, root: Path) -> Path:
    out = _jobs_dir(root) / "raw_jobs.csv"
    if df is None or df.empty:
        out.write_text("", encoding="utf-8")
    else:
        df.to_csv(out, index=False)
    return out


def export_normalized_json(jobs: list[dict], root: Path) -> Path:
    out = _jobs_dir(root) / "normalized_jobs.json"
    out.write_text(json.dumps(jobs, indent=2), encoding="utf-8")
    return out


def export_discovered_json(
    jobs: list[dict],
    root: Path,
    *,
    search_terms: list[str],
    locations: list[str],
    remote_filters: list[str],
    raw_count: int,
    country: str = "",
    source_run_id: str = "",
    providers: list[str] | None = None,
    provider_counts: dict[str, int] | None = None,
) -> Path:
    deduped_count = len(jobs)
    duplicate_count = max(0, raw_count - deduped_count)
    payload = {
        "meta": {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "sourceRunId": source_run_id,
            "searchTerms": search_terms,
            "locations": locations,
            "remoteFilters": remote_filters,
            "country": country,
            "providers": providers or [],
            "providerCounts": provider_counts or {},
            "rawCount": raw_count,
            "dedupedCount": deduped_count,
            "duplicateCount": duplicate_count,
        },
        "jobs": jobs,
    }
    out = _jobs_dir(root) / "discovered_jobs.json"
    out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return out
