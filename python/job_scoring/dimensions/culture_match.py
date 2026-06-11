"""Culture and work-style match dimension."""

from __future__ import annotations

from text_utils import normalize_text


def score_culture_match(job: dict, intelligence: dict) -> tuple[int, list[str]]:
    prefs = intelligence.get("jobFitPreferences") or {}
    culture = [c.lower() for c in prefs.get("culturePreference") or []]
    company_types = [c.lower() for c in prefs.get("preferredCompanyTypes") or []]
    work_avoid = [w.lower() for w in prefs.get("workToAvoid") or []]

    haystack = normalize_text(job.get("description") or "")

    for w in work_avoid:
        if w and w in haystack:
            return 25, [f"Work-to-avoid signal: {w}"]

    hits = [c for c in culture if c and c in haystack]
    type_hits = [t for t in company_types if t and t in haystack]

    if hits or type_hits:
        parts = []
        if hits:
            parts.append(f"Culture: {', '.join(hits[:2])}")
        if type_hits:
            parts.append(f"Company type: {', '.join(type_hits[:2])}")
        return min(92, 65 + len(hits) * 10), parts

    return 58, ["No strong culture signals in posting"]
