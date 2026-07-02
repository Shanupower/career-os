#!/usr/bin/env python3
"""Mine the candidate's projects for skills and quantifiable evidence.

For every repo in profile.repositories (local paths + GitHub links), Claude Code
runs *inside* the repo with read-only tools — it reads the code, walks the commit
history, and returns structured findings. Deterministic git stats are collected
as a baseline even when Claude is unavailable.

Outputs:
- data/intelligence/project-intelligence.json (per-project findings + aggregate)
- merges new skills/highlights/keywords into data/intelligence/candidate-intelligence.json
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "python" / "llm"))

import claude_code  # noqa: E402

PROFILE_PATH = ROOT / "data/profile/candidate-profile.json"
INTELLIGENCE_PATH = ROOT / "data/intelligence/candidate-intelligence.json"
OUTPUT_PATH = ROOT / "data/intelligence/project-intelligence.json"
REPO_CACHE = ROOT / "data/cache/repos"

EXT_LANG = {
    ".py": "Python", ".js": "JavaScript", ".jsx": "JavaScript", ".ts": "TypeScript",
    ".tsx": "TypeScript", ".java": "Java", ".go": "Go", ".rs": "Rust", ".rb": "Ruby",
    ".php": "PHP", ".sql": "SQL", ".dart": "Dart/Flutter", ".vue": "Vue.js",
    ".swift": "Swift", ".kt": "Kotlin", ".sol": "Solidity",
}

ANALYSIS_PROMPT = """You are analyzing a software project repository to build a factual \
candidate intelligence report. Explore the codebase and the git history (git log, \
git shortlog -sn, file structure, READMEs, manifests like package.json/requirements.txt).

Extract ONLY what you can verify in this repo. Never guess or inflate.

Return ONLY a JSON object (no prose) with this exact shape:
{
  "name": "<project name>",
  "summary": "<1-2 sentence factual description of what it does>",
  "domain": "<e.g. fintech, ecommerce, media, devtools>",
  "techStack": ["<frameworks/languages/databases/infra actually used>"],
  "skills": [{"skill": "<specific skill>", "evidence": "<file/feature/commit that proves it>"}],
  "quantifiables": ["<metric-bearing facts: e.g. '120 commits over 14 months', '40+ API endpoints', '12 database models'>"],
  "highlights": ["<1-3 strongest resume-worthy accomplishment lines, factual, with numbers where the repo supports them>"]
}"""


def _git(repo: Path, *args: str) -> str:
    try:
        out = subprocess.run(["git", "-C", str(repo), *args],
                             capture_output=True, text=True, timeout=60)
        return out.stdout.strip()
    except Exception:
        return ""


def git_stats(repo: Path) -> dict:
    """Deterministic baseline stats — works without Claude."""
    commits = _git(repo, "rev-list", "--count", "HEAD") or "0"
    first = _git(repo, "log", "--reverse", "--format=%as", "-1")
    last = _git(repo, "log", "--format=%as", "-1")
    files = _git(repo, "ls-files").splitlines()
    langs = Counter(EXT_LANG[Path(f).suffix] for f in files if Path(f).suffix in EXT_LANG)
    return {
        "commits": int(commits) if commits.isdigit() else 0,
        "firstCommit": first,
        "lastCommit": last,
        "fileCount": len(files),
        "languages": [lang for lang, _ in langs.most_common(6)],
    }


def clone_github(url: str) -> Path | None:
    name = re.sub(r"\.git$", "", url.rstrip("/").split("/")[-1]) or "repo"
    dest = REPO_CACHE / name
    if (dest / ".git").exists():
        subprocess.run(["git", "-C", str(dest), "fetch", "--quiet"], capture_output=True, timeout=120)
        return dest
    REPO_CACHE.mkdir(parents=True, exist_ok=True)
    proc = subprocess.run(
        ["git", "clone", "--filter=blob:none", "--single-branch", url, str(dest)],
        capture_output=True, text=True, timeout=300,
    )
    if proc.returncode != 0:
        print(f"  clone failed for {url}: {proc.stderr.strip()[:200]}", file=sys.stderr)
        return None
    return dest


def scan_repo(repo: Path, source: str, use_llm: bool) -> dict:
    print(f"Scanning {repo.name} ({source}) ...")
    stats = git_stats(repo)
    entry = {
        "name": repo.name,
        "source": source,
        "path": str(repo),
        "gitStats": stats,
        "analyzedBy": "git-stats",
    }
    if use_llm:
        analysis, err = claude_code.analyze_repo(str(repo), ANALYSIS_PROMPT)
        if analysis:
            entry.update({k: v for k, v in analysis.items() if k != "name"})
            entry["name"] = analysis.get("name") or repo.name
            entry["analyzedBy"] = "claude-code"
        else:
            print(f"  Claude analysis failed: {err}", file=sys.stderr)
    if "techStack" not in entry:
        entry["techStack"] = stats["languages"]
    if "quantifiables" not in entry:
        q = []
        if stats["commits"]:
            span = f" ({stats['firstCommit']} to {stats['lastCommit']})" if stats["firstCommit"] else ""
            q.append(f"{stats['commits']} commits{span}")
        if stats["fileCount"]:
            q.append(f"{stats['fileCount']} tracked files")
        entry["quantifiables"] = q
    return entry


def aggregate(projects: list[dict]) -> dict:
    skills: dict[str, str] = {}
    quantifiables: list[str] = []
    domains: list[str] = []
    highlights: list[str] = []
    tech: list[str] = []
    for p in projects:
        for s in p.get("skills") or []:
            if isinstance(s, dict) and s.get("skill"):
                skills.setdefault(s["skill"], s.get("evidence", ""))
        quantifiables.extend(p.get("quantifiables") or [])
        highlights.extend(p.get("highlights") or [])
        if p.get("domain"):
            domains.append(p["domain"])
        tech.extend(p.get("techStack") or [])
    return {
        "skills": [{"skill": k, "evidence": v} for k, v in skills.items()],
        "techStack": sorted(set(tech)),
        "quantifiables": quantifiables,
        "highlights": highlights,
        "domains": sorted(set(domains)),
    }


def merge_into_intelligence(agg: dict) -> bool:
    if not INTELLIGENCE_PATH.exists():
        return False
    intel = json.loads(INTELLIGENCE_PATH.read_text(encoding="utf-8"))

    def extend_unique(target: list, items: list) -> list:
        seen = {str(x).lower() for x in target}
        for item in items:
            if str(item).lower() not in seen:
                target.append(item)
                seen.add(str(item).lower())
        return target

    skills_map = intel.setdefault("skillsMap", {})
    skill_names = [s["skill"] for s in agg["skills"]]
    skills_map["projectSkills"] = extend_unique(skills_map.get("projectSkills") or [], skill_names + agg["techStack"])

    exp_map = intel.setdefault("experienceMap", {})
    exp_map["projectHighlights"] = extend_unique(exp_map.get("projectHighlights") or [], agg["highlights"] + agg["quantifiables"])
    exp_map["domainsWorkedIn"] = extend_unique(exp_map.get("domainsWorkedIn") or [], agg["domains"])

    bank = intel.setdefault("atsKeywordBank", {})
    bank["highPriority"] = extend_unique(bank.get("highPriority") or [], agg["techStack"])
    intel["resumeKeywords"] = extend_unique(intel.get("resumeKeywords") or [], skill_names)

    intel.setdefault("meta", {})["projectScanAt"] = datetime.now(timezone.utc).isoformat()
    INTELLIGENCE_PATH.write_text(json.dumps(intel, indent=2), encoding="utf-8")
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description="Scan candidate projects with Claude Code.")
    parser.add_argument("--no-llm", action="store_true", help="Git stats only, skip Claude analysis")
    parser.add_argument("--repo", action="append", help="Extra local repo path or GitHub URL (repeatable)")
    args = parser.parse_args()

    if not PROFILE_PATH.exists():
        print(f"Missing {PROFILE_PATH}", file=sys.stderr)
        return 1
    profile = json.loads(PROFILE_PATH.read_text(encoding="utf-8"))
    repos_cfg = profile.get("repositories") or {}
    local_paths = [p for p in (repos_cfg.get("localRepoPaths") or []) if p and p.strip()]
    github_links = [u for u in (repos_cfg.get("githubLinks") or []) if u and u.strip()]
    for extra in args.repo or []:
        (github_links if extra.startswith("http") else local_paths).append(extra)

    if not local_paths and not github_links:
        print("No repositories configured. Add localRepoPaths/githubLinks in the "
              "onboarding Repositories step, or pass --repo <path-or-url>.", file=sys.stderr)
        return 1

    use_llm = not args.no_llm and claude_code.is_available()
    if not args.no_llm and not use_llm:
        print(f"Claude Code unavailable ({claude_code.availability()['reason']}); "
              f"falling back to git stats only.", file=sys.stderr)

    projects = []
    for p in local_paths:
        repo = Path(p).expanduser()
        if (repo / ".git").exists():
            projects.append(scan_repo(repo, "local", use_llm))
        else:
            print(f"  skipped {p}: not a git repo", file=sys.stderr)
    for url in github_links:
        repo = clone_github(url)
        if repo:
            projects.append(scan_repo(repo, url, use_llm))

    if not projects:
        print("No scannable repositories found.", file=sys.stderr)
        return 1

    agg = aggregate(projects)
    doc = {
        "meta": {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "analyzedBy": "claude-code" if use_llm else "git-stats",
            "projectCount": len(projects),
        },
        "projects": projects,
        "aggregate": agg,
    }
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(doc, indent=2), encoding="utf-8")
    merged = merge_into_intelligence(agg)
    print(f"Scanned {len(projects)} project(s) -> {OUTPUT_PATH.relative_to(ROOT)}"
          f"{' (intelligence merged)' if merged else ''}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
