#!/usr/bin/env python3
"""Multi-provider job discovery runner."""

from __future__ import annotations

import argparse
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
from discovery_common import (  # noqa: E402
    INTELLIGENCE_PATH,
    load_intelligence,
    resolve_search_config,
)
from export_jobs import (  # noqa: E402
    export_discovered_json,
    export_normalized_json,
    export_raw_csv,
)
from mock_jobs import generate_mock_jobs  # noqa: E402
from providers.jobspy_provider import JobSpyProvider  # noqa: E402
from providers.provider_registry import PROVIDER_GROUPS, get_provider, resolve_providers  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run multi-provider job discovery.")
    parser.add_argument(
        "--providers",
        default="ats",
        help=(
            "Comma-separated provider names or group: "
            f"{', '.join(PROVIDER_GROUPS)}"
        ),
    )
    parser.add_argument("--country", help="Country filter (default: India).")
    parser.add_argument(
        "--locations",
        nargs="+",
        help="Location filters. Overrides intelligence locationFilters.",
    )
    parser.add_argument(
        "--intelligence",
        type=Path,
        default=INTELLIGENCE_PATH,
        help="Path to candidate-intelligence.json",
    )
    parser.add_argument(
        "--mock",
        action="store_true",
        help="Generate mock jobs without network calls.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    source_run_id = uuid.uuid4().hex[:12]

    if args.mock:
        all_jobs = generate_mock_jobs()
        provider_names = sorted({j["provider"] for j in all_jobs})
        provider_counts = {}
        for name in provider_names:
            provider_counts[name] = sum(1 for j in all_jobs if j["provider"] == name)
        search_terms = ["software engineer"]
        locations = ["Bangalore, India", "Remote"]
        remote_filters = ["remote"]
        country = args.country or "India"
        raw_count = len(all_jobs)
        raw_df = pd.DataFrame()
    else:
        intelligence = load_intelligence(args.intelligence)
        config = resolve_search_config(
            intelligence,
            country=args.country,
            locations=args.locations,
        )
        search_terms = config["search_terms"]
        locations = config["locations"]
        remote_filters = config["remote_filters"]
        country = config["country"]

        if not search_terms:
            logger.error("No jobSpySearchTerms found in intelligence file.")
            return 1

        provider_names = resolve_providers(args.providers)
        if not provider_names:
            logger.error("No valid providers resolved from: %s", args.providers)
            return 1

        all_jobs: list[dict] = []
        provider_counts: dict[str, int] = {}
        raw_df = pd.DataFrame()

        for name in provider_names:
            logger.info("Running provider: %s", name)
            provider = get_provider(name)
            jobs = provider.fetch_jobs(search_terms, locations, remote_filters, country)
            provider_counts[name] = len(jobs)
            all_jobs.extend(jobs)
            logger.info("Provider %s returned %d jobs", name, len(jobs))

            if name == "jobspy" and isinstance(provider, JobSpyProvider):
                raw_df = provider.last_raw_df

        raw_count = len(all_jobs)

    deduped = dedupe_jobs(all_jobs)

    export_raw_csv(raw_df, ROOT)
    export_normalized_json(all_jobs, ROOT)
    discovered_path = export_discovered_json(
        deduped,
        ROOT,
        search_terms=search_terms,
        locations=locations,
        remote_filters=remote_filters,
        raw_count=raw_count,
        country=country,
        source_run_id=source_run_id,
        providers=provider_names,
        provider_counts=provider_counts,
    )

    print("")
    print("===================================")
    print("MULTI-PROVIDER DISCOVERY SUMMARY")
    print("===================================")
    print("")
    print("Providers:", ", ".join(provider_names))
    print("Country:", country)
    print("Search Terms:", ", ".join(search_terms))
    print("Locations:", ", ".join(locations))
    print("Remote Filters:", ", ".join(remote_filters))
    print("")
    for name in provider_names:
        print(f"  {name}: {provider_counts.get(name, 0)} jobs")
    print("")
    print(f"Raw Jobs: {raw_count}")
    print(f"Deduped Jobs: {len(deduped)}")
    print(f"Duplicates Removed: {max(0, raw_count - len(deduped))}")
    print("")
    print(f"Output: {discovered_path.relative_to(ROOT)}")
    print("===================================")
    print("")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
