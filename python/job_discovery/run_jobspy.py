#!/usr/bin/env python3
"""Run JobSpy discovery from candidate-intelligence.json."""

from __future__ import annotations

import argparse
import json
import logging
import sys
import uuid
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from dedupe_jobs import dedupe_jobs  # noqa: E402
from export_jobs import (  # noqa: E402
    export_discovered_json,
    export_normalized_json,
    export_raw_csv,
)
from jobspy_adapter import fetch_jobs  # noqa: E402
from normalize_jobs import normalize_jobs  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)

INTELLIGENCE_PATH = ROOT / "data" / "intelligence" / "candidate-intelligence.json"


def load_intelligence(path: Path) -> dict:
    if not path.exists():
        raise FileNotFoundError(
            f"Intelligence file not found: {path}\n"
            "Export candidate-intelligence.json from Module 2 and save it there."
        )
    return json.loads(path.read_text(encoding="utf-8"))


def should_use_remote(remote_filters: list[str], location: str) -> bool:
    loc = (location or "").lower()
    if loc == "remote":
        return True
    filters = [f.lower() for f in remote_filters]
    return "remote" in filters and loc == "remote"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run JobSpy job discovery from candidate intelligence.")
    parser.add_argument(
        "--country",
        help="Indeed/Glassdoor country (e.g. India, USA). Overrides searchStrategy.country.",
    )
    parser.add_argument(
        "--locations",
        nargs="+",
        help="Location filters (space-separated). Overrides searchStrategy.locationFilters.",
    )
    parser.add_argument(
        "--intelligence",
        type=Path,
        default=INTELLIGENCE_PATH,
        help="Path to candidate-intelligence.json",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    intelligence = load_intelligence(args.intelligence)
    strategy = intelligence.get("searchStrategy") or {}
    job_fit = intelligence.get("jobFitPreferences") or {}

    search_terms = strategy.get("jobSpySearchTerms") or []
    locations = args.locations or strategy.get("locationFilters") or ["Remote"]
    remote_filters = strategy.get("remoteFilters") or []
    country = (
        args.country
        or strategy.get("country")
        or job_fit.get("country")
        or "USA"
    )

    if not search_terms:
        logger.error("No jobSpySearchTerms found in intelligence file.")
        return 1

    all_frames: list[pd.DataFrame] = []
    all_normalized: list[dict] = []

    for term in search_terms:
        for location in locations:
            remote = should_use_remote(remote_filters, location)
            logger.info(
                "Fetching: %r @ %r (remote=%s, country=%s)",
                term, location, remote, country,
            )
            try:
                df = fetch_jobs(term, location, remote=remote, country=country)
            except Exception as exc:
                logger.warning("Fetch failed for %r @ %r: %s", term, location, exc)
                continue

            if df is not None and not df.empty:
                all_frames.append(df)
                all_normalized.extend(normalize_jobs(df, term, location))

    raw_df = pd.concat(all_frames, ignore_index=True) if all_frames else pd.DataFrame()
    raw_count = len(raw_df)

    deduped = dedupe_jobs(all_normalized)
    provider_counts = {"jobspy": len(all_normalized)}

    export_raw_csv(raw_df, ROOT)
    export_normalized_json(all_normalized, ROOT)
    discovered_path = export_discovered_json(
        deduped,
        ROOT,
        search_terms=search_terms,
        locations=locations,
        remote_filters=remote_filters,
        raw_count=raw_count,
        country=country,
        source_run_id=uuid.uuid4().hex[:12],
        providers=["jobspy"],
        provider_counts=provider_counts,
    )

    print("")
    print("===================================")
    print("JOB DISCOVERY SUMMARY")
    print("===================================")
    print("")
    print("Search Terms:", ", ".join(search_terms))
    print("Locations:", ", ".join(locations))
    print("Country:", country)
    print("Remote Filters:", ", ".join(remote_filters))
    print("")
    print(f"Raw Jobs: {raw_count}")
    print(f"Deduped Jobs: {len(deduped)}")
    print("")
    print(f"Output: {discovered_path.relative_to(ROOT)}")
    print("===================================")
    print("")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
