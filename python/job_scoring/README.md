# Job Scoring (Module 4)

Deterministic job scoring against `candidate-intelligence.json`.

## Run

```bash
source .venv/bin/activate
python python/job_scoring/run_scoring.py
```

## Input / output

- Input: `data/intelligence/candidate-intelligence.json`, `data/jobs/discovered_jobs.json`
- Output: `data/jobs/scored_jobs.json`

## Weights

Uses `scoringWeights` from intelligence (default 25/25/15/15/10/10).
