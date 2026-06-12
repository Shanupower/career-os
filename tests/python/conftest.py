"""Pytest path setup for Career OS Python modules."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

# Insert in reverse so job_scoring (last) wins import precedence over resume_generator.
for sub in ("job_discovery", "resume_generator", "job_scoring"):
    path = ROOT / "python" / sub
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))
