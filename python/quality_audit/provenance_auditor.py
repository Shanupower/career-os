"""Truth/provenance safety audit for generated assets."""

from __future__ import annotations

import re
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
RESUME_GEN = SCRIPT_DIR.parent / "resume_generator"
if str(RESUME_GEN) not in sys.path:
    sys.path.insert(0, str(RESUME_GEN))

from provenance_checker import build_canonical_facts, check_provenance  # noqa: E402

COMPANY_RE = re.compile(
    r"(?:at|@)\s+([A-Z][A-Za-z0-9&.\-\s]{2,40})(?:\s*[,–-]|\s*\n)",
)
DEGREE_RE = re.compile(
    r"\b(B\.?S\.?|B\.?Tech|M\.?S\.?|M\.?Tech|MBA|Ph\.?D|Bachelor|Master|Doctorate)"
    r"[^.\n]{0,80}",
    re.I,
)
CERT_RE = re.compile(
    r"\b(certified|certification|certificate)\b[^.\n]{0,80}",
    re.I,
)
METRIC_RE = re.compile(
    r"\b\d+(?:\.\d+)?%|\b₹\s*[\d,]+|\b\d+\+?\s*(?:years?|users|customers|cr|lakh|crore)\b",
    re.I,
)


def _known_companies(profile: dict, intelligence: dict) -> set[str]:
    known: set[str] = set()
    raw = (profile.get("resume") or {}).get("rawText") or ""
    for line in raw.splitlines():
        if "—" in line or " - " in line:
            parts = re.split(r"[—\-]", line, maxsplit=1)
            if parts:
                known.add(parts[0].strip().lower())
    for item in (intelligence.get("experienceMap") or {}).get("domainsWorkedIn") or []:
        known.add(str(item).lower())
    return known


def audit_provenance(
    content: str,
    profile: dict,
    intelligence: dict,
) -> dict:
    facts = build_canonical_facts(profile, intelligence)
    passed, metric_issues = check_provenance(content, facts)
    issues: list[str] = list(metric_issues)
    severe: list[str] = []

    known_companies = _known_companies(profile, intelligence)
    for match in COMPANY_RE.finditer(content):
        company = match.group(1).strip()
        cl = company.lower()
        if cl and not any(cl in k or k in cl for k in known_companies):
            if len(company) > 3 and company not in ("HR", "IT"):
                issues.append(f"Unknown company reference: {company}")
                severe.append(f"Unknown company: {company}")

    for match in DEGREE_RE.finditer(content):
        snippet = match.group(0).lower()
        if not any(snippet in f or f in snippet for f in facts):
            issues.append(f"Unverified degree claim: {match.group(0)[:60]}")
            severe.append(f"Unverified degree: {match.group(0)[:40]}")

    for match in CERT_RE.finditer(content):
        snippet = match.group(0).lower()
        if not any(snippet in f or f in snippet for f in facts):
            issues.append(f"Unverified certification: {match.group(0)[:60]}")

    for match in METRIC_RE.finditer(content):
        snippet = match.group(0).lower()
        if not any(snippet in f or f in snippet for f in facts):
            if snippet not in [i.lower() for i in metric_issues]:
                issues.append(f"Unsupported metric: {match.group(0)}")

    safe = len(severe) == 0 and passed
    return {
        "provenanceSafe": safe,
        "provenanceStatus": "approved" if safe else "needs_review",
        "provenanceIssues": issues[:20],
        "severeProvenanceIssues": severe[:10],
        "severeCount": len(severe),
    }
