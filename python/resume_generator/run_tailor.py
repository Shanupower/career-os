#!/usr/bin/env python3
"""Generate tailored resume assets for scored jobs."""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from cover_letter_generator import BANNED_PHRASES, build_cover_letter_context, lint_cover_letter  # noqa: E402
from llm_tailor import generate_llm_content, load_project_intelligence  # noqa: E402
from pdf_renderer import render_single_page_pdf  # noqa: E402
from provenance_checker import build_canonical_facts, check_provenance  # noqa: E402
from resume_parser import parse_resume_from_profile  # noqa: E402
from resume_tailor import build_resume_context  # noqa: E402
from docx_renderer import render_resume_docx  # noqa: E402
from json_resume_export import build_json_resume  # noqa: E402
from template_engine import (  # noqa: E402
    render_cover_letter_html,
    render_cover_letter_md,
    render_resume_html,
    render_resume_md,
)

PROFILE_PATH = ROOT / "data/profile/candidate-profile.json"
INTELLIGENCE_PATH = ROOT / "data/intelligence/candidate-intelligence.json"
SCORED_PATH = ROOT / "data/jobs/scored_jobs.json"
RESUMES_ROOT = ROOT / "data/resumes"


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Generate tailored resumes for jobs.")
    p.add_argument("--job-id", help="Single job ID to tailor")
    p.add_argument("--job-ids", help="Comma-separated job IDs to tailor")
    p.add_argument("--priority", help="Filter by priority P1/P2/P3")
    p.add_argument("--apply-recommendation", help="Filter Apply/Maybe/Skip")
    p.add_argument("--apply-only", action="store_true", help="Tailor jobs with applyRecommendation=Apply")
    p.add_argument("--limit", type=int, default=10)
    p.add_argument("--no-llm", action="store_true",
                   help="Skip Claude Code content generation, use rule-based tailoring")
    p.add_argument("--profile", type=Path, default=PROFILE_PATH)
    p.add_argument("--intelligence", type=Path, default=INTELLIGENCE_PATH)
    p.add_argument("--scored", type=Path, default=SCORED_PATH)
    return p.parse_args()


def _select_jobs(jobs: list[dict], args: argparse.Namespace) -> list[dict]:
    selected = jobs
    if args.job_ids:
        ids = {s.strip() for s in args.job_ids.split(",") if s.strip()}
        selected = [j for j in jobs if j.get("jobId") in ids]
    elif args.job_id:
        selected = [j for j in jobs if j.get("jobId") == args.job_id]
    if args.apply_only:
        selected = [j for j in selected if j.get("applyRecommendation") == "Apply"]
    if args.priority:
        selected = [j for j in selected if j.get("priority") == args.priority]
    if args.apply_recommendation:
        selected = [j for j in selected if j.get("applyRecommendation") == args.apply_recommendation]
    if args.job_ids:
        return selected
    return selected[: args.limit]


def _slug(text: str) -> str:
    """'branchX India Private Limited' -> 'BranchXIndiaPrivateLimited'."""
    words = re.findall(r"[A-Za-z0-9]+", text or "")
    parts = []
    for w in words:
        if w.isupper() and len(w) > 1:
            parts.append(w.capitalize())   # SHANMUKH -> Shanmukh
        else:
            parts.append(w[:1].upper() + w[1:])  # branchX -> BranchX
    return "".join(parts) or "Unknown"


def _candidate_skill_pool(ctx: dict, intelligence: dict) -> set[str]:
    pool = set()
    for cat in ctx.get("skill_categories") or []:
        pool.update(s.lower() for s in cat.get("skills") or [])
    for items in (intelligence.get("skillsMap") or {}).values():
        if isinstance(items, list):
            pool.update(str(s).lower() for s in items)
    proj = load_project_intelligence()
    pool.update(t.lower() for t in (proj.get("aggregate") or {}).get("techStack") or [])
    return pool


def _apply_llm_content(ctx: dict, llm: dict, intelligence: dict) -> dict:
    """Overlay LLM-drafted content onto the rule-based context (frozen fields untouched)."""
    merged = dict(ctx)
    merged["subtitle"] = llm["subtitle"].strip()
    merged["summary"] = merged["about_me"] = llm["summary"].strip()

    by_company = {(e.get("company") or "").strip().lower(): e.get("bullets") or []
                  for e in llm.get("experience") or []}
    merged["experience"] = [
        {**exp, "bullets": by_company.get((exp.get("company") or "").strip().lower()) or exp.get("bullets") or []}
        for exp in ctx.get("experience") or []
    ]

    pool = _candidate_skill_pool(ctx, intelligence)
    skills = []
    for cat in llm.get("skills") or []:
        items = [s for s in cat.get("skills") or [] if s.lower() in pool]
        if items:
            skills.append({"label": cat.get("label") or "Skills", "skills": items})
    if skills:
        merged["skill_categories"] = skills

    known_projects = {(p.get("name") or "").lower()
                     for p in load_project_intelligence().get("projects") or []}
    merged["projects"] = [
        p for p in (llm.get("projects") or [])[:2]
        if p.get("name") and p.get("line") and p["name"].lower() in known_projects
    ]
    return merged


def tailor_job(job: dict, profile: dict, intelligence: dict, *, use_llm: bool = True) -> dict:
    job_id = job.get("jobId") or "unknown"
    out_dir = RESUMES_ROOT / job_id
    out_dir.mkdir(parents=True, exist_ok=True)

    ctx = build_resume_context(profile, intelligence, job)
    facts = build_canonical_facts(profile, intelligence)
    content_engine = "rule-based"
    llm_paragraphs = None
    llm_issues: list[str] = []

    title = job.get("title") or "role"
    company = job.get("company") or "company"
    print(f"→ Tailoring: {title} @ {company}", flush=True)

    if use_llm:
        print("  · Claude Code: drafting summary, bullets, cover letter…", flush=True)
        parsed = parse_resume_from_profile(profile)
        llm, reason = generate_llm_content(parsed, intelligence, job)
        if llm is None:
            llm_issues.append(f"llm skipped: {reason}")
        else:
            candidate_ctx = _apply_llm_content(ctx, llm, intelligence)
            paragraphs = [p.strip() for p in llm["cover_letter_paragraphs"]]
            trial_md = render_resume_md(candidate_ctx)
            prov_ok, prov_issues = check_provenance(trial_md + "\n" + "\n".join(paragraphs), facts)
            lint = lint_cover_letter(paragraphs)
            cliches = [p for p in BANNED_PHRASES if p in (trial_md + " ".join(paragraphs)).lower()]
            if prov_ok and not lint and not cliches:
                ctx = candidate_ctx
                llm_paragraphs = paragraphs
                content_engine = "claude-code"
                print("  · Claude Code content accepted", flush=True)
            else:
                llm_issues.append(
                    "llm output rejected, fell back to rule-based: "
                    + "; ".join(prov_issues + lint + [f"cliché '{c}'" for c in cliches])
                )

    if not use_llm or content_engine == "rule-based":
        print("  · Using rule-based content", flush=True)
    print("  · Rendering HTML templates…", flush=True)
    md = render_resume_md(ctx)
    html = render_resume_html({**ctx, "fit": {}})
    cl_ctx = build_cover_letter_context(profile, intelligence, job, ctx, paragraphs_override=llm_paragraphs)
    cover_md = render_cover_letter_md(cl_ctx)

    print("  · Validating provenance (no invented facts)…", flush=True)
    passed, issues = check_provenance(md + "\n" + cover_md, facts)

    # Spec filenames (CAREER_OS_GENERATION_CONTEXT.md Part 6 §4)
    name_slug = _slug(ctx.get("name") or "")
    company_slug = _slug(job.get("company") or "")
    role_slug = _slug((job.get("title") or "").split("(")[0])
    pdf_path = out_dir / f"{name_slug}_{company_slug}_{role_slug}_Resume.pdf"
    cover_pdf_path = out_dir / f"{name_slug}_{company_slug}_{role_slug}_CoverLetter.pdf"

    md_path = out_dir / "tailored_resume.md"
    html_path = out_dir / "tailored_resume.html"
    cover_path = out_dir / "cover_letter.md"
    docx_path = out_dir / f"{name_slug}_{company_slug}_{role_slug}_Resume.docx"
    json_resume_path = out_dir / f"{name_slug}_{company_slug}_{role_slug}_Resume.json"

    md_path.write_text(md, encoding="utf-8")
    html_path.write_text(html, encoding="utf-8")
    cover_path.write_text(cover_md, encoding="utf-8")
    docx_ok = render_resume_docx(ctx, docx_path)
    json_resume_path.write_text(
        json.dumps(build_json_resume(profile, intelligence, ctx), indent=2),
        encoding="utf-8",
    )
    # Purge stale PDFs (legacy name or spec names from outdated company/title slugs)
    (out_dir / "tailored_resume.pdf").unlink(missing_ok=True)
    for stale in [*out_dir.glob("*_Resume.pdf"), *out_dir.glob("*_CoverLetter.pdf")]:
        if stale.name not in (pdf_path.name, cover_pdf_path.name):
            stale.unlink(missing_ok=True)

    print("  · Generating PDFs (Playwright)…", flush=True)
    pdf_ok, resume_pages = render_single_page_pdf(
        lambda fit: render_resume_html({**ctx, "fit": fit}), pdf_path)
    if pdf_ok and resume_pages > 1 and ctx.get("projects"):
        # Trim content before type: drop the optional Projects section and retry.
        ctx = {**ctx, "projects": []}
        pdf_ok, resume_pages = render_single_page_pdf(
            lambda fit: render_resume_html({**ctx, "fit": fit}), pdf_path)
    cover_ok, cover_pages = render_single_page_pdf(
        lambda fit: render_cover_letter_html(cl_ctx), cover_pdf_path)

    validation = {
        "resumePages": resume_pages,
        "coverLetterPages": cover_pages,
        "singlePage": resume_pages == 1 and cover_pages == 1,
        "coverLetterLint": cl_ctx.get("lint_issues") or [],
        "resumeLint": [f"Banned cliché: '{p}'" for p in BANNED_PHRASES if p in md.lower()],
    }

    rel = lambda p: str(p.relative_to(ROOT))
    print(
        f"  ✓ Done [{content_engine}] — resume {resume_pages}p, cover {cover_pages}p",
        flush=True,
    )
    job["tailoredAssets"] = {
        "resumeMd": rel(md_path),
        "resumeHtml": rel(html_path),
        "resumePdf": rel(pdf_path) if pdf_ok else "",
        "resumeDocx": rel(docx_path) if docx_ok else "",
        "resumeJson": rel(json_resume_path),
        "coverLetterMd": rel(cover_path),
        "coverLetterPdf": rel(cover_pdf_path) if cover_ok else "",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "contentEngine": content_engine,
        "llmIssues": llm_issues,
        "provenancePassed": passed,
        "provenanceIssues": issues,
        "validation": validation,
    }
    return job


def main() -> int:
    args = parse_args()
    for path, label in [(args.profile, "profile"), (args.intelligence, "intelligence"), (args.scored, "scored jobs")]:
        if not path.exists():
            print(f"Missing {label}: {path}", file=sys.stderr)
            return 1

    profile = json.loads(args.profile.read_text(encoding="utf-8"))
    intelligence = json.loads(args.intelligence.read_text(encoding="utf-8"))
    scored_doc = json.loads(args.scored.read_text(encoding="utf-8"))
    jobs = scored_doc.get("jobs") or []

    selected = _select_jobs(jobs, args)
    if not selected:
        print("No jobs matched selection criteria", file=sys.stderr)
        return 1

    by_id = {j.get("jobId"): j for j in jobs}
    for job in selected:
        updated = tailor_job(job, profile, intelligence, use_llm=not args.no_llm)
        by_id[updated["jobId"]] = updated
        engine = updated.get("tailoredAssets", {}).get("contentEngine", "?")
        print(f"Tailored [{engine}]: {updated.get('title')} @ {updated.get('company')} → data/resumes/{updated['jobId']}/")

    scored_doc["jobs"] = list(by_id.values())
    args.scored.write_text(json.dumps(scored_doc, indent=2), encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
