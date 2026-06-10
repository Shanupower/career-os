"""Deterministic ATS compatibility scorer."""

from __future__ import annotations

import re

from audit_utils import ats_label, read_text_file, resume_dir, resume_pdf_path, token_set
from provenance_auditor import audit_provenance

SIMPLE_HEADINGS = {"summary", "skills", "experience", "education", "projects", "contact"}
COMPLEX_PATTERNS = re.compile(r"<table|!\[|<img|style=|display:\s*flex", re.I)


def _try_pdf_text(pdf_path) -> tuple[str, bool]:
    """Best-effort PDF text extraction without extra deps."""
    if not pdf_path.exists():
        return "", False
    try:
        raw = pdf_path.read_bytes()
        # Extract printable ASCII runs from PDF streams
        text_runs = re.findall(rb"[\x20-\x7e]{4,}", raw)
        text = b" ".join(text_runs[:500]).decode("ascii", errors="ignore")
        extractable = len(text) > 100
        return text, extractable
    except Exception:
        return "", False


def score_ats(
    job: dict,
    profile: dict,
    intelligence: dict,
) -> dict:
    job_id = job.get("jobId", "")
    rdir = resume_dir(job_id)
    md_path = rdir / "tailored_resume.md"
    pdf_path = resume_pdf_path(job_id)

    content = read_text_file(md_path)
    pdf_text, pdf_extractable = _try_pdf_text(pdf_path)

    breakdown = {
        "contactInfo": 0,
        "structure": 0,
        "keywordMatch": 0,
        "readability": 0,
        "truthSafety": 0,
    }
    issues: list[str] = []

    if not content and not pdf_text:
        return {
            "jobId": job_id,
            "atsScore": 0,
            "atsLabel": "Poor",
            "atsBreakdown": breakdown,
            "atsIssues": ["no_resume_content"],
            "qualityStatus": "needs_review",
        }

    audit_content = content or pdf_text
    content_l = audit_content.lower()

    # Contact info (10)
    basic = profile.get("basicProfile") or {}
    name = (basic.get("fullName") or "").strip()
    email = basic.get("email") or ""
    phone = basic.get("phone") or ""
    contact_score = 0
    if name and name.lower() in content_l:
        contact_score += 4
    else:
        issues.append("missing_name_in_resume")
    if email and email.lower() in content_l:
        contact_score += 3
    else:
        issues.append("missing_email_in_resume")
    if phone and re.sub(r"\s", "", phone)[:8] in re.sub(r"\s", "", audit_content):
        contact_score += 3
    else:
        issues.append("missing_phone_in_resume")
    breakdown["contactInfo"] = min(10, contact_score)

    # Structure (20)
    struct = 0
    if re.search(r"^#{1,3}\s", audit_content, re.M):
        struct += 8
    else:
        issues.append("no_markdown_headings")
    heading_hits = sum(1 for h in SIMPLE_HEADINGS if h in content_l)
    struct += min(8, heading_hits * 2)
    if "## skills" in content_l or "skills\n" in content_l:
        struct += 2
    if "## experience" in content_l or "experience" in content_l:
        struct += 2
    if not COMPLEX_PATTERNS.search(audit_content):
        struct += 4
    else:
        issues.append("tables_or_images_detected")
    breakdown["structure"] = min(20, struct)

    # Keyword match (30)
    jd_tokens = token_set(job.get("description") or "")
    resume_tokens = token_set(audit_content)
    overlap = len(jd_tokens & resume_tokens)
    matched_skills = job.get("matchedSkills") or []
    skill_hits = sum(1 for s in matched_skills if s.lower() in content_l)
    kw = min(20, overlap)
    kw += min(10, skill_hits)
    breakdown["keywordMatch"] = min(30, kw)
    if kw < 15:
        issues.append("low_jd_keyword_coverage")

    # Readability (20)
    read = 10
    if len(audit_content) >= 400:
        read += 4
    else:
        issues.append("resume_too_short")
    bullets = len(re.findall(r"^[\-\*•]", audit_content, re.M))
    if bullets >= 2:
        read += 3
    if pdf_path.exists():
        read += 2
        if pdf_extractable:
            read += 1
        else:
            issues.append("pdf_text_not_extractable")
    if re.match(r"tailored_resume\.(md|pdf|html)$", md_path.name) or pdf_path.name == "tailored_resume.pdf":
        read += 0  # naming ok by convention
    breakdown["readability"] = min(20, read)

    # Truth safety (20)
    prov = audit_provenance(audit_content, profile, intelligence)
    truth = 20
    if prov.get("severeCount", 0) > 0:
        truth -= 15
        issues.append("severe_provenance_failure")
    elif not prov.get("provenanceSafe"):
        truth -= 8
        issues.append("provenance_warnings")
    breakdown["truthSafety"] = max(0, truth)

    total = sum(breakdown.values())
    return {
        "jobId": job_id,
        "atsScore": total,
        "atsLabel": ats_label(total),
        "atsBreakdown": breakdown,
        "atsIssues": issues,
        "pdfExtractable": pdf_extractable,
        "provenanceStatus": prov.get("provenanceStatus"),
        "qualityStatus": "needs_review" if total < 50 or prov.get("severeCount") else "approved",
    }
