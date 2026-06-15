#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

mkdir -p data/profile data/intelligence data/jobs data/resumes data/outreach \
  data/cache data/analytics data/audits data/interviews

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

exec npm run start:server
