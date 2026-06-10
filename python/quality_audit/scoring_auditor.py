"""Deterministic job score accuracy audit."""

from __future__ import annotations

from audit_utils import confidence_label, normalize_text, token_set


def audit_score_accuracy(job: dict, intelligence: dict) -> dict:
    issues: list[str] = []
    score = job.get("matchScore") or 0
    missing = job.get("missingSkills") or []
    matched = job.get("matchedSkills") or []
    red_flags = job.get("redFlags") or []
    recommendation = job.get("applyRecommendation") or ""
    role_match = job.get("roleMatch") or 0

    role_strategy = intelligence.get("roleStrategy") or {}
    target_roles = role_strategy.get("primaryTargetRoles") or []
    title = normalize_text(job.get("title", ""))

    # Title vs role strategy
    role_aligned = False
    for role in target_roles:
        rt = token_set(role)
        if rt & token_set(title):
            role_aligned = True
            break
    if "developer" in title or "engineer" in title:
        role_aligned = True

    missing_ratio = len(missing) / max(len(matched) + len(missing), 1)

    if score >= 70 and missing_ratio > 0.5:
        issues.append("high_score_with_many_missing_skills")
    if score >= 65 and len(missing) >= 10:
        issues.append("high_score_with_many_missing_skills")

    if score < 45 and role_aligned and len(matched) >= 8:
        issues.append("low_score_despite_strong_role_skill_match")

    if recommendation == "Apply" and red_flags:
        severe = [f for f in red_flags if "severe" in f.lower() or "visa" in f.lower()]
        if severe or len(red_flags) >= 2:
            issues.append("apply_recommendation_with_severe_red_flags")

    if recommendation in ("Reject", "Skip") and role_match >= 85 and len(matched) >= 10:
        issues.append("reject_with_strong_role_match")

    if role_match >= 90 and score < 55:
        issues.append("score_role_mismatch")

    confidence_score = 100
    confidence_score -= len(issues) * 20
    confidence_score = max(0, min(100, confidence_score))

    return {
        "jobId": job.get("jobId"),
        "matchScore": score,
        "applyRecommendation": recommendation,
        "scoreConfidence": confidence_label(confidence_score),
        "scoreAuditIssues": issues,
        "scoreConfidenceScore": confidence_score,
    }
