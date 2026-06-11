#!/usr/bin/env python3
"""Read JSON stdin { rawText }, print mapped profile JSON."""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from linkedin_pdf_mapper import map_linkedin_pdf_text  # noqa: E402


def main() -> None:
    raw = sys.stdin.read()
    payload = json.loads(raw) if raw.strip() else {}
    text = payload.get("rawText") or ""
    result = map_linkedin_pdf_text(text)
    print(json.dumps({"ok": True, "profile": result}))


if __name__ == "__main__":
    main()
