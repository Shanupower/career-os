"""LLM content generation via local Claude Code (no API key).

Claude drafts the variable content (Parts 4-5 of CAREER_OS_GENERATION_CONTEXT.md):
subtitle, summary, bullet rewrites/ordering, skills ordering, optional projects,
and the 4 cover letter paragraphs. Output is structurally validated here and
fact-checked (provenance + cliché lint) by the caller before acceptance.
Styling never goes near the LLM — templates stay fixed.
"""

from __future__ import annotations

import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "python" / "llm"))

import claude_code  # noqa: E402

PROJECT_INTEL_PATH = ROOT / "data/intelligence/project-intelligence.json"

PROMPT_TEMPLATE = """You are the resume/cover-letter tailoring engine of a Career OS. \
You receive a job description and verified candidate data. Produce tailored CONTENT only \
— styling is handled elsewhere.

## HARD RULES (violations make the output unusable)
- Every claim must trace to the CANDIDATE DATA below. NEVER invent metrics, numbers, \
employers, titles, dates, or technologies. Copy numbers and proper nouns verbatim \
(e.g. "₹1,000 Cr AUM", "20+ production applications").
- Mirror the JD's exact phrasing only where the candidate genuinely has the skill; \
skip JD keywords the candidate cannot support.
- Banned phrases: passionate, team player, fast-paced environment, results-driven, \
go-getter, think outside the box, self-starter, dynamic, synergy.
- Resume experience: reorder/reword the given bullets to put JD-relevant ones first \
and mirror JD vocabulary. Keep every metric verbatim. 4-6 bullets for recent roles, \
2 for short stints. Do not add bullets with facts not present in the data.
- Cover letter: exactly 4 paragraphs, 330-420 words total. P1 = hook naming the exact \
role + company, leading with the strongest quantified credential, ending with a bridge \
to the company's domain. P2 = deep-dive of the most relevant role weaving the JD's top \
keywords into real accomplishments, ending with a lesson tied to a JD value. \
P3 = breadth from an earlier role + one differentiator the JD cares about. \
P4 = 2-3 sentences mapping 3-4 JD keywords to candidate skills, request the \
conversation, thank them. Confident, concrete, no clichés.
- projects: include at most 2, ONLY if genuinely relevant to this JD; one factual line \
each drawn from the PROJECT INTELLIGENCE data. Empty array if none are relevant.

## JOB
Title: {title}
Company: {company}
Location: {location}
Description:
{description}

## CANDIDATE DATA (the only source of truth)
Parsed resume:
{parsed_resume}

Intelligence summary:
{intelligence}

Project intelligence:
{project_intel}

## OUTPUT
Return ONLY a JSON object, no prose, with exactly this shape:
{{
  "subtitle": "<role-echoing tagline, e.g. 'Senior Software Engineer | Backend, Cloud & Distributed Systems'>",
  "summary": "<3 sentences: experience framing -> candidate∩JD tech stack -> specialization matching JD themes>",
  "experience": [{{"company": "<exact company name from data>", "bullets": ["<reordered/reworded bullets>"]}}],
  "skills": [{{"label": "<category>", "skills": ["<items, JD-relevant first>"]}}],
  "projects": [{{"name": "<project>", "line": "<one factual line>"}}],
  "cover_letter_paragraphs": ["<P1>", "<P2>", "<P3>", "<P4>"]
}}"""


def _strip_html(text: str) -> str:
    return re.sub(r"<[^>]+>", " ", html.unescape(text or ""))


def load_project_intelligence() -> dict:
    if PROJECT_INTEL_PATH.exists():
        try:
            return json.loads(PROJECT_INTEL_PATH.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass
    return {}


def _validate(data: dict, parsed: dict) -> list[str]:
    """Structural checks before the caller's provenance/lint gates."""
    issues = []
    if not isinstance(data.get("subtitle"), str) or not data["subtitle"].strip():
        issues.append("missing subtitle")
    if not isinstance(data.get("summary"), str) or len(data["summary"]) < 80:
        issues.append("missing/short summary")
    paras = data.get("cover_letter_paragraphs")
    if not isinstance(paras, list) or len(paras) != 4 or not all(isinstance(p, str) and p.strip() for p in paras):
        issues.append("cover letter must be exactly 4 non-empty paragraphs")
    known_companies = {(e.get("company") or "").strip().lower() for e in parsed.get("experience") or []}
    for entry in data.get("experience") or []:
        if (entry.get("company") or "").strip().lower() not in known_companies:
            issues.append(f"unknown company in experience: {entry.get('company')}")
        if not entry.get("bullets"):
            issues.append(f"empty bullets for {entry.get('company')}")
    return issues


def generate_llm_content(parsed: dict, intelligence: dict, job: dict) -> tuple[dict | None, str]:
    """Returns (content, '') or (None, reason). Caller must fact-check before use."""
    if not claude_code.is_available():
        return None, claude_code.availability()["reason"]

    intel_slim = {
        "candidateSummary": intelligence.get("candidateSummary"),
        "skillsMap": intelligence.get("skillsMap"),
        "experienceMap": intelligence.get("experienceMap"),
        "atsKeywordBank": (intelligence.get("atsKeywordBank") or {}).get("highPriority"),
    }
    project_intel = load_project_intelligence()
    project_slim = {
        "aggregate": project_intel.get("aggregate"),
        "projects": [
            {k: p.get(k) for k in ("name", "summary", "domain", "techStack", "quantifiables", "highlights")}
            for p in project_intel.get("projects") or []
        ],
    } if project_intel else "none available"

    prompt = PROMPT_TEMPLATE.format(
        title=job.get("title") or "",
        company=job.get("company") or "",
        location=job.get("location") or "",
        description=_strip_html(job.get("description") or "")[:5000],
        parsed_resume=json.dumps(
            {k: parsed.get(k) for k in ("about_me", "experience", "skill_categories", "education")},
            ensure_ascii=False, indent=1),
        intelligence=json.dumps(intel_slim, ensure_ascii=False, indent=1),
        project_intel=json.dumps(project_slim, ensure_ascii=False, indent=1) if isinstance(project_slim, dict) else project_slim,
    )

    data, err = claude_code.complete_json(prompt, timeout=300)
    if data is None:
        return None, err
    issues = _validate(data, parsed)
    if issues:
        return None, "; ".join(issues)
    return data, ""
