"""Experience / seniority match dimension."""

from __future__ import annotations

import re

from text_utils import normalize_text

SENIORITY_LEVELS = {
    "intern": 0,
    "junior": 1,
    "entry": 1,
    "associate": 2,
    "mid": 2,
    "software engineer": 2,
    "senior": 3,
    "staff": 4,
    "principal": 5,
    "lead": 4,
    "manager": 4,
    "head": 5,
    "director": 5,
}


def _infer_level(text: str) -> int:
    t = normalize_text(text)
    best = 2
    for key, level in SENIORITY_LEVELS.items():
        if re.search(rf"\b{re.escape(key)}\b", t):
            best = max(best, level)
    return best


def score_experience_match(job: dict, intelligence: dict) -> tuple[int, list[str]]:
    exp_map = intelligence.get("experienceMap") or {}
    summary = intelligence.get("candidateSummary") or {}
    years_raw = exp_map.get("yearsOfExperience") or ""
    try:
        candidate_years = int(re.search(r"\d+", str(years_raw)).group())
    except (AttributeError, ValueError):
        candidate_years = 5

    candidate_level = _infer_level(summary.get("seniorityLevel") or "")
    if candidate_level <= 2 and candidate_years >= 5:
        candidate_level = 3
    if candidate_years >= 8:
        candidate_level = max(candidate_level, 3)

    job_level = _infer_level(job.get("title") or "")
    job_level = max(job_level, _infer_level(job.get("description") or "") // 2)

    gap = abs(job_level - candidate_level)
    if gap == 0:
        return 90, ["Seniority level aligns"]
    if gap == 1:
        return 72, ["Close seniority match"]
    if gap == 2:
        return 50, ["Moderate seniority gap"]
    return 30, [f"Seniority gap: job level {job_level} vs candidate ~{candidate_level}"]
