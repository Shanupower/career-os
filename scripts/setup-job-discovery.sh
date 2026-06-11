#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

mkdir -p external

if [ ! -d "external/JobSpy" ]; then
  echo "Cloning JobSpy..."
  git clone https://github.com/speedyapply/JobSpy external/JobSpy
fi

if [ ! -d "external/JustHireMe" ]; then
  echo "Cloning JustHireMe..."
  git clone https://github.com/vasu-devs/JustHireMe external/JustHireMe
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

echo "Installing Playwright Chromium (for PDF resume export)..."
playwright install chromium

echo "Installing Playwright Firefox (for LinkedIn contact discovery)..."
playwright install firefox

echo ""
echo "Setup Complete"
echo ""
echo "Activate:"
echo "  source .venv/bin/activate"
echo ""
echo "JobSpy-only (Module 3):"
echo "  python python/job_discovery/run_jobspy.py --country India --locations \"Bangalore, India\" \"Hyderabad, India\" \"Mumbai, India\" \"Remote\""
echo ""
echo "Multi-provider (Module 3.1):"
echo "  python python/job_discovery/run_discovery.py --mock"
echo "  python python/job_discovery/run_discovery.py --providers india"
echo "  python python/job_discovery/run_discovery.py --providers ats"
echo "  python python/job_discovery/run_discovery.py --providers ats-india --country India"
echo "  python python/job_discovery/run_discovery.py --providers all --country India"
echo ""
echo "Scoring & tailoring (Modules 4–5):"
echo "  npm run score:jobs"
echo "  npm run tailor:resumes -- --limit 5"
