"""Job posting / lead quality audit."""

from __future__ import annotations

import re
from datetime import datetime, timedelta

from audit_utils import (
    SUSPICIOUS_COMPANY,
    is_valid_url,
    job_key,
    normalize_text,
    score_label,
    strip_html,
    token_set,
)

RELIABLE_PROVIDERS = {"greenhouse", "lever", "ashby", "jobspy", "indeed", "linkedin"}
STALE_DAYS = 60


def _title_relevant(title: str, target_roles: list[str]) -> tuple[bool, str | None]:
    title_l = normalize_text(title)
    if not title_l:
        return False, "empty_title"
    for role in target_roles:
        role_l = normalize_text(role)
        if not role_l:
            continue
        title_tokens = token_set(title_l)
        role_tokens = token_set(role_l)
        if role_tokens & title_tokens:
            return True, None
        if "full stack" in title_l and "full-stack" in role_l:
            return True, None
        if "full-stack" in title_l and "full stack" in role_l:
            return True, None
        if "developer" in title_l and "developer" in role_l:
            return True, None
        if "engineer" in title_l and ("developer" in role_l or "engineer" in role_l):
            return True, None
    return False, "unrelated_role"


def _location_aligned(location: str, preferred: list[str]) -> tuple[bool, str | None]:
    if not location:
        return False, "missing_location"
    loc_l = normalize_text(location)
    if any("india" in normalize_text(p) or "in" in normalize_text(p) for p in preferred):
        if "in" in loc_l or "india" in loc_l or "mumbai" in loc_l or "hyderabad" in loc_l:
            return True, None
    for pref in preferred:
        pref_l = normalize_text(pref)
        if pref_l and pref_l in loc_l:
            return True, None
    return False, "wrong_country_location"


def audit_job_lead(
    job: dict,
    intelligence: dict,
    duplicate_keys: set[str],
) -> dict:
    issues: list[str] = []
    checks_passed = 0
    total_checks = 9

    role_strategy = intelligence.get("roleStrategy") or {}
    target_roles = (
        role_strategy.get("primaryTargetRoles")
        or role_strategy.get("searchRoleVariants")
        or []
    )
    preferred_locations = (
        (intelligence.get("jobFitPreferences") or {}).get("preferredLocations")
        or []
    )

    title = job.get("title") or ""
    company = job.get("company") or ""
    location = job.get("location") or ""
    description = strip_html(job.get("description") or "")
    job_url = job.get("jobUrl") or ""
    provider = (job.get("provider") or job.get("site") or "").lower()

    # Title relevance
    rel, rel_issue = _title_relevant(title, target_roles)
    if rel:
        checks_passed += 1
    else:
        issues.append(f"Title may not match target roles: {title}")
        if rel_issue:
            issues.append(rel_issue)

    # Company real-looking
    if company and len(company) >= 2 and not SUSPICIOUS_COMPANY.match(company):
        checks_passed += 1
    else:
        issues.append(f"Suspicious or missing company: {company or '(empty)'}")

    # URL valid
    if is_valid_url(job_url):
        checks_passed += 1
    else:
        issues.append("missing_url" if not job_url else "invalid_job_url")

    # Description usable
    if len(description) >= 200:
        checks_passed += 1
    else:
        issues.append("empty_description" if len(description) < 50 else "short_description")

    # Location aligned
    loc_ok, loc_issue = _location_aligned(location, preferred_locations)
    if loc_ok:
        checks_passed += 1
    elif loc_issue:
        issues.append(loc_issue)

    # Provider reliable
    if any(p in provider for p in RELIABLE_PROVIDERS):
        checks_passed += 1
    else:
        issues.append(f"unreliable_provider: {provider or 'unknown'}")

    # Duplicate likely
    key = job_key(job)
    if key in duplicate_keys:
        issues.append("duplicate_looking_job")
    else:
        checks_passed += 1

    # Stale check
    date_posted = job.get("datePosted") or job.get("scrapedAt") or ""
    stale = False
    if date_posted:
        try:
            dt = datetime.fromisoformat(date_posted.replace("Z", "+00:00")[:19])
            if datetime.now(dt.tzinfo) - dt > timedelta(days=STALE_DAYS):
                stale = True
                issues.append("stale_job_posting")
        except ValueError:
            checks_passed += 1
    else:
        checks_passed += 1
    if not stale and date_posted:
        checks_passed += 1

    # Apply link present
    if is_valid_url(job_url):
        checks_passed += 1
    else:
        issues.append("no_apply_link")

    score = round((checks_passed / total_checks) * 100)
    return {
        "jobId": job.get("jobId"),
        "title": title,
        "company": company,
        "leadQualityScore": score,
        "leadQualityLabel": score_label(score),
        "leadIssues": issues,
    }
