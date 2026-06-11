"""Verify resume content traces to candidate profile/intelligence only."""

from __future__ import annotations

import re

METRIC_RE = re.compile(r"\b\d+%|\b\d+\s*(?:users|customers|ms|x|k\b|m\b)", re.I)


def build_canonical_facts(profile: dict, intelligence: dict) -> set[str]:
    facts: set[str] = set()
    basic = profile.get("basicProfile") or {}
    for v in basic.values():
        if isinstance(v, str) and v.strip():
            facts.add(v.strip().lower())

    resume = profile.get("resume") or {}
    parsed = resume.get("parsedData") or {}
    for key in ("skills", "projects", "education", "workExperience", "certifications"):
        for item in parsed.get(key) or []:
            if isinstance(item, str) and item.strip():
                facts.add(item.strip().lower())

    raw = resume.get("rawText") or ""
    for line in raw.splitlines():
        line = line.strip()
        if len(line) > 4:
            facts.add(line.lower())

    exp_map = intelligence.get("experienceMap") or {}
    for key in ("projectHighlights", "ownershipExamples", "leadershipExamples", "businessImpactExamples"):
        for item in exp_map.get(key) or []:
            if isinstance(item, str):
                facts.add(item.lower())

    skills_map = intelligence.get("skillsMap") or {}
    for items in skills_map.values():
        if isinstance(items, list):
            for s in items:
                if s:
                    facts.add(str(s).lower())

    return facts


def check_provenance(content: str, facts: set[str]) -> tuple[bool, list[str]]:
    """Return (passed, issues). Flags metrics not found in source facts."""
    issues: list[str] = []
    for match in METRIC_RE.finditer(content):
        snippet = match.group(0).lower()
        if not any(snippet in f or f in snippet for f in facts):
            issues.append(f"Unverified metric or number: {match.group(0)}")

    return len(issues) == 0, issues
