"""Export quality audit reports to data/audits/."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from audit_utils import AUDITS_ROOT, now_iso


def ensure_audits_dir() -> Path:
    AUDITS_ROOT.mkdir(parents=True, exist_ok=True)
    return AUDITS_ROOT


def export_reports(audit_result: dict) -> dict[str, str]:
    ensure_audits_dir()
    paths: dict[str, str] = {}

    system_path = AUDITS_ROOT / "system_audit_report.json"
    system_path.write_text(json.dumps(audit_result, indent=2), encoding="utf-8")
    paths["system"] = str(system_path)

    job_audits = audit_result.get("jobAudits") or []

    resume_report = {
        "generatedAt": audit_result.get("generatedAt"),
        "jobs": [
            {
                "jobId": j.get("jobId"),
                "title": j.get("title"),
                "company": j.get("company"),
                "resumeQualityScore": j.get("resumeQualityScore"),
                "resumeIssues": j.get("resumeIssues", []),
                "resumeSuggestions": j.get("resumeSuggestions", []),
                "qualityStatus": j.get("resumeQualityStatus"),
            }
            for j in job_audits
        ],
        "averageScore": audit_result.get("summary", {}).get("resumeQualityAverage"),
    }
    resume_path = AUDITS_ROOT / "resume_quality_report.json"
    resume_path.write_text(json.dumps(resume_report, indent=2), encoding="utf-8")
    paths["resume"] = str(resume_path)

    cover_report = {
        "generatedAt": audit_result.get("generatedAt"),
        "jobs": [
            {
                "jobId": j.get("jobId"),
                "title": j.get("title"),
                "company": j.get("company"),
                "coverLetterScore": j.get("coverLetterScore"),
                "coverLetterIssues": j.get("coverLetterIssues", []),
                "coverLetterSuggestions": j.get("coverLetterSuggestions", []),
                "qualityStatus": j.get("coverLetterQualityStatus"),
            }
            for j in job_audits
        ],
        "averageScore": audit_result.get("summary", {}).get("coverLetterAverage"),
    }
    cover_path = AUDITS_ROOT / "cover_letter_quality_report.json"
    cover_path.write_text(json.dumps(cover_report, indent=2), encoding="utf-8")
    paths["coverLetter"] = str(cover_path)

    lead_report = {
        "generatedAt": audit_result.get("generatedAt"),
        "jobs": [
            {
                "jobId": j.get("jobId"),
                "title": j.get("title"),
                "company": j.get("company"),
                "leadQualityScore": j.get("leadQualityScore"),
                "leadQualityLabel": j.get("leadQualityLabel"),
                "leadIssues": j.get("leadIssues", []),
            }
            for j in job_audits
        ],
        "averageScore": audit_result.get("summary", {}).get("leadQualityAverage"),
    }
    lead_path = AUDITS_ROOT / "job_lead_quality_report.json"
    lead_path.write_text(json.dumps(lead_report, indent=2), encoding="utf-8")
    paths["jobLead"] = str(lead_path)

    ats_report = {
        "generatedAt": audit_result.get("generatedAt"),
        "jobs": [
            {
                "jobId": j.get("jobId"),
                "title": j.get("title"),
                "company": j.get("company"),
                "atsScore": j.get("atsScore"),
                "atsLabel": j.get("atsLabel"),
                "atsBreakdown": j.get("atsBreakdown", {}),
                "atsIssues": j.get("atsIssues", []),
                "qualityStatus": j.get("atsQualityStatus"),
            }
            for j in job_audits
        ],
        "averageScore": audit_result.get("summary", {}).get("atsAverage"),
    }
    ats_path = AUDITS_ROOT / "ats_score_report.json"
    ats_path.write_text(json.dumps(ats_report, indent=2), encoding="utf-8")
    paths["ats"] = str(ats_path)

    return paths


def load_system_report() -> dict[str, Any] | None:
    path = AUDITS_ROOT / "system_audit_report.json"
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))
