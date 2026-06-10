"""Bridge to the locally installed Claude Code CLI (subscription login, no API key).

Two modes:
- complete()/complete_json(): plain headless text generation (no tools).
- analyze_repo(): agentic run with read-only tools inside a repo, so Claude can
  walk the code and git history itself.

Every caller must handle (None, reason) gracefully — the pipeline falls back to
rule-based generation when Claude Code is missing or not logged in.
"""

from __future__ import annotations

import json
import logging
import re
import shutil
import subprocess

logger = logging.getLogger(__name__)

READONLY_TOOLS = [
    "Read", "Grep", "Glob", "LS",
    "Bash(git log:*)", "Bash(git shortlog:*)", "Bash(git diff:*)",
    "Bash(git show:*)", "Bash(git branch:*)", "Bash(ls:*)", "Bash(wc:*)",
    "Bash(find:*)", "Bash(cat:*)",
]

_availability: dict | None = None


def availability() -> dict:
    """{'available': bool, 'reason': str} — cached for the process lifetime."""
    global _availability
    if _availability is not None:
        return _availability
    if not shutil.which("claude"):
        _availability = {"available": False, "reason": "claude CLI not installed (npm i -g @anthropic-ai/claude-code)"}
        return _availability
    try:
        proc = subprocess.run(
            ["claude", "-p", "--output-format", "json"],
            input="Reply with exactly: OK",
            capture_output=True, text=True, timeout=60,
        )
        data = json.loads(proc.stdout or "{}")
        if data.get("is_error"):
            reason = data.get("result") or "Claude Code returned an error"
            _availability = {"available": False, "reason": reason}
        else:
            _availability = {"available": True, "reason": ""}
    except Exception as exc:
        _availability = {"available": False, "reason": str(exc)}
    if not _availability["available"]:
        logger.warning("Claude Code unavailable: %s", _availability["reason"])
    return _availability


def is_available() -> bool:
    return availability()["available"]


def _run(args: list[str], prompt: str, timeout: int, cwd: str | None = None) -> tuple[str | None, str]:
    try:
        proc = subprocess.run(
            ["claude", "-p", "--output-format", "json", *args],
            input=prompt, capture_output=True, text=True, timeout=timeout, cwd=cwd,
        )
    except subprocess.TimeoutExpired:
        return None, f"Claude Code timed out after {timeout}s"
    except Exception as exc:
        return None, str(exc)
    try:
        data = json.loads(proc.stdout or "{}")
    except json.JSONDecodeError:
        return None, f"Unparseable Claude Code output: {proc.stdout[:200]}"
    if data.get("is_error"):
        return None, data.get("result") or "Claude Code error"
    return data.get("result") or "", ""


def complete(prompt: str, *, timeout: int = 240) -> tuple[str | None, str]:
    """Plain text generation. Returns (text, '') or (None, reason)."""
    if not is_available():
        return None, availability()["reason"]
    return _run(["--tools", ""], prompt, timeout)


def extract_json(text: str):
    """Pull the first JSON object out of a model response (handles ``` fences)."""
    if not text:
        return None
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.S)
    candidates = [fenced.group(1)] if fenced else []
    brace = text.find("{")
    if brace >= 0:
        candidates.append(text[brace: text.rfind("}") + 1])
    for c in candidates:
        try:
            return json.loads(c)
        except json.JSONDecodeError:
            continue
    return None


def complete_json(prompt: str, *, timeout: int = 240) -> tuple[dict | None, str]:
    """Generation that must return a JSON object. Returns (dict, '') or (None, reason)."""
    text, err = complete(prompt, timeout=timeout)
    if text is None:
        return None, err
    data = extract_json(text)
    if data is None:
        return None, f"No JSON object in response: {text[:200]}"
    return data, ""


def analyze_repo(repo_path: str, prompt: str, *, timeout: int = 600) -> tuple[dict | None, str]:
    """Agentic repo analysis: Claude Code explores the repo with read-only tools.

    The prompt must ask for a JSON object as the final answer.
    """
    if not is_available():
        return None, availability()["reason"]
    args = ["--allowed-tools", ",".join(READONLY_TOOLS)]
    text, err = _run(args, prompt, timeout, cwd=repo_path)
    if text is None:
        return None, err
    data = extract_json(text)
    if data is None:
        return None, f"No JSON object in response: {text[:200]}"
    return data, ""
