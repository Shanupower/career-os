"""Industry match dimension."""

from __future__ import annotations

from text_utils import normalize_text


def score_industry_match(job: dict, intelligence: dict) -> tuple[int, list[str]]:
    prefs = intelligence.get("jobFitPreferences") or {}
    preferred = [i.lower() for i in prefs.get("preferredIndustries") or []]
    avoided = [i.lower() for i in prefs.get("avoidedIndustries") or []]

    haystack = normalize_text(
        f"{job.get('company', '')} {job.get('description', '')} {job.get('title', '')}"
    )

    for a in avoided:
        if a and a in haystack:
            return 20, [f"Avoided industry signal: {a}"]

    hits = [p for p in preferred if p and p in haystack]
    if hits:
        return min(95, 70 + len(hits) * 8), [f"Preferred industry: {', '.join(hits[:3])}"]

    if preferred:
        return 55, ["No clear industry match in posting"]
    return 60, ["Industry preferences not set"]
