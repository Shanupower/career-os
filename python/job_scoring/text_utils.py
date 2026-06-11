"""Text helpers for job scoring."""

from __future__ import annotations

import html
import re

TOKEN_RE = re.compile(r"[a-z0-9+#.]+", re.I)


def normalize_text(text: str) -> str:
    if not text:
        return ""
    unescaped = html.unescape(text)
    no_tags = re.sub(r"<[^>]+>", " ", unescaped)
    return re.sub(r"\s+", " ", no_tags).strip().lower()


def tokenize(text: str) -> set[str]:
    return {t.lower() for t in TOKEN_RE.findall(normalize_text(text)) if len(t) > 1}


def contains_any(haystack: str, needles: list[str]) -> bool:
    h = normalize_text(haystack)
    return any(n and normalize_text(n) in h for n in needles)
