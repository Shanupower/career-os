"""Job scoring orchestrator."""

from __future__ import annotations

from dimensions.culture_match import score_culture_match
from dimensions.experience_match import score_experience_match
from dimensions.industry_match import score_industry_match
from dimensions.location_match import score_location_match
from dimensions.role_match import score_role_match
from dimensions.skill_match import score_skill_match
from labels import apply_recommendation, match_label, priority
from llm_enhancer import NoOpEnhancer
from red_flags import detect_red_flags

DEFAULT_WEIGHTS = {
    "roleMatch": 25,
    "skillMatch": 25,
    "industryMatch": 15,
    "experienceMatch": 15,
    "locationMatch": 10,
    "cultureMatch": 10,
}


def _weighted_total(dimensions: dict[str, int], weights: dict[str, int]) -> int:
    total_w = sum(weights.values()) or 100
    score = sum(dimensions[k] * weights.get(k, 0) for k in dimensions) / total_w
    return int(round(score))


def score_job(job: dict, intelligence: dict, enhancer=None) -> dict:
    weights = intelligence.get("scoringWeights") or DEFAULT_WEIGHTS
    enhancer = enhancer or NoOpEnhancer()

    role_score, role_reasons = score_role_match(job, intelligence)
    skill_score, skill_reasons, matched, missing = score_skill_match(job, intelligence)
    industry_score, industry_reasons = score_industry_match(job, intelligence)
    exp_score, exp_reasons = score_experience_match(job, intelligence)
    loc_score, loc_reasons = score_location_match(job, intelligence)
    cult_score, cult_reasons = score_culture_match(job, intelligence)

    dimensions = {
        "roleMatch": role_score,
        "skillMatch": skill_score,
        "industryMatch": industry_score,
        "experienceMatch": exp_score,
        "locationMatch": loc_score,
        "cultureMatch": cult_score,
    }

    red_flags = detect_red_flags(job, intelligence)
    match_score = _weighted_total(dimensions, weights)

    if red_flags and match_score > 55:
        match_score = min(match_score, 54)

    breakdown = {
        k: {
            "raw": dimensions[k],
            "weight": weights.get(k, 0),
            "weighted": round(dimensions[k] * weights.get(k, 0) / 100, 2),
        }
        for k in dimensions
    }

    reasons = role_reasons + skill_reasons + industry_reasons + exp_reasons + loc_reasons + cult_reasons
    if red_flags:
        reasons.extend([f"Red flag: {f}" for f in red_flags])

    apply_rec = apply_recommendation(match_score, red_flags)
    result = {
        **job,
        "matchScore": match_score,
        "matchLabel": match_label(match_score),
        "applyRecommendation": apply_rec,
        "priority": priority(match_score, apply_rec, red_flags),
        "roleMatch": role_score,
        "skillMatch": skill_score,
        "industryMatch": industry_score,
        "experienceMatch": exp_score,
        "locationMatch": loc_score,
        "cultureMatch": cult_score,
        "matchedSkills": matched,
        "missingSkills": missing,
        "redFlags": red_flags,
        "reasons": reasons,
        "scoreBreakdown": breakdown,
    }
    return enhancer.enhance(job, result, intelligence)


def score_jobs(jobs: list[dict], intelligence: dict, enhancer=None) -> list[dict]:
    return [score_job(j, intelligence, enhancer) for j in jobs]
