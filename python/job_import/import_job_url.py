#!/usr/bin/env python3
"""Import jobs into the dashboard from pasted URLs.

For each URL: fetch the page, extract the JD (schema.org JobPosting JSON-LD when
present, heuristics otherwise, Claude Code as a smart fallback parser), normalize
to the canonical job shape, append to discovered_jobs.json, score it against
candidate intelligence, and merge into scored_jobs.json WITHOUT touching other
jobs (preserves existing tailoredAssets).

Prints a JSON summary to stdout for the Node wrapper.
"""

from __future__ import annotations

import argparse
import hashlib
import html as html_lib
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "python" / "llm"))
sys.path.insert(0, str(ROOT / "python" / "job_scoring"))

import claude_code  # noqa: E402
from scorer import score_jobs  # noqa: E402

DISCOVERED_PATH = ROOT / "data/jobs/discovered_jobs.json"
SCORED_PATH = ROOT / "data/jobs/scored_jobs.json"
INTELLIGENCE_PATH = ROOT / "data/intelligence/candidate-intelligence.json"

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0 Safari/537.36")

EXTRACT_PROMPT = """Extract the job posting from this web page text. Return ONLY a JSON \
object: {{"title": "", "company": "", "location": "", "employmentType": "", \
"salary": "", "isRemote": false, "description": "<the full job description text>"}}. \
Use empty strings for unknown fields. Do not invent information.

PAGE TEXT:
{text}"""


def _job_id(url: str) -> str:
    return hashlib.sha256(url.encode("utf-8")).hexdigest()[:16]


def _clean_html_text(value: str) -> str:
    text = BeautifulSoup(html_lib.unescape(value or ""), "html.parser").get_text(" ")
    return re.sub(r"\s+", " ", text).strip()


def _from_json_ld(soup: BeautifulSoup) -> dict | None:
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
        except (json.JSONDecodeError, TypeError):
            continue
        candidates = data if isinstance(data, list) else data.get("@graph", [data]) if isinstance(data, dict) else []
        for item in candidates:
            if not isinstance(item, dict) or item.get("@type") not in ("JobPosting", ["JobPosting"]):
                continue
            org = item.get("hiringOrganization") or {}
            loc = item.get("jobLocation") or {}
            if isinstance(loc, list):
                loc = loc[0] if loc else {}
            addr = (loc.get("address") or {}) if isinstance(loc, dict) else {}
            location = ", ".join(filter(None, [addr.get("addressLocality"), addr.get("addressRegion"), addr.get("addressCountry") if isinstance(addr.get("addressCountry"), str) else None]))
            salary = ""
            base = item.get("baseSalary") or {}
            if isinstance(base, dict):
                val = base.get("value") or {}
                if isinstance(val, dict) and (val.get("minValue") or val.get("value")):
                    salary = f"{val.get('minValue') or val.get('value')}-{val.get('maxValue') or ''} {base.get('currency') or ''}".strip("- ")
            return {
                "title": _clean_html_text(item.get("title") or ""),
                "company": _clean_html_text(org.get("name") or "" if isinstance(org, dict) else str(org)),
                "location": location,
                "description": _clean_html_text(item.get("description") or ""),
                "datePosted": item.get("datePosted") or "",
                "employmentType": str(item.get("employmentType") or "").lower(),
                "salary": salary,
                "isRemote": bool(item.get("jobLocationType") == "TELECOMMUTE"),
            }
    return None


ATS_ORG_PATTERNS = [
    r"greenhouse\.io/(?:embed/job_app\?for=)?([\w-]+)",
    r"jobs\.lever\.co/([\w-]+)",
    r"jobs\.ashbyhq\.com/([\w-]+)",
    r"([\w-]+)\.breezy\.hr",
    r"apply\.workable\.com/([\w-]+)",
    r"([\w-]+)\.bamboohr\.com",
    r"jobs\.smartrecruiters\.com/([\w-]+)",
]


def _company_from_url(url: str) -> str:
    for pat in ATS_ORG_PATTERNS:
        m = re.search(pat, url, re.I)
        if m:
            return m.group(1).replace("-", " ").title()
    return ""


def _heuristic(soup: BeautifulSoup) -> dict:
    title = ""
    og = soup.find("meta", property="og:title")
    if og and og.get("content"):
        title = og["content"]
    elif soup.title:
        title = soup.title.get_text()
    company = ""
    site_name = soup.find("meta", property="og:site_name")
    if site_name and site_name.get("content"):
        company = site_name["content"]
    for tag in soup(["script", "style", "nav", "header", "footer"]):
        tag.decompose()
    body_text = re.sub(r"\s+", " ", soup.get_text(" ")).strip()
    return {
        "title": _clean_html_text(title)[:150],
        "company": _clean_html_text(company)[:100],
        "location": "",
        "description": body_text[:12000],
        "datePosted": "",
        "employmentType": "",
        "salary": "",
        "isRemote": False,
    }


def _needs_llm(parsed: dict) -> bool:
    return not parsed.get("title") or not parsed.get("company") or len(parsed.get("description") or "") < 200


def extract_job(url: str, use_llm: bool) -> tuple[dict | None, str]:
    try:
        resp = requests.get(url, headers={"User-Agent": UA}, timeout=30)
    except requests.RequestException as exc:
        return None, f"fetch failed: {exc}"
    if resp.status_code >= 400:
        return None, f"fetch failed: HTTP {resp.status_code}"

    soup = BeautifulSoup(resp.text, "html.parser")
    from_ld = _from_json_ld(soup)
    parsed = from_ld or _heuristic(soup)

    if not from_ld:
        # Job-board listing pages (e.g. "Current openings at X") are not postings.
        page_sample = parsed.get("description", "")[:2000].lower()
        if re.search(r"current openings|\d+\s+jobs\b|all open positions", page_sample):
            return None, "this looks like a job listing page — paste the direct posting URL"

    if _needs_llm(parsed) and use_llm:
        page_text = re.sub(r"\s+", " ", BeautifulSoup(resp.text, "html.parser").get_text(" "))[:8000]
        llm, err = claude_code.complete_json(EXTRACT_PROMPT.format(text=page_text), timeout=180)
        if llm:
            for key in ("title", "company", "location", "employmentType", "salary", "description"):
                if llm.get(key) and not parsed.get(key):
                    parsed[key] = llm[key]
            if len(llm.get("description") or "") > len(parsed.get("description") or ""):
                parsed["description"] = llm["description"]
            parsed["isRemote"] = bool(llm.get("isRemote", parsed.get("isRemote")))
        else:
            print(f"  llm extraction skipped: {err}", file=sys.stderr)

    if not parsed.get("company"):
        parsed["company"] = _company_from_url(url)

    if not parsed.get("title") and not parsed.get("description"):
        return None, "could not extract a job posting from this page"

    confidence = "high" if from_ld else ("medium" if parsed.get("company") else "low")
    now = datetime.now(timezone.utc).isoformat()
    return {
        "jobId": _job_id(url),
        "importConfidence": confidence,
        "provider": "manual",
        "source": "url-import",
        "title": parsed.get("title") or "Untitled role",
        "company": parsed.get("company") or "",
        "location": parsed.get("location") or "",
        "site": re.sub(r"^www\.", "", re.sub(r"^https?://", "", url).split("/")[0]),
        "jobUrl": url,
        "datePosted": parsed.get("datePosted") or "",
        "salary": parsed.get("salary") or "",
        "employmentType": parsed.get("employmentType") or "",
        "isRemote": bool(parsed.get("isRemote")),
        "searchTerm": "",
        "searchLocation": "",
        "scrapedAt": now,
        "status": "new",
        "description": parsed.get("description") or "",
    }, ""


def _load_doc(path: Path) -> dict:
    if path.exists():
        try:
            doc = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(doc, dict) and isinstance(doc.get("jobs"), list):
                return doc
        except json.JSONDecodeError:
            pass
    return {"meta": {}, "jobs": []}


def main() -> int:
    parser = argparse.ArgumentParser(description="Import jobs from URLs.")
    parser.add_argument("--url", action="append", default=[], help="Job posting URL (repeatable)")
    parser.add_argument("--no-llm", action="store_true", help="Skip Claude Code extraction fallback")
    args = parser.parse_args()

    urls = [u.strip() for u in args.url if u.strip()]
    if not urls:
        print("No URLs given (use --url)", file=sys.stderr)
        return 1

    use_llm = not args.no_llm and claude_code.is_available()
    imported, errors = [], []
    for url in urls:
        print(f"Importing {url} ...", file=sys.stderr)
        job, err = extract_job(url, use_llm)
        if job is None:
            errors.append({"url": url, "error": err})
        else:
            imported.append(job)

    if imported:
        # Append to discovered jobs (dedupe by jobId, re-import refreshes the entry)
        discovered = _load_doc(DISCOVERED_PATH)
        by_id = {j.get("jobId"): j for j in discovered["jobs"]}
        for job in imported:
            by_id[job["jobId"]] = {**by_id.get(job["jobId"], {}), **job}
        discovered["jobs"] = list(by_id.values())
        discovered.setdefault("meta", {})["lastUrlImportAt"] = datetime.now(timezone.utc).isoformat()
        DISCOVERED_PATH.parent.mkdir(parents=True, exist_ok=True)
        DISCOVERED_PATH.write_text(json.dumps(discovered, indent=2), encoding="utf-8")

        # Score only the new jobs and merge into scored_jobs.json (preserves tailoredAssets)
        if INTELLIGENCE_PATH.exists():
            intelligence = json.loads(INTELLIGENCE_PATH.read_text(encoding="utf-8"))
            scored_new = score_jobs([dict(j) for j in imported], intelligence)
            scored_doc = _load_doc(SCORED_PATH)
            scored_by_id = {j.get("jobId"): j for j in scored_doc["jobs"]}
            for job in scored_new:
                existing = scored_by_id.get(job["jobId"]) or {}
                if existing.get("tailoredAssets"):
                    job["tailoredAssets"] = existing["tailoredAssets"]
                scored_by_id[job["jobId"]] = job
            scored_doc["jobs"] = list(scored_by_id.values())
            scored_doc.setdefault("meta", {})["jobCount"] = len(scored_doc["jobs"])
            scored_doc["meta"]["lastUrlImportAt"] = datetime.now(timezone.utc).isoformat()
            SCORED_PATH.write_text(json.dumps(scored_doc, indent=2), encoding="utf-8")
        else:
            print("No candidate intelligence; imported without scoring", file=sys.stderr)

    print(json.dumps({
        "imported": [{"jobId": j["jobId"], "title": j["title"], "company": j["company"]} for j in imported],
        "errors": errors,
    }))
    return 0 if imported else 1


if __name__ == "__main__":
    raise SystemExit(main())
