"""Shared utilities for quality audit module."""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[2]

PROFILE_PATH = ROOT / "data" / "profile" / "candidate-profile.json"
INTELLIGENCE_PATH = ROOT / "data" / "intelligence" / "candidate-intelligence.json"
DISCOVERED_JOBS_PATH = ROOT / "data" / "jobs" / "discovered_jobs.json"
SCORED_JOBS_PATH = ROOT / "data" / "jobs" / "scored_jobs.json"
RESUMES_ROOT = ROOT / "data" / "resumes"
AUDITS_ROOT = ROOT / "data" / "audits"

SUSPICIOUS_COMPANY = re.compile(
    r"^(test|unknown|n/?a|tbd|company|acme|sample|lorem)\b",
    re.I,
)
URL_RE = re.compile(r"^https?://", re.I)
WORD_RE = re.compile(r"\b\w+\b", re.I)


def load_json(path: Path) -> Any:
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def score_label(score: float) -> str:
    if score >= 85:
        return "Excellent"
    if score >= 70:
        return "Good"
    if score >= 50:
        return "Weak"
    return "Bad"


def ats_label(score: float) -> str:
    if score >= 85:
        return "Excellent"
    if score >= 70:
        return "Good"
    if score >= 50:
        return "Needs Work"
    return "Poor"


def confidence_label(score: float) -> str:
    if score >= 75:
        return "high"
    if score >= 50:
        return "medium"
    return "low"


def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip().lower())


def token_set(text: str) -> set[str]:
    return {t.lower() for t in WORD_RE.findall(text or "") if len(t) > 2}


def job_key(job: dict) -> str:
    title = normalize_text(job.get("title", ""))
    company = normalize_text(job.get("company", ""))
    location = normalize_text(job.get("location", ""))
    return f"{title}|{company}|{location}"


def is_valid_url(url: str) -> bool:
    if not url or not URL_RE.match(url.strip()):
        return False
    try:
        parsed = urlparse(url.strip())
        return bool(parsed.netloc)
    except Exception:
        return False


def strip_html(html: str) -> str:
    return re.sub(r"<[^>]+>", " ", html or "").replace("&amp;", "&").replace("&lt;", "<")


def read_text_file(path: Path) -> str:
    if not path.exists():
        return ""
    return path.read_text(encoding="utf-8", errors="ignore")


def resume_dir(job_id: str) -> Path:
    return RESUMES_ROOT / job_id


def resume_pdf_path(job_id: str) -> Path:
    """Resolve the resume PDF — spec-named `*_Resume.pdf` or legacy tailored_resume.pdf."""
    rdir = resume_dir(job_id)
    spec = sorted(rdir.glob("*_Resume.pdf"))
    return spec[0] if spec else rdir / "tailored_resume.pdf"


def pick_sample_jobs(jobs: list[dict], limit: int = 5) -> list[dict]:
    """Pick top P1/Apply jobs for sample audit."""
    ranked = sorted(
        jobs,
        key=lambda j: (
            0 if j.get("priority") == "P1" else 1,
            0 if j.get("applyRecommendation") == "Apply" else 1,
            -(j.get("matchScore") or 0),
        ),
    )
    apply_p1 = [
        j for j in ranked
        if j.get("priority") == "P1" or j.get("applyRecommendation") == "Apply"
    ]
    pool = apply_p1 or ranked
    return pool[:limit]


def quality_status(severe_count: int, score: float) -> str:
    if severe_count > 0 or score < 50:
        return "needs_review"
    return "approved"


def weighted_overall(parts: dict[str, float | None], weights: dict[str, float]) -> float:
    total_w = 0.0
    total = 0.0
    for key, weight in weights.items():
        val = parts.get(key)
        if val is None:
            continue
        total += val * weight
        total_w += weight
    if total_w == 0:
        return 0.0
    return round(total / total_w, 1)
