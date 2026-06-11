"""Red flag detection for job scoring."""

from __future__ import annotations

from text_utils import normalize_text


def detect_red_flags(job: dict, intelligence: dict) -> list[str]:
    flags: list[str] = []
    role_strategy = intelligence.get("roleStrategy") or {}
    prefs = intelligence.get("jobFitPreferences") or {}

    title = normalize_text(job.get("title") or "")
    for role in role_strategy.get("avoidRoles") or []:
        if role and normalize_text(role) in title:
            flags.append(f"Avoid role: {role}")

    haystack = normalize_text(f"{job.get('description', '')} {job.get('company', '')}")
    for ind in prefs.get("avoidedIndustries") or []:
        if ind and normalize_text(ind) in haystack:
            flags.append(f"Avoided industry: {ind}")

    if not job.get("jobUrl"):
        flags.append("Missing job URL")

    desc = normalize_text(job.get("description") or "")
    if len(desc) < 80:
        flags.append("Thin job description")

    return flags
