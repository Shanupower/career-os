"""Score labels and recommendations."""

from __future__ import annotations


def match_label(score: int) -> str:
    if score >= 85:
        return "Excellent"
    if score >= 70:
        return "Strong"
    if score >= 55:
        return "Good"
    if score >= 40:
        return "Weak"
    return "Reject"


def apply_recommendation(score: int, red_flags: list[str]) -> str:
    if any("Avoid role" in f or "Avoided industry" in f for f in red_flags):
        return "Skip"
    if score >= 70:
        return "Apply"
    if score >= 40:
        return "Maybe"
    return "Skip"


def priority(score: int, apply_rec: str, red_flags: list[str]) -> str:
    if apply_rec == "Skip" or score < 40:
        return "Reject"
    if any("Avoid role" in f for f in red_flags):
        return "Reject"
    if score >= 85:
        return "P1"
    if score >= 70:
        return "P1"
    if score >= 55:
        return "P2"
    return "P3"
