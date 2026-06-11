"""Normalize JobSpy DataFrame rows to canonical job schema."""

from __future__ import annotations

import hashlib
import re
from datetime import datetime, timezone

import pandas as pd

JOB_FIELDS = [
    "jobId",
    "provider",
    "source",
    "title",
    "company",
    "location",
    "site",
    "jobUrl",
    "description",
    "datePosted",
    "salary",
    "employmentType",
    "isRemote",
    "searchTerm",
    "searchLocation",
    "scrapedAt",
    "status",
]


def _safe_str(value) -> str:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return ""
    return str(value).strip()


def _format_salary(row: pd.Series) -> str:
    min_amt = row.get("min_amount")
    max_amt = row.get("max_amount")
    interval = _safe_str(row.get("interval"))
    currency = _safe_str(row.get("currency")) or "USD"

    parts = []
    if min_amt is not None and not pd.isna(min_amt):
        parts.append(str(int(min_amt)) if float(min_amt).is_integer() else str(min_amt))
    if max_amt is not None and not pd.isna(max_amt):
        if parts:
            parts.append(f"- {int(max_amt) if float(max_amt).is_integer() else max_amt}")
        else:
            parts.append(str(max_amt))

    if not parts:
        return ""

    salary = " ".join(parts)
    if interval:
        salary += f" {interval}"
    if currency and currency != "USD":
        salary += f" {currency}"
    return salary.strip()


def _build_location(row: pd.Series) -> str:
    loc = _safe_str(row.get("location"))
    if loc:
        return loc
    city = _safe_str(row.get("city"))
    state = _safe_str(row.get("state"))
    country = _safe_str(row.get("country"))
    bits = [b for b in [city, state, country] if b]
    return ", ".join(bits)


def _make_job_id(job_url: str, title: str, company: str, location: str) -> str:
    if job_url:
        return hashlib.sha256(job_url.encode("utf-8")).hexdigest()[:16]
    key = f"{title}|{company}|{location}".lower()
    return hashlib.sha256(key.encode("utf-8")).hexdigest()[:16]


def normalize_row(row: pd.Series, search_term: str, search_location: str, scraped_at: str) -> dict:
    title = _safe_str(row.get("title"))
    company = _safe_str(row.get("company"))
    location = _build_location(row)
    job_url = _safe_str(row.get("job_url") or row.get("jobUrl"))

    is_remote_val = row.get("is_remote")
    is_remote = bool(is_remote_val) if is_remote_val is not None and not pd.isna(is_remote_val) else False
    if re.search(r"\bremote\b", location, re.I):
        is_remote = True

    date_posted = row.get("date_posted")
    if date_posted is not None and not pd.isna(date_posted):
        if hasattr(date_posted, "isoformat"):
            date_posted = date_posted.isoformat()
        else:
            date_posted = _safe_str(date_posted)
    else:
        date_posted = ""

    site = _safe_str(row.get("site"))

    return {
        "jobId": _make_job_id(job_url, title, company, location),
        "provider": "jobspy",
        "source": site,
        "title": title,
        "company": company,
        "location": location,
        "site": site,
        "jobUrl": job_url,
        "description": _safe_str(row.get("description")),
        "datePosted": date_posted,
        "salary": _format_salary(row),
        "employmentType": _safe_str(row.get("job_type")),
        "isRemote": is_remote,
        "searchTerm": search_term,
        "searchLocation": search_location,
        "scrapedAt": scraped_at,
        "status": "new",
    }


def normalize_jobs(df: pd.DataFrame, search_term: str, search_location: str) -> list[dict]:
    if df is None or df.empty:
        return []

    scraped_at = datetime.now(timezone.utc).isoformat()
    jobs = []
    for _, row in df.iterrows():
        job = normalize_row(row, search_term, search_location, scraped_at)
        if job["title"]:
            jobs.append(job)
    return jobs
