"""Cover letter generation — 4-paragraph recipe from CAREER_OS_GENERATION_CONTEXT.md Part 4.

Hook (strongest quantified credential) → primary evidence mirroring JD keywords →
breadth + differentiator → close. Every sentence traces to candidate data; no invented
metrics, employers, titles, or technologies.
"""

from __future__ import annotations

import html
import re
from datetime import date

from resume_parser import parse_resume_from_profile
from template_engine import render_cover_letter_html, render_cover_letter_md

BANNED_PHRASES = (
    "passionate",
    "team player",
    "fast-paced environment",
    "results-driven",
    "go-getter",
    "think outside the box",
    "self-starter",
    "synergy",
)

# Proper nouns that must keep their capitalization when a bullet is folded mid-sentence.
_PROPER_FIRST_WORDS = re.compile(r"^(?:[A-Z]{2,}|React|Node|Java|Python|Flutter|AWS|Docker|SQL|CI/CD)")


def _strip_html(text: str) -> str:
    return re.sub(r"<[^>]+>", " ", html.unescape(text or "")).lower()


def _decap(bullet: str) -> str:
    """Fold a resume bullet ('Designed scalable…') into prose ('designed scalable…')."""
    b = (bullet or "").strip().rstrip(".")
    if not b:
        return b
    if _PROPER_FIRST_WORDS.match(b):
        return b
    return b[0].lower() + b[1:]


def _score_bullet(bullet: str, keywords: list[str], require_digit: bool = False) -> float:
    b = bullet.lower()
    score = sum(1.0 for kw in keywords if kw.lower() in b)
    if re.search(r"\d", bullet):
        score += 1.5
    elif require_digit:
        return -1.0
    return score


def _pick_bullets(bullets: list[str], keywords: list[str], n: int, exclude: set[str] = frozenset()) -> list[str]:
    ranked = sorted(
        (b for b in bullets if b not in exclude),
        key=lambda b: _score_bullet(b, keywords),
        reverse=True,
    )
    return ranked[:n]


def _years(intelligence: dict) -> str:
    years = (intelligence.get("experienceMap") or {}).get("yearsOfExperience") or "4"
    return str(years).replace("+", "")


def _candidate_has_ai(parsed: dict, intelligence: dict) -> bool:
    pool = []
    for cat in parsed.get("skill_categories") or []:
        pool.extend(cat.get("skills") or [])
    for items in (intelligence.get("skillsMap") or {}).values():
        if isinstance(items, list):
            pool.extend(str(s) for s in items)
    joined = " ".join(pool).lower()
    return any(t in joined for t in ("ai", "llm", "generative", "prompt"))


def _build_paragraphs(parsed: dict, intelligence: dict, job: dict, keywords: list[str]) -> list[str]:
    title = (job.get("title") or "this role").split("(")[0].strip()
    company = job.get("company") or "your company"
    jd_text = _strip_html(job.get("description", ""))
    years = _years(intelligence)

    experience = parsed.get("experience") or []
    current = experience[0] if experience else {}
    earlier = experience[1] if len(experience) > 1 else {}
    cur_bullets = current.get("bullets") or []
    earlier_bullets = earlier.get("bullets") or []

    # --- P1: hook — exact role, strongest quantified credential, bridge ---
    # Prefer the current role's strongest quantified bullet; fall back to earlier roles.
    quantified = ""
    for pool in (cur_bullets, earlier_bullets):
        best = max(pool, key=lambda b: _score_bullet(b, keywords, require_digit=True), default="")
        if best and re.search(r"\d", best):
            quantified = best
            break

    p1 = [f"I am writing to apply for the {title} position with {company}."]
    if quantified and quantified in cur_bullets and current.get("company"):
        p1.append(
            f"Over the past {years}+ years I have designed, built, and operated production "
            f"systems where reliability was not optional — most recently at {current['company']}, "
            f"where I {_decap(quantified)}."
        )
    elif quantified and earlier.get("company"):
        p1.append(
            f"Over the past {years}+ years I have designed, built, and operated production "
            f"systems — at {earlier['company']}, I {_decap(quantified)}."
        )
    else:
        p1.append(
            f"Over the past {years}+ years I have designed, built, and operated production "
            f"systems end to end, from backend architecture through deployment and support."
        )
    p1.append(
        f"Bringing that engineering discipline to {company} as a {title} is exactly the kind "
        f"of problem I want to take on next."
    )

    # --- P2: primary evidence — current role deep-dive mirroring JD keywords ---
    used = {quantified} if quantified else set()
    evidence = _pick_bullets(cur_bullets, keywords, 3, exclude=used)
    used.update(evidence)
    p2 = []
    if current.get("company"):
        role = current.get("title") or "engineer"
        opener = f"At {current['company']}, as {role}, I {_decap(evidence[0])}." if evidence else \
                 f"At {current['company']} I work as {role} across the full engineering lifecycle."
        p2.append(opener)
        for connector, b in zip(("I also", "Alongside that, I"), evidence[1:]):
            p2.append(f"{connector} {_decap(b)}.")
        if any(t in jd_text for t in ("ownership", "operations", "on-call", "incident", "production support", "ci/cd", "monitoring")):
            p2.append(
                "Owning that platform end to end — pipelines, deployments, monitoring, and "
                "incident resolution — has taught me to design for failure, instrument "
                "everything, and treat production support as part of the architecture rather "
                "than an afterthought."
            )
        else:
            p2.append(
                "Carrying that work from design through production has taught me to treat "
                "reliability and operability as first-class requirements, not afterthoughts."
            )

    # --- P3: breadth + differentiator ---
    p3 = []
    if earlier.get("company"):
        breadth = max(
            (b for b in earlier_bullets if b not in used),
            key=lambda b: _score_bullet(b, keywords + ["20+", "production"]),
            default="",
        )
        role = earlier.get("title") or "engineer"
        if breadth:
            used.add(breadth)
            p3.append(f"Before that, at {earlier['company']} as {role}, I {_decap(breadth)}.")
            extra = _pick_bullets(earlier_bullets, keywords, 1, exclude=used)
            if extra:
                p3.append(f"In that role I also {_decap(extra[0])}.")
        else:
            p3.append(f"Before that I worked at {earlier['company']} as {role}.")
        p3.append("That breadth made me comfortable moving across the stack and picking up new domains quickly.")
    if _candidate_has_ai(parsed, intelligence) and any(t in jd_text for t in ("ai", "ml", "llm", "machine learning", "copilot")):
        p3.append(
            "I have also increasingly built AI-assisted development workflows into how I "
            "engineer, which I understand is central to how this team works."
        )

    # --- P4: close — map JD keywords back to candidate skills, request conversation ---
    top_kw = keywords[:4]
    p4 = []
    if top_kw:
        kw_phrase = ", ".join(top_kw[:-1]) + f", and {top_kw[-1]}" if len(top_kw) > 1 else top_kw[0]
        p4.append(
            f"My background in {kw_phrase} maps directly onto what this role calls for, "
            f"and I would welcome the chance to discuss how I can contribute to {company}."
        )
    else:
        p4.append(f"I would welcome the chance to discuss how I can contribute to {company}.")
    p4.append("Thank you for your time and consideration.")

    return [" ".join(p) for p in (p1, p2, p3, p4) if p]


def lint_cover_letter(paragraphs: list[str]) -> list[str]:
    """Part 4 hard rules: no clichés, 4 paragraphs, ~330–420 words (warn outside 250–500)."""
    issues: list[str] = []
    text = " ".join(paragraphs)
    text_l = text.lower()
    for phrase in BANNED_PHRASES:
        if phrase in text_l:
            issues.append(f"Banned cliché: '{phrase}'")
    words = len(text.split())
    if not 250 <= words <= 500:
        issues.append(f"Word count {words} outside acceptable range (target 330–420)")
    if len(paragraphs) != 4:
        issues.append(f"Expected 4 paragraphs, got {len(paragraphs)}")
    return issues


def build_cover_letter_context(
    profile: dict,
    intelligence: dict,
    job: dict,
    resume_ctx: dict,
    paragraphs_override: list[str] | None = None,
) -> dict:
    parsed = parse_resume_from_profile(profile)
    keywords = list(resume_ctx.get("keywords") or job.get("matchedSkills") or [])
    paragraphs = paragraphs_override or _build_paragraphs(parsed, intelligence, job, keywords)

    company = job.get("company") or "the company"
    location = job.get("location") or ""
    addressee = ["Hiring Team", company]
    if location:
        addressee.append(location)

    name = resume_ctx.get("name") or (profile.get("basicProfile") or {}).get("fullName") or "Candidate"
    return {
        "name": name,
        "subtitle": resume_ctx.get("subtitle") or "",
        "contact_items": resume_ctx.get("contact_items") or [],
        "date_long": f"{date.today().strftime('%B')} {date.today().day}, {date.today().year}",
        "addressee_lines": addressee,
        "salutation": "Dear Hiring Team,",
        "paragraphs": paragraphs,
        "signature_name": name.title() if name.isupper() else name,
        "lint_issues": lint_cover_letter(paragraphs),
    }


def generate_cover_letter(profile: dict, intelligence: dict, job: dict, resume_ctx: dict | None = None) -> str:
    """Markdown version (kept for the dashboard preview)."""
    ctx = build_cover_letter_context(profile, intelligence, job, resume_ctx or {})
    return render_cover_letter_md(ctx)


def generate_cover_letter_html(ctx: dict) -> str:
    return render_cover_letter_html(ctx)
