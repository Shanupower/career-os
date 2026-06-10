"""Resume tailoring quality audit."""

from __future__ import annotations

import re

from audit_utils import read_text_file, resume_dir, resume_pdf_path, token_set
from provenance_auditor import audit_provenance

HEADING_RE = re.compile(r"^#{1,3}\s+\w+", re.M)
BULLET_RE = re.compile(r"^[\-\*•]\s+.+", re.M)
EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+\.\w+")
PHONE_RE = re.compile(r"\+?\d[\d\s\-()]{7,}\d")


def audit_resume(
    job: dict,
    profile: dict,
    intelligence: dict,
    provenance_result: dict | None = None,
) -> dict:
    job_id = job.get("jobId", "")
    rdir = resume_dir(job_id)
    md_path = rdir / "tailored_resume.md"
    html_path = rdir / "tailored_resume.html"
    pdf_path = resume_pdf_path(job_id)

    content = read_text_file(md_path) or read_text_file(html_path)
    issues: list[str] = []
    suggestions: list[str] = []
    checks = 0
    total = 10

    if not content:
        return {
            "jobId": job_id,
            "resumeExists": False,
            "resumeQualityScore": 0,
            "resumeIssues": ["resume_file_missing"],
            "resumeSuggestions": ["Generate tailored resume for this job"],
            "qualityStatus": "needs_review",
        }

    desc = (job.get("description") or "").lower()
    jd_tokens = token_set(desc)
    resume_tokens = token_set(content)
    matched_skills = [s.lower() for s in (job.get("matchedSkills") or [])]

    # Role relevance
    title = (job.get("title") or "").lower()
    if any(t in content.lower() for t in title.split() if len(t) > 3):
        checks += 1
    else:
        issues.append("weak_role_relevance")
        suggestions.append(f"Mention target role keywords from: {job.get('title')}")

    # Keyword alignment
    overlap = len(jd_tokens & resume_tokens)
    if overlap >= 5 or len([s for s in matched_skills if s in content.lower()]) >= 3:
        checks += 1
    else:
        issues.append("low_keyword_alignment")
        suggestions.append("Include more keywords from the job description")

    # ATS clarity — simple headings
    if HEADING_RE.search(content):
        checks += 1
    else:
        issues.append("missing_clear_headings")
        suggestions.append("Use standard section headings (Summary, Skills, Experience)")

    # Bullet strength
    bullets = BULLET_RE.findall(content)
    if len(bullets) >= 3:
        checks += 1
    elif len(bullets) >= 1:
        suggestions.append("Add more achievement bullets")
    else:
        issues.append("weak_bullet_strength")
        suggestions.append("Add quantified achievement bullets")

    # Summary relevance
    if re.search(r"(summary|about)", content, re.I) and len(content) > 200:
        checks += 1
    else:
        issues.append("missing_or_weak_summary")
        suggestions.append("Add a role-targeted professional summary")

    # Provenance / truth
    prov = provenance_result or audit_provenance(content, profile, intelligence)
    if prov.get("provenanceSafe"):
        checks += 1
    else:
        issues.extend(prov.get("provenanceIssues", [])[:5])
        if prov.get("severeCount", 0) > 0:
            issues.append("hallucinated_or_unsupported_claims")

    # Formatting quality
    if not re.search(r"<table|!\[|```", content, re.I):
        checks += 1
    else:
        issues.append("complex_formatting_detected")

    # Contact section
    if EMAIL_RE.search(content) and PHONE_RE.search(content):
        checks += 1
    else:
        issues.append("incomplete_contact_section")
        suggestions.append("Ensure name, email, and phone are present")

    # Skills section
    if re.search(r"##\s*skills|skills\s*:", content, re.I):
        checks += 1
    else:
        issues.append("missing_skills_section")
        suggestions.append("Add a dedicated skills section")

    # Skills relevance
    skill_hits = sum(1 for s in matched_skills[:15] if s in content.lower())
    if skill_hits >= 3:
        checks += 1
    else:
        issues.append("skills_not_relevant_to_jd")
        suggestions.append("Align skills section with matched job skills")

    score = round((checks / total) * 100)
    if prov.get("severeCount", 0) > 0:
        score = max(0, score - 25)

    severe = prov.get("severeCount", 0) > 0 or "hallucinated" in " ".join(issues)
    return {
        "jobId": job_id,
        "resumeExists": True,
        "resumePath": str(md_path),
        "pdfExists": pdf_path.exists(),
        "resumeQualityScore": score,
        "resumeIssues": issues,
        "resumeSuggestions": suggestions,
        "provenanceStatus": prov.get("provenanceStatus", "unknown"),
        "provenanceIssues": prov.get("provenanceIssues", []),
        "qualityStatus": "needs_review" if severe or score < 50 else "approved",
    }
