"""Skill match dimension."""

from __future__ import annotations

from text_utils import normalize_text, tokenize


def _all_skills(intelligence: dict) -> list[str]:
    skills_map = intelligence.get("skillsMap") or {}
    bank = intelligence.get("atsKeywordBank") or {}
    skills: list[str] = []
    for key in skills_map:
        if isinstance(skills_map[key], list):
            skills.extend(skills_map[key])
    skills.extend(bank.get("highPriority") or [])
    skills.extend(bank.get("mediumPriority") or [])
    seen = set()
    out = []
    for s in skills:
        sl = (s or "").strip()
        if sl and sl.lower() not in seen:
            seen.add(sl.lower())
            out.append(sl)
    return out


def _extract_jd_skill_tokens(jd_text: str, candidate_skills: list[str]) -> list[str]:
    """Return the subset of candidate skills that appear in the JD text."""
    matched = []
    seen = set()
    for skill in candidate_skills:
        sk = skill.lower().strip()
        sk_nodot = sk.replace(".", "")
        if not sk:
            continue
        if (sk in jd_text or sk_nodot in jd_text) and sk not in seen:
            seen.add(sk)
            matched.append(skill)
    return matched


def _extract_jd_required_skills(jd_text: str) -> list[str]:
    """Heuristically pull skill tokens from the JD itself.

    We look for lines/phrases after common requirement markers.  This gives us
    the set of skills the *job* actually asks for, so we can measure what
    fraction the candidate covers.
    """
    import re
    # Collect short technical tokens: words of 2-20 chars, possibly with +/./#
    pattern = re.compile(
        r"\b(?:java(?:script)?|typescript|python|golang?|rust|ruby|php|swift|kotlin"
        r"|react(?:\.js)?|vue(?:\.js)?|angular|next\.js|node(?:\.js)?|express"
        r"|django|flask|fastapi|spring|rails|laravel"
        r"|postgres(?:ql)?|mysql|mongodb|redis|elasticsearch|dynamo\s*db|sqlite"
        r"|aws|gcp|azure|docker|kubernetes|k8s|terraform|ci[/\-]?cd|jenkins"
        r"|git(?:hub)?|linux|nginx|graphql|rest\s*api|grpc|kafka|rabbitmq"
        r"|machine\s*learning|deep\s*learning|tensorflow|pytorch|nlp|llm"
        r"|html|css|sass|tailwind|typescript|sql|nosql|microservices"
        r"|react\s*native|flutter|android|ios|solidity|web3)\b",
        re.I,
    )
    found = []
    seen = set()
    for m in pattern.finditer(jd_text):
        tok = m.group(0).lower().replace(" ", "")
        if tok not in seen:
            seen.add(tok)
            found.append(m.group(0))
    return found


def score_skill_match(job: dict, intelligence: dict) -> tuple[int, list[str], list[str], list[str]]:
    candidate_skills = _all_skills(intelligence)
    jd = normalize_text(f"{job.get('title', '')} {job.get('description', '')}")

    if not candidate_skills:
        return 50, ["No skills in intelligence"], [], []

    # Strategy: measure coverage from the JD's perspective.
    # 1. Find skills the JD explicitly mentions.
    jd_required = _extract_jd_required_skills(jd)

    if jd_required:
        # How many of the JD's required skills does the candidate have?
        candidate_lower = {s.lower().strip().replace(".", ""): s for s in candidate_skills}
        covered = []
        uncovered = []
        for sk in jd_required:
            key = sk.lower().strip().replace(".", "")
            if key in candidate_lower:
                covered.append(candidate_lower[key])
            else:
                uncovered.append(sk)
        coverage_ratio = len(covered) / len(jd_required)
        bonus = 10 if len(covered) >= 4 else 0
        score = int(min(100, max(20, coverage_ratio * 100 + bonus)))
        reasons = [f"Covers {len(covered)}/{len(jd_required)} JD-required skills"]
        matched = covered[:20]
        missing = uncovered[:15]
    else:
        # Fallback: check which candidate skills appear anywhere in the JD
        matched = _extract_jd_skill_tokens(jd, candidate_skills)
        missing = [s for s in candidate_skills if s not in matched][:15]
        # Weight by matched count; cap generously since JD may not list skills explicitly
        score = int(min(100, max(30, len(matched) * 6 + (10 if len(matched) >= 5 else 0))))
        reasons = [f"Found {len(matched)} candidate skills mentioned in JD"]

    return score, reasons, matched, missing
