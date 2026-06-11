"""Resolve ATS company config paths (companies/ preferred, config/ fallback)."""

from __future__ import annotations

from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[3]
_COMPANIES_DIR = _REPO_ROOT / "companies"
_LEGACY_DIR = Path(__file__).resolve().parent.parent / "config"


def resolve_config(filename: str, legacy_filename: str | None = None) -> Path:
    """Return companies/{filename} if present, else config/{legacy_filename}."""
    primary = _COMPANIES_DIR / filename
    if primary.exists():
        return primary
    return _LEGACY_DIR / (legacy_filename or filename)
