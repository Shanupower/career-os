"""Cover letter quality audit."""

from __future__ import annotations

import re

from audit_utils import read_text_file, resume_dir, token_set
from provenance_auditor import audit_provenance

GENERIC_PHRASES = [
    "to whom it may concern",
    "dear hiring manager",
    "i am a highly motivated",
    "perfect fit for your company",
    "dynamic professional",
    "passionate about opportunities",
]
OVERCONFIDENT = [
    "guarantee",
    "best candidate",
    "uniquely qualified",
    "without doubt",
    "certainly the top",
]


def audit_cover_letter(
    job: dict,
    profile: dict,
    intelligence: dict,
) -> dict:
    job_id = job.get("jobId", "")
    path = resume_dir(job_id) / "cover_letter.md"
    content = read_text_file(path)
    issues: list[str] = []
    suggestions: list[str] = []
    checks = 0
    total = 8

    if not content:
        return {
            "jobId": job_id,
            "coverLetterExists": False,
            "coverLetterScore": 0,
            "coverLetterIssues": ["cover_letter_missing"],
            "coverLetterSuggestions": ["Generate a tailored cover letter"],
            "qualityStatus": "needs_review",
        }

    content_l = content.lower()
    company = (job.get("company") or "").lower()
    title = (job.get("title") or "").lower()
    words = len(content.split())

    # Personalized to company/job
    if company and company[:6] in content_l:
        checks += 1
    else:
        issues.append("not_personalized_to_company")
        suggestions.append(f"Mention {job.get('company')} specifically")

    if title and any(t in content_l for t in title.split() if len(t) > 4):
        checks += 1
    else:
        issues.append("not_personalized_to_role")

    # Not generic
    generic_hits = [p for p in GENERIC_PHRASES if p in content_l]
    if not generic_hits:
        checks += 1
    else:
        issues.append("generic_opening_or_phrasing")

    # Under 300 words
    if words <= 300:
        checks += 1
    else:
        issues.append("over_300_words")
        suggestions.append("Trim cover letter to under 300 words")

    # Clear opening
    if re.search(r"^(dear|hello|hi)\b", content_l.strip(), re.M) or "writing to express" in content_l:
        checks += 1
    else:
        issues.append("unclear_opening")

    # Relevant skills
    matched = [s.lower() for s in (job.get("matchedSkills") or [])]
    if sum(1 for s in matched[:8] if s in content_l) >= 2:
        checks += 1
    else:
        issues.append("missing_relevant_skills")
        suggestions.append("Reference 2–3 matched skills from the job")

    # No fake claims — provenance
    prov = audit_provenance(content, profile, intelligence)
    if prov.get("provenanceSafe"):
        checks += 1
    else:
        issues.extend(prov.get("provenanceIssues", [])[:3])
        issues.append("unsupported_claims")

    # Polite CTA
    if re.search(r"(thank you|consideration|look forward|discuss)", content_l):
        checks += 1
    else:
        issues.append("missing_polite_cta")
        suggestions.append("Add a polite closing call-to-action")

    # No overconfident tone
    if not any(p in content_l for p in OVERCONFIDENT):
        checks += 1
    else:
        issues.append("overconfident_tone")

    score = min(100, round((checks / total) * 100))
    if prov.get("severeCount", 0) > 0:
        score = max(0, score - 20)

    return {
        "jobId": job_id,
        "coverLetterExists": True,
        "coverLetterScore": score,
        "coverLetterIssues": issues,
        "coverLetterSuggestions": suggestions,
        "wordCount": words,
        "provenanceStatus": prov.get("provenanceStatus"),
        "qualityStatus": "needs_review" if score < 50 or prov.get("severeCount") else "approved",
    }
