# Job Discovery (Module 3)

Python pipeline that uses [JobSpy](https://github.com/speedyapply/JobSpy) to discover jobs from Module 2 search strategy.

## Prerequisites

- Python 3.10+
- Node.js project root at `job-automation-dashboard`

## Setup

From project root:

```bash
npm run setup:jobspy
```

Or manually:

```bash
bash scripts/setup-jobspy.sh
source .venv/bin/activate
```

## Input

Save exported intelligence to:

```
data/intelligence/candidate-intelligence.json
```

Required fields: `searchStrategy.jobSpySearchTerms`, `searchStrategy.locationFilters`, `searchStrategy.remoteFilters`.

## Run discovery

```bash
source .venv/bin/activate
python python/job_discovery/run_jobspy.py
```

## Output

```
data/jobs/raw_jobs.csv
data/jobs/normalized_jobs.json
data/jobs/discovered_jobs.json
```

Import `discovered_jobs.json` in the React Job Discovery dashboard.

## Module 3.1 — Multi-Provider Discovery

Setup (JobSpy + JustHireMe reference + Playwright):

```bash
npm run setup:jobs
source .venv/bin/activate
```

Run multi-provider discovery:

```bash
python python/job_discovery/run_discovery.py --mock
python python/job_discovery/run_discovery.py --providers india
python python/job_discovery/run_discovery.py --providers ats
python python/job_discovery/run_discovery.py --providers ats-india --country India
python python/job_discovery/run_discovery.py --providers all --country India
python python/job_discovery/run_discovery.py --providers jobspy,greenhouse,lever
```

Provider groups: `all`, `india`, `ats`, `ats-india`.

The existing JobSpy-only runner is unchanged:

```bash
python python/job_discovery/run_jobspy.py --country India --locations "Bangalore, India" "Hyderabad, India" "Mumbai, India" "Remote"
```

## Notes

- Scraping depends on network access and job board rate limits.
- LinkedIn may fail individually; Indeed/Glassdoor/Google continue.
- The `external/JobSpy` clone is reference-only; runtime uses `pip install python-jobspy`.
- **Indeed / Glassdoor:** pass an exact country name via `--country` (e.g. `India`, `USA`, `UK`). The adapter sets JobSpy `country_indeed` accordingly. Use `--locations` for city/state narrowing (e.g. `Bangalore, India` → `Bangalore, Karnataka` + `country_indeed=India`). Remote locations use `is_remote=True` with country scoping only.
