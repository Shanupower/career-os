"""Export profile + intelligence to JSON Resume schema (jsonresume.org)."""

from __future__ import annotations

import re
from datetime import datetime, timezone


def _split_name(full_name: str) -> dict:
    parts = (full_name or "Candidate").strip().split()
    if not parts:
        return {"name": "Candidate"}
    if len(parts) == 1:
        return {"name": parts[0]}
    return {"name": parts[0], "name_last": parts[-1]}


def _parse_contact(contact: str) -> dict:
    out: dict = {}
    if not contact:
        return out
    email = re.search(r"[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}", contact)
    if email:
        out["email"] = email.group(0)
    phone = re.search(r"\+?\d[\d\s().-]{8,}\d", contact)
    if phone:
        out["phone"] = phone.group(0).strip()
    linkedin = re.search(r"linkedin\.com/in/[\w%-]+", contact, re.I)
    if linkedin:
        out["url"] = "https://" + linkedin.group(0).lstrip("/")
    return out


def build_json_resume(profile: dict, intelligence: dict, ctx: dict | None = None) -> dict:
    """Map Career OS data to JSON Resume v1 format."""
    basic = profile.get("basicProfile") or {}
    ctx = ctx or {}
    name_parts = _split_name(basic.get("fullName") or ctx.get("name") or "")
    contact = _parse_contact(ctx.get("contact") or "")

    basics = {
        **name_parts,
        "label": basic.get("currentRole") or ctx.get("subtitle") or "",
        "email": basic.get("email") or contact.get("email") or "",
        "phone": basic.get("phone") or contact.get("phone") or "",
        "url": contact.get("url") or "",
        "summary": ctx.get("summary") or ctx.get("about_me") or "",
        "location": {"city": basic.get("location") or ""},
    }

    work = []
    for exp in ctx.get("experience") or []:
        work.append({
            "name": exp.get("company") or "",
            "position": exp.get("title") or "",
            "summary": "",
            "highlights": exp.get("bullets") or [],
        })

    skills = []
    for cat in ctx.get("skill_categories") or []:
        items = cat.get("skills") or []
        if items:
            skills.append({"name": cat.get("label") or "Skills", "keywords": items})

    if not skills:
        smap = intelligence.get("skillsMap") or {}
        for label, items in smap.items():
            if isinstance(items, list) and items:
                skills.append({"name": label, "keywords": items})

    education = []
    edu = ctx.get("education")
    if isinstance(edu, dict):
        education.append({
            "institution": edu.get("school") or edu.get("institution") or "",
            "studyType": edu.get("degree") or "",
            "endDate": edu.get("graduated") or "",
        })

    return {
        "$schema": "https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json",
        "meta": {
            "version": "v1.0.0",
            "lastModified": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "generatedBy": "Career OS",
        },
        "basics": basics,
        "work": work,
        "skills": skills,
        "education": education,
    }
