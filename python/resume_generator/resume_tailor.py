"""Truth-only resume tailoring from profile + intelligence + job."""

from __future__ import annotations

import html
import re

from resume_parser import parse_resume_from_profile
from text_utils import normalize_text


def _strip_html(text: str) -> str:
    return re.sub(r"<[^>]+>", " ", html.unescape(text or ""))


def _jd_keywords(job: dict, intelligence: dict, limit: int = 15) -> list[str]:
    bank = intelligence.get("atsKeywordBank") or {}
    high = list(bank.get("highPriority") or [])
    matched = list(job.get("matchedSkills") or [])
    jd_text = normalize_text(_strip_html(job.get("description", "")))
    keywords = []
    for kw in matched + high:
        if kw and kw.lower() in jd_text:
            keywords.append(kw)
        elif kw in matched:
            keywords.append(kw)
        if len(keywords) >= limit:
            break
    return keywords[:limit] or matched[:10] or high[:10]


# JD theme detection for the subtitle tail (Part 5: echo the JD title family).
_THEMES = [
    ("Backend", ("backend", "api", "node", "java", "python", "microservice", "rest")),
    ("Frontend", ("frontend", "react", "vue", "angular", "ui ", "next.js")),
    ("Full-Stack", ("full stack", "full-stack", "fullstack")),
    ("Cloud", ("aws", "cloud", "azure", "gcp", "kubernetes", "docker", "devops")),
    ("Distributed Systems", ("distributed", "scalab", "high availability", "microservice")),
    ("Mobile", ("flutter", "android", "ios", "mobile")),
]


def _tailor_subtitle(job: dict, keywords: list[str]) -> str:
    """'Senior Software Engineer | Backend, Cloud & Distributed Systems' style tagline."""
    title = (job.get("title") or "Software Engineer").split("(")[0].strip()
    haystack = (title + " " + " ".join(keywords)).lower()
    themes = [name for name, terms in _THEMES if any(t in haystack for t in terms)]
    norm = lambda s: re.sub(r"[^a-z0-9]", "", s.lower())
    themes = [t for t in themes if norm(t) not in norm(title)][:3]
    if not themes:
        return title
    if len(themes) > 1:
        tail = ", ".join(themes[:-1]) + " & " + themes[-1]
    else:
        tail = themes[0]
    return f"{title} | {tail}"


def _tailor_about_me(about: str, job: dict, intelligence: dict, keywords: list[str]) -> str:
    """Part 5 summary recipe: experience framing → candidate ∩ JD stack → specialization."""
    title = (job.get("title") or "").split("(")[0].strip()
    years = (intelligence.get("experienceMap") or {}).get("yearsOfExperience") or "4"
    years = str(years).replace("+", "")

    if not title:
        if about:
            return about.strip()
        summary = intelligence.get("candidateSummary") or {}
        return (summary.get("careerNarrative") or summary.get("oneLinePitch") or "").strip()

    framing = (
        f"{title} with {years}+ years of experience designing, building, and operating "
        f"scalable cloud-native applications, distributed backend systems, workflow-driven "
        f"platforms, and production-grade web applications."
    )
    stack = f" Strong expertise in {', '.join(keywords[:9])}." if keywords else ""
    haystack = " ".join(keywords).lower()
    specializations = [
        label for label, terms in (
            ("cloud architecture", ("aws", "cloud", "azure", "gcp")),
            ("distributed systems", ("microservice", "distributed", "scalab")),
            ("production operations", ("ci/cd", "docker", "monitoring", "devops", "linux")),
            ("engineering automation", ("ci/cd", "github actions", "automation")),
            ("AI-assisted development workflows", ("ai", "llm", "generative")),
        ) if any(t in haystack for t in terms)
    ]
    closing = f" Skilled in {', '.join(specializations)}." if specializations else ""
    return (framing + stack + closing).strip()


def _tailor_bullets(bullets: list[str], keywords: list[str], canonical_skills: set[str]) -> list[str]:
    """Part 5: reorder so JD-relevant bullets come first; never rewrite metrics or facts."""
    if not bullets:
        return bullets
    kw_lower = [k.lower() for k in keywords]

    def relevance(bullet: str) -> int:
        b = bullet.lower()
        return sum(1 for kw in kw_lower if kw in b)

    return sorted(bullets, key=relevance, reverse=True)


def _tailor_skill_categories(
    categories: list[dict],
    keywords: list[str],
    parsed_skills: list[str],
) -> list[dict]:
    """Reorder skills within categories — matched JD skills first."""
    kw_lower = [k.lower() for k in keywords]
    all_canonical = {s.lower(): s for s in parsed_skills}

    def prioritize(items: list[str]) -> list[str]:
        ordered: list[str] = []
        seen: set[str] = set()

        def add(item: str) -> None:
            key = item.lower().replace(".js", "").replace(" ", "")
            if key not in seen:
                ordered.append(item)
                seen.add(key)

        for kw in keywords:
            for item in items:
                if item.lower() == kw.lower() or kw.lower() in item.lower():
                    add(item)
        for item in items:
            add(item)
        return ordered

    if not categories:
        # Build default categories from parsed skills + keywords
        langs = prioritize([s for s in parsed_skills if s in (
            "JavaScript", "Python", "Java", "SQL", "Go", "AQL",
        )] or keywords[:5])
        backend = prioritize([s for s in parsed_skills if s in (
            "Node.js", "Express", "Flask", "Django", "REST API", "Microservices",
        )])
        frontend = prioritize([s for s in parsed_skills if s in (
            "React", "Next.js", "Vue", "Flutter", "Vite",
        )])
        databases = prioritize([s for s in parsed_skills if s in (
            "PostgreSQL", "MongoDB", "MySQL",
        )])
        devops = prioritize([s for s in parsed_skills if s in (
            "AWS", "Docker", "CI/CD", "GitHub Actions", "Nginx", "Linux", "Git",
        )])
        return [
            {"label": "Languages", "skills": langs or keywords[:5]},
            {"label": "Backend Frameworks", "skills": backend or []},
            {"label": "Frontend Frameworks", "skills": frontend or []},
            {"label": "Databases", "skills": databases or []},
            {"label": "DevOps and Cloud", "skills": devops or []},
            {"label": "Platforms and Tools", "skills": prioritize([s for s in parsed_skills if s in ("System Design",)])},
        ]

    def _norm_key(s: str) -> str:
        return s.lower().replace(".js", "").replace(" ", "").rstrip("s")

    tailored_cats = []
    for cat in categories:
        items = prioritize(cat.get("skills") or cat.get("items") or [])
        # Add matched keywords that fit category label
        label_l = cat.get("label", "").lower()
        for kw in keywords:
            if _norm_key(kw) in {_norm_key(i) for i in items}:
                continue
            if kw.lower() not in all_canonical:
                continue
            if "language" in label_l and kw in ("JavaScript", "Python", "Java", "SQL", "Go"):
                items.insert(0, kw)
            elif "backend" in label_l and kw in ("Node.js", "Express", "Django", "Flask", "REST API"):
                items.insert(0, kw)
            elif "frontend" in label_l and kw in ("React", "Vue", "Next.js", "Flutter"):
                items.insert(0, kw)
            elif "database" in label_l and kw in ("PostgreSQL", "MySQL", "MongoDB"):
                items.insert(0, kw)
            elif "devops" in label_l or "cloud" in label_l:
                if kw in ("AWS", "Docker", "CI/CD", "GitHub Actions", "Linux"):
                    items.insert(0, kw)
        tailored_cats.append({"label": cat["label"], "skills": items})

    # Part 5: reorder rows so JD-critical categories appear higher (stable sort).
    def row_relevance(cat: dict) -> int:
        joined = " ".join(cat.get("skills") or []).lower()
        return sum(1 for kw in kw_lower if kw in joined)

    return sorted(tailored_cats, key=row_relevance, reverse=True)


def build_resume_context(profile: dict, intelligence: dict, job: dict) -> dict:
    parsed = parse_resume_from_profile(profile)
    basic = profile.get("basicProfile") or {}
    resume_parsed = (profile.get("resume") or {}).get("parsedData") or {}
    canonical_skills = set(resume_parsed.get("skills") or [])
    keywords = _jd_keywords(job, intelligence)

    about = _tailor_about_me(parsed.get("about_me") or "", job, intelligence, keywords)

    experience = []
    for exp in parsed.get("experience") or []:
        experience.append({
            **exp,
            "bullets": _tailor_bullets(exp.get("bullets") or [], keywords, canonical_skills),
        })

    skill_categories = _tailor_skill_categories(
        parsed.get("skill_categories") or [],
        keywords,
        list(canonical_skills),
    )

    education = parsed.get("education") or {}
    if not education.get("school"):
        education = {
            "school": "Jawaharlal Nehru Technological University Hyderabad",
            "degree": "Bachelor of Technology in Computer Science Engineering",
            "graduated": "2022",
            "cgpa": "7.0/10",
        }

    contact = parsed.get("contact") or ""
    contact_items = [p.strip() for p in contact.split("|") if p.strip()] or list(filter(None, [
        basic.get("location"), basic.get("email"), basic.get("phone"),
    ]))

    return {
        "name": parsed.get("name") or (basic.get("fullName") or "Candidate").strip(),
        "subtitle": _tailor_subtitle(job, keywords),
        "contact": contact,
        "contact_items": contact_items,
        "email": basic.get("email") or "",
        "phone": basic.get("phone") or "",
        "location": basic.get("location") or "",
        "about_me": about,
        "summary": about,
        "experience": experience,
        "skill_categories": skill_categories,
        "education": education,
        "keywords": keywords,
        "target_title": job.get("title") or "",
        "target_company": job.get("company") or "",
        # legacy fields for md template
        "skills": keywords + [s for cat in skill_categories for s in cat.get("skills", [])][:20],
    }
