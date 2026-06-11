"""Role match dimension."""

from __future__ import annotations

from text_utils import normalize_text, tokenize


def score_role_match(job: dict, intelligence: dict) -> tuple[int, list[str]]:
    role_strategy = intelligence.get("roleStrategy") or {}
    primary = [r.lower() for r in role_strategy.get("primaryTargetRoles") or []]
    secondary = [r.lower() for r in role_strategy.get("secondaryTargetRoles") or []]
    avoid = [r.lower() for r in role_strategy.get("avoidRoles") or []]
    variants = [r.lower() for r in role_strategy.get("searchRoleVariants") or []]

    title = normalize_text(job.get("title") or "")
    title_tokens = tokenize(title)

    reasons: list[str] = []
    for a in avoid:
        if a and a in title:
            reasons.append(f"Avoid role match: {a}")
            return 15, reasons

    for r in primary:
        rt = tokenize(r)
        if rt and rt.issubset(title_tokens) or r in title:
            reasons.append(f"Primary role match: {r}")
            return 95, reasons

    for r in secondary + variants:
        rt = tokenize(r)
        overlap = len(rt & title_tokens) / max(len(rt), 1)
        if overlap >= 0.5 or r in title:
            reasons.append(f"Related role match: {r}")
            return 75, reasons

    if title_tokens:
        return 45, ["Title does not match target roles closely"]
    return 30, ["Missing job title"]
