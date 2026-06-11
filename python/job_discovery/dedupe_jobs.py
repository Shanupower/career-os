"""Deduplicate normalized jobs by URL or title+company+location."""

from __future__ import annotations


def _dedupe_key(job: dict) -> str:
    url = (job.get("jobUrl") or "").strip().lower()
    if url:
        return f"url:{url}"
    title = (job.get("title") or "").strip().lower()
    company = (job.get("company") or "").strip().lower()
    location = (job.get("location") or "").strip().lower()
    return f"tcl:{title}|{company}|{location}"


def _sort_key(job: dict) -> str:
    return f"{job.get('scrapedAt', '')}|{job.get('datePosted', '')}"


def dedupe_jobs(jobs: list[dict]) -> list[dict]:
    best: dict[str, dict] = {}

    for job in jobs:
        key = _dedupe_key(job)
        existing = best.get(key)
        if existing is None or _sort_key(job) > _sort_key(existing):
            best[key] = job

    return list(best.values())
