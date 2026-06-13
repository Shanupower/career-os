#!/usr/bin/env bash
# Root setup wrapper — installs Node + Python deps and Playwright browsers.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
exec bash "$ROOT/scripts/setup.sh"
