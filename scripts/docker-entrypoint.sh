#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

mkdir -p data/profile data/intelligence data/jobs data/resumes data/outreach \
  data/cache data/analytics data/audits data/interviews

seed_demo_file() {
  local src="$1"
  local dest="$2"
  if [ -f "$src" ]; then
    cp -f "$src" "$dest"
  fi
}

if [ "${DEMO_MODE:-0}" = "1" ] || [ "${DEMO_MODE:-}" = "true" ]; then
  seed_demo_file data/examples/candidate-profile.example.json data/profile/candidate-profile.json
  seed_demo_file data/examples/candidate-intelligence.example.json data/intelligence/candidate-intelligence.json
  seed_demo_file data/examples/scored_jobs.example.json data/jobs/scored_jobs.json
else
  seed_if_missing() {
    local src="$1"
    local dest="$2"
    if [ ! -f "$dest" ] && [ -f "$src" ]; then
      cp "$src" "$dest"
    fi
  }
  seed_if_missing data/examples/candidate-profile.example.json data/profile/candidate-profile.json
  seed_if_missing data/examples/candidate-intelligence.example.json data/intelligence/candidate-intelligence.json
  seed_if_missing data/examples/scored_jobs.example.json data/jobs/scored_jobs.json
fi

exec npm run start:server
