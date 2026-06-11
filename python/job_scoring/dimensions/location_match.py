"""Location and remote match dimension."""

from __future__ import annotations

from text_utils import normalize_text


def score_location_match(job: dict, intelligence: dict) -> tuple[int, list[str]]:
    prefs = intelligence.get("jobFitPreferences") or {}
    preferred = [normalize_text(l) for l in prefs.get("preferredLocations") or []]
    remote_pref = normalize_text(prefs.get("remotePreference") or "")

    job_loc = normalize_text(job.get("location") or "")
    is_remote = bool(job.get("isRemote"))

    if is_remote and "remote" in remote_pref:
        return 95, ["Remote job matches preference"]
    if is_remote:
        return 80, ["Remote job"]

    for loc in preferred:
        if loc and loc in job_loc:
            return 90, [f"Location match: {loc}"]

    if "remote" in preferred and is_remote:
        return 90, ["Remote in preferred locations"]

    if preferred and job_loc:
        return 45, ["Location not in preferred list"]
    return 60, ["Location neutral"]
