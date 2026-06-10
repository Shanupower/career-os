"""Outreach lead and message quality audit."""

from __future__ import annotations

import re

from audit_utils import is_valid_url, normalize_text

MESSAGE_LIMITS = {
    "connection_request": 300,
    "linkedin_message": 1000,
    "inmail": 1000,
    "follow_up": 1000,
    "thank_you": 1000,
}


def _companies_match(a: str, b: str) -> bool:
    na = normalize_text(a).replace(" ", "")
    nb = normalize_text(b).replace(" ", "")
    if not na or not nb:
        return True
    return na == nb or na in nb or nb in na


def audit_outreach(job: dict) -> dict:
    outreach = job.get("outreach") or {}
    contacts = outreach.get("contacts") or []
    messages = outreach.get("messages") or []
    app_tracking = job.get("applicationTracking") or {}

    contact_issues: list[str] = []
    message_issues: list[str] = []
    checks = 0
    total = 0

    if not contacts and not messages:
        return {
            "jobId": job.get("jobId"),
            "outreachQualityScore": 100,
            "contactQualityIssues": [],
            "messageQualityIssues": [],
            "contactCount": 0,
            "messageCount": 0,
            "qualityStatus": "approved",
            "note": "No outreach data to audit",
        }

    relevant_titles = {"recruiter", "talent", "hiring", "hr", "people", "engineer", "manager", "director"}

    for c in contacts:
        total += 7
        if _companies_match(c.get("company", ""), job.get("company", "")):
            checks += 1
        else:
            contact_issues.append(f"Contact {c.get('name')} may not belong to {job.get('company')}")

        title_l = normalize_text(c.get("title", ""))
        if any(t in title_l for t in relevant_titles):
            checks += 1
        else:
            contact_issues.append(f"Contact title may be irrelevant: {c.get('title')}")

        if c.get("linkedinUrl") and is_valid_url(c.get("linkedinUrl", "")):
            checks += 1
        else:
            contact_issues.append(f"Missing LinkedIn URL for {c.get('name')}")

        ctype = c.get("contactType", "")
        if ctype in ("recruiter", "talent_acquisition", "hiring_manager", "engineering_manager"):
            checks += 1
        else:
            contact_issues.append(f"Contact type may be incorrect: {ctype}")

        conf = c.get("confidence", "medium")
        if conf in ("high", "medium"):
            checks += 1
        else:
            contact_issues.append(f"Low confidence contact: {c.get('name')}")

        if c.get("name"):
            checks += 1
        else:
            contact_issues.append("Contact missing name")

        if c.get("source"):
            checks += 1

    for m in messages:
        total += 4
        body = m.get("body") or ""
        mtype = m.get("type", "inmail")
        limit = MESSAGE_LIMITS.get(mtype, 1000)

        if body and len(body) > 50:
            checks += 1
            if job.get("company", "").lower()[:5] in body.lower() or job.get("title", "").lower()[:5] in body.lower():
                checks += 1
            else:
                message_issues.append("Message may not be personalized to job/company")
        else:
            message_issues.append("Empty or very short message")

        if len(body) <= limit:
            checks += 1
        else:
            message_issues.append(f"Message exceeds {limit} char limit for {mtype}")

        if m.get("contactId"):
            checks += 1
        else:
            message_issues.append("Message not linked to contact")

    # Follow-up scheduled
    total += 1
    if app_tracking.get("followUpDate") or outreach.get("status") == "replied":
        checks += 1
    elif outreach.get("status") == "sent":
        contact_issues.append("follow_up_not_scheduled_after_sent")

    score = round((checks / max(total, 1)) * 100) if total else 100

    return {
        "jobId": job.get("jobId"),
        "outreachQualityScore": score,
        "contactQualityIssues": contact_issues,
        "messageQualityIssues": message_issues,
        "contactCount": len(contacts),
        "messageCount": len(messages),
        "qualityStatus": "needs_review" if score < 50 else "approved",
    }
