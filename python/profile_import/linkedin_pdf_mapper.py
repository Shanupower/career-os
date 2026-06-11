"""Map LinkedIn profile PDF export text to Career OS profile fields."""

from __future__ import annotations

import re

LINKEDIN_MARKERS = ("linkedin", "top skills", "contact", "www.linkedin.com")
SECTION_PATTERNS = {
    "experience": re.compile(r"^(experience|work experience|professional experience)\b", re.I),
    "education": re.compile(r"^education\b", re.I),
    "skills": re.compile(r"^(skills|top skills|core competencies)\b", re.I),
    "summary": re.compile(r"^(summary|about|profile)\b", re.I),
}


def _lines(text: str) -> list[str]:
    return [ln.strip() for ln in text.splitlines() if ln.strip()]


def _is_linkedin_export(text: str) -> bool:
    lower = text.lower()
    return any(marker in lower for marker in LINKEDIN_MARKERS)


def _extract_email(text: str) -> str:
    m = re.search(r"[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}", text)
    return m.group(0) if m else ""


def _extract_phone(text: str) -> str:
    for pat in (
        r"\+?\d{1,3}[\s.-]?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}",
        r"\b[6-9]\d{9}\b",
    ):
        m = re.search(pat, text)
        if m:
            return m.group(0).strip()
    return ""


def _extract_linkedin_url(text: str) -> str:
    m = re.search(r"https?://(?:www\.)?linkedin\.com/in/[\w%-]+", text, re.I)
    return m.group(0) if m else ""


def _extract_name(lines: list[str]) -> str:
    for line in lines[:8]:
        if "@" in line or "http" in line.lower() or len(line) > 70:
            continue
        if re.match(r"^[A-Z][a-z]+(?:\s+[A-Z][\w'.-]+){1,4}$", line):
            return line
        if 2 <= len(line.split()) <= 5 and not SECTION_PATTERNS["experience"].match(line):
            return line
    return ""


def _split_sections(lines: list[str]) -> dict[str, list[str]]:
    sections: dict[str, list[str]] = {
        "summary": [], "experience": [], "education": [], "skills": [],
    }
    current = "summary"
    for line in lines:
        matched = False
        for key, pattern in SECTION_PATTERNS.items():
            if pattern.match(line):
                current = key
                matched = True
                break
        if not matched:
            sections[current].append(line)
    return sections


def _parse_experience(lines: list[str]) -> list[str]:
    entries = []
    buf: list[str] = []
    for line in lines:
        if re.match(r"^[A-Z][\w\s&.,'-]{2,60}$", line) and buf:
            entries.append(" — ".join(buf))
            buf = [line]
        else:
            buf.append(line)
    if buf:
        entries.append(" — ".join(buf))
    return entries[:12]


def _parse_skills(lines: list[str]) -> list[str]:
    skills: list[str] = []
    for line in lines:
        for part in re.split(r"[,•|·]", line):
            s = part.strip()
            if 2 <= len(s) <= 40 and not SECTION_PATTERNS["skills"].match(s):
                skills.append(s)
    return list(dict.fromkeys(skills))[:40]


def map_linkedin_pdf_text(raw_text: str) -> dict:
    """Return profile partial suitable for merging into candidate-profile."""
    text = (raw_text or "").strip()
    lines = _lines(text)
    sections = _split_sections(lines)

    basic = {
        "fullName": _extract_name(lines),
        "email": _extract_email(text),
        "phone": _extract_phone(text),
        "linkedin": _extract_linkedin_url(text),
    }

    headline = ""
    for line in lines[1:6]:
        if line != basic["fullName"] and "@" not in line and "linkedin" not in line.lower():
            if len(line) < 80:
                headline = line
                break
    if headline:
        basic["currentRole"] = headline

    parsed = {
        "skills": _parse_skills(sections["skills"]),
        "workExperience": _parse_experience(sections["experience"]),
        "education": sections["education"][:8],
        "projects": [],
        "certifications": [],
        "links": [u for u in [_extract_linkedin_url(text)] if u],
    }

    if sections["summary"]:
        parsed["summary"] = " ".join(sections["summary"][:6])

    return {
        "source": "linkedin_pdf",
        "isLinkedInExport": _is_linkedin_export(text),
        "basicProfile": {k: v for k, v in basic.items() if v},
        "parsedData": parsed,
        "rawText": text,
    }
