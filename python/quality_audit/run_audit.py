#!/usr/bin/env python3
"""Run quality audit across jobs, resumes, cover letters, ATS, and outreach."""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from audit_utils import (  # noqa: E402
    DISCOVERED_JOBS_PATH,
    INTELLIGENCE_PATH,
    PROFILE_PATH,
    SCORED_JOBS_PATH,
    job_key,
    load_json,
    now_iso,
    pick_sample_jobs,
    quality_status,
    weighted_overall,
)
from ats_scorer import score_ats  # noqa: E402
from cover_letter_auditor import audit_cover_letter  # noqa: E402
from job_lead_auditor import audit_job_lead  # noqa: E402
from outreach_auditor import audit_outreach  # noqa: E402
from report_exporter import export_reports  # noqa: E402
from resume_auditor import audit_resume  # noqa: E402
from scoring_auditor import audit_score_accuracy  # noqa: E402

OVERALL_WEIGHTS = {
    "leadQuality": 20,
    "scoreAccuracy": 15,
    "resumeQuality": 25,
    "atsScore": 20,
    "coverLetterQuality": 10,
    "outreachQuality": 10,
}


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Quality audit for Career OS pipeline outputs.")
    p.add_argument("--profile", type=Path, default=PROFILE_PATH)
    p.add_argument("--intelligence", type=Path, default=INTELLIGENCE_PATH)
    p.add_argument("--jobs", type=Path, default=SCORED_JOBS_PATH)
    p.add_argument("--sample-me", action="store_true", help="Audit top 5 P1/Apply jobs only")
    p.add_argument("--limit", type=int, default=0, help="Max jobs to audit (0 = all)")
    return p.parse_args()


def _avg(values: list[float | int | None]) -> float | None:
    nums = [v for v in values if v is not None]
    if not nums:
        return None
    return round(sum(nums) / len(nums), 1)


def run_audit(
    profile: dict,
    intelligence: dict,
    jobs: list[dict],
    sample_only: bool = False,
    limit: int = 0,
) -> dict:
    if sample_only:
        jobs = pick_sample_jobs(jobs, limit=5)
    elif limit > 0:
        jobs = jobs[:limit]

    # Build duplicate key set from full job list context
    key_counts: Counter[str] = Counter()
    for j in jobs:
        key_counts[job_key(j)] += 1
    duplicate_keys = {k for k, c in key_counts.items() if c > 1}

    job_audits: list[dict] = []
    all_issues: Counter[str] = Counter()
    unsafe_assets: list[dict] = []

    for job in jobs:
        lead = audit_job_lead(job, intelligence, duplicate_keys)
        scoring = audit_score_accuracy(job, intelligence)
        resume = audit_resume(job, profile, intelligence)
        ats = score_ats(job, profile, intelligence)
        cover = audit_cover_letter(job, profile, intelligence)
        outreach = audit_outreach(job)

        for issue in lead.get("leadIssues", []):
            all_issues[issue] += 1
        for issue in scoring.get("scoreAuditIssues", []):
            all_issues[issue] += 1
        for issue in resume.get("resumeIssues", []):
            all_issues[issue] += 1
        for issue in ats.get("atsIssues", []):
            all_issues[issue] += 1
        for issue in cover.get("coverLetterIssues", []):
            all_issues[issue] += 1

        score_acc_score = scoring.get("scoreConfidenceScore", 50)

        parts = {
            "leadQuality": lead["leadQualityScore"],
            "scoreAccuracy": score_acc_score,
            "resumeQuality": resume.get("resumeQualityScore") if resume.get("resumeExists") else None,
            "atsScore": ats.get("atsScore") if resume.get("resumeExists") else None,
            "coverLetterQuality": cover.get("coverLetterScore") if cover.get("coverLetterExists") else None,
            "outreachQuality": outreach.get("outreachQualityScore"),
        }
        job_overall = weighted_overall(parts, OVERALL_WEIGHTS)

        severe = (
            resume.get("qualityStatus") == "needs_review"
            and resume.get("provenanceStatus") == "needs_review"
        ) or ats.get("qualityStatus") == "needs_review"

        row = {
            "jobId": job.get("jobId"),
            "title": job.get("title"),
            "company": job.get("company"),
            "priority": job.get("priority"),
            "matchScore": job.get("matchScore"),
            "overallQualityScore": job_overall,
            "qualityStatus": quality_status(1 if severe else 0, job_overall),
            # Lead
            "leadQualityScore": lead["leadQualityScore"],
            "leadQualityLabel": lead["leadQualityLabel"],
            "leadIssues": lead["leadIssues"],
            # Scoring
            "scoreConfidence": scoring["scoreConfidence"],
            "scoreAuditIssues": scoring["scoreAuditIssues"],
            "scoreConfidenceScore": score_acc_score,
            # Resume
            "resumeQualityScore": resume.get("resumeQualityScore"),
            "resumeIssues": resume.get("resumeIssues", []),
            "resumeSuggestions": resume.get("resumeSuggestions", []),
            "resumeQualityStatus": resume.get("qualityStatus"),
            "resumeExists": resume.get("resumeExists"),
            # ATS
            "atsScore": ats.get("atsScore"),
            "atsLabel": ats.get("atsLabel"),
            "atsBreakdown": ats.get("atsBreakdown"),
            "atsIssues": ats.get("atsIssues", []),
            "atsQualityStatus": ats.get("qualityStatus"),
            # Cover letter
            "coverLetterScore": cover.get("coverLetterScore"),
            "coverLetterIssues": cover.get("coverLetterIssues", []),
            "coverLetterSuggestions": cover.get("coverLetterSuggestions", []),
            "coverLetterQualityStatus": cover.get("qualityStatus"),
            "coverLetterExists": cover.get("coverLetterExists"),
            # Provenance
            "provenanceStatus": resume.get("provenanceStatus") or ats.get("provenanceStatus"),
            "provenanceIssues": resume.get("provenanceIssues", []),
            # Outreach
            "outreachQualityScore": outreach.get("outreachQualityScore"),
            "contactQualityIssues": outreach.get("contactQualityIssues", []),
            "messageQualityIssues": outreach.get("messageQualityIssues", []),
        }
        job_audits.append(row)

        if severe or row["qualityStatus"] == "needs_review":
            unsafe_assets.append({
                "jobId": job.get("jobId"),
                "title": job.get("title"),
                "reason": row.get("provenanceIssues") or row.get("resumeIssues") or row.get("atsIssues"),
            })

    summary = {
        "jobsAudited": len(job_audits),
        "overallSystemScore": _avg([j["overallQualityScore"] for j in job_audits]),
        "leadQualityAverage": _avg([j["leadQualityScore"] for j in job_audits]),
        "scoreAccuracyAverage": _avg([j["scoreConfidenceScore"] for j in job_audits]),
        "resumeQualityAverage": _avg([j["resumeQualityScore"] for j in job_audits if j.get("resumeExists")]),
        "atsAverage": _avg([j["atsScore"] for j in job_audits if j.get("resumeExists")]),
        "coverLetterAverage": _avg([j["coverLetterScore"] for j in job_audits if j.get("coverLetterExists")]),
        "outreachQualityAverage": _avg([j["outreachQualityScore"] for j in job_audits]),
        "needsReviewCount": sum(1 for j in job_audits if j["qualityStatus"] == "needs_review"),
        "approvedCount": sum(1 for j in job_audits if j["qualityStatus"] == "approved"),
    }

    top_issues = [{"issue": k, "count": v} for k, v in all_issues.most_common(15)]
    jobs_needing_attention = sorted(
        [j for j in job_audits if j["qualityStatus"] == "needs_review"],
        key=lambda x: x["overallQualityScore"],
    )[:10]

    candidate_name = (profile.get("basicProfile") or {}).get("fullName", "").strip()

    return {
        "generatedAt": now_iso(),
        "auditVersion": "1.0",
        "mode": "sample" if sample_only else "full",
        "candidate": candidate_name,
        "summary": summary,
        "topIssues": top_issues,
        "jobsNeedingAttention": jobs_needing_attention,
        "unsafeGeneratedAssets": unsafe_assets,
        "jobAudits": job_audits,
        "weights": OVERALL_WEIGHTS,
    }


def main() -> int:
    args = parse_args()
    profile = load_json(args.profile)
    intelligence = load_json(args.intelligence)
    jobs_data = load_json(args.jobs)

    if not profile:
        print(f"Missing profile: {args.profile}", file=sys.stderr)
        return 1
    if not intelligence:
        print(f"Missing intelligence: {args.intelligence}", file=sys.stderr)
        return 1
    if not jobs_data:
        print(f"Missing jobs: {args.jobs}", file=sys.stderr)
        return 1

    jobs = jobs_data.get("jobs") if isinstance(jobs_data, dict) else jobs_data
    if not isinstance(jobs, list):
        print("Invalid jobs format", file=sys.stderr)
        return 1

    result = run_audit(
        profile,
        intelligence,
        jobs,
        sample_only=args.sample_me,
        limit=args.limit,
    )
    paths = export_reports(result)

    print(json.dumps({
        "ok": True,
        "jobsAudited": result["summary"]["jobsAudited"],
        "overallSystemScore": result["summary"]["overallSystemScore"],
        "reports": paths,
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
