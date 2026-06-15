#!/usr/bin/env bash
# Lightweight Python setup for Render demo (Chromium only, no Firefox / JustHireMe).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

mkdir -p external

if [ ! -d "external/JobSpy" ]; then
  echo "Cloning JobSpy..."
  git clone --depth 1 https://github.com/speedyapply/JobSpy external/JobSpy
fi

if [ ! -d "external/career-ops" ]; then
  echo "Cloning Career Ops..."
  git clone --depth 1 https://github.com/santifer/career-ops external/career-ops
fi

if [ ! -d ".venv" ]; then
  echo "Creating virtual environment..."
  python3 -m venv .venv
fi

# shellcheck disable=SC1091
source .venv/bin/activate

pip install --upgrade pip
pip install -r requirements.txt

echo "Installing Playwright Chromium (PDF export only)..."
playwright install chromium

echo "Render demo setup complete."
