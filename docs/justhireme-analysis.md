# JustHireMe — Architectural Reference Analysis

**Repo:** `external/JustHireMe` (https://github.com/vasu-devs/JustHireMe)  
**Purpose:** Personal-use reference for Module 3.1+ discovery architecture. No code merged.

---

## 1. Does it contain working job scrapers?

**Yes — partially.** JustHireMe splits discovery into two tiers:

| Tier | Reliability | Examples |
|------|-------------|----------|
| **API/RSS adapters** | High — public endpoints, unit tests | Greenhouse, Lever, Ashby, Workable (`backend/discovery/sources/ats.py`); RemoteOK, Remotive, Jobicy (`rss.py`); HN Hiring (`hackernews.py`); GitHub issues (`github_jobs.py`); Reddit (`reddit.py`) |
| **Browser + LLM scrapers** | Fragile — anti-bot, layout changes | LinkedIn, Indeed, Instahyre, Glassdoor, Naukri via Google `site:` dorks → Playwright crawl → LLM extraction (`backend/discovery/sources/web.py`) |

Orchestration lives in `backend/automation/free_scout.py` (structured sources) and `backend/automation/scout.py` (board scan including web targets).

---

## 2. Does it use Playwright?

**Yes.** Playwright is a core Python dependency (`backend/pyproject.toml`: `playwright>=1.44.0`).

| Use case | File |
|----------|------|
| Job board crawl + LLM extraction | `backend/discovery/sources/web.py` |
| Browser runtime / Chromium path | `backend/automation/browser_runtime.py` |
| Portfolio ingestion | `backend/profile/portfolio_crawl.py` |
| Experimental auto-apply | `backend/automation/actuator.py` |

Chromium ships in a first-run OTA runtime pack (not in the thin installer).

---

## 3. Which job sources/providers are present?

**Dedicated adapter modules** (`backend/discovery/sources/`):

- `ats.py` — Greenhouse, Lever, Ashby, Workable
- `rss.py` — RemoteOK, Remotive, Jobicy, We Work Remotely, generic RSS
- `hackernews.py`, `github_jobs.py`, `reddit.py`
- `web.py` — generic web + Wellfound-specific parser
- `apify.py` — optional paid Apify actor
- `custom.py` — user-defined JSON connectors

**Configured via Google `site:` dorks** (`backend/core/config.py` defaults):

Wellfound, LinkedIn, Indeed, Glassdoor, SmartRecruiters, Workday, Naukri, Instahyre, Cutshort, Foundit, Internshala, plus ATS domains.

---

## 4. Instahyre, Wellfound, LinkedIn, Indeed, ATS?

| Platform | Status | Implementation |
|----------|--------|----------------|
| **ATS** (Greenhouse/Lever/Ashby/Workable) | First-class | `ats.py` — real public APIs, `ats:<provider>:<slug>` targets |
| **Wellfound** | Partial | `scrape_wellfound_target()` + `parse_wellfound()` in `web.py`; also `site:wellfound.com/jobs` dorks |
| **LinkedIn** | No native scraper | `site:linkedin.com/jobs` → Google URL → Playwright → LLM only |
| **Indeed** | No native scraper | Same Google + Playwright + LLM path |
| **Instahyre** | No native scraper | Preset `site:instahyre.com` in config only — no dedicated module |

LinkedIn cookie is exposed in UI settings but **not consumed** by the backend.

---

## 5. What schema/pipeline does it use?

### Normalized lead schema (`docs/source-adapters.md`)

**Required:** `title`, `company`, `url`, `platform`, `description`  
**Recommended:** `posted_date`, `location`, `tech_stack`, `signal_score`, `signal_reason`, `signal_tags`, `source_meta`

Dedup: `canonical_lead_id()` — MD5 of normalized URL (`backend/discovery/lead_intel.py`).

### Pipeline

```
Profile ingest → Kuzu graph + LanceDB vectors
       ↓
Scan (discovery router)
  1. X scout (optional)
  2. Free scout (ATS/GitHub/HN/Reddit/connectors)
  3. Query gen (profile-tailored site: queries)
  4. Board scout batches (RSS/API + web targets)
       ↓
Quality gate (discovery/quality_gate.py)
       ↓
SQLite CRM (leads table)
       ↓
Ranking (deterministic + optional semantic)
       ↓
Generation (resume, cover letter, outreach)
```

Our dashboard maps `platform` → `provider`/`source`, `url` → `jobUrl`.

---

## 6. Ideas to reuse

1. **Source adapter contract** — small modules returning normalized dicts; APIs over scraping.
2. **Two-tier discovery** — structured/free path (ATS APIs) separate from browser path.
3. **Pre-save quality gate** — reject thin/stale/spam leads before storage.
4. **ATS-first strategy** — public APIs with freshness filtering (already adopted in Module 3.1).
5. **Canonical URL dedup** — stable `jobId` across providers (we use SHA256).
6. **Profile-aware query generation** — tailor search terms from candidate intelligence.
7. **Market presets** — India vs global target lists (`DEFAULT_JOB_TARGETS` / `INDIA_JOB_TARGETS`).
8. **Custom JSON connectors** — declarative field mapping for private APIs.
9. **Deterministic scoring** — explainable fit before LLM ranking (future Module 4+).
10. **Live source smoke tests** — opt-in integration checks against public APIs.
11. **Scan telemetry** — per-source counts in run metadata (we added `providerCounts`).

---

## 7. Parts to avoid

1. **Google `site:` + Playwright + LLM as primary LinkedIn/Indeed/Instahyre strategy** — fragile, ToS-risky, expensive.
2. **Dead LinkedIn cookie setting** — UI/backend mismatch.
3. **`asyncio.run()` inside sync scrape functions** — awkward for scaling.
4. **Tauri + OTA runtime pack** — heavy for a web dashboard.
5. **Experimental auto-apply** — high maintenance and legal risk (out of scope for us).
6. **AGPL-3.0 license** — copyleft if shipping derivatives.
7. **Duplicate scout logic** — `free_scout.py` and `scout.py` overlap; don't copy both blindly.
8. **LLM-dependent extraction at scale** — non-deterministic; use as fallback only.
9. **X/Apify as required dependencies** — keep optional.

---

## Bottom line for job-automation-dashboard

JustHireMe validates our Module 3.1 direction: **ATS public APIs first**, JobSpy for aggregators, **Playwright skeletons** for Wellfound/Instahyre until stable endpoints exist. Avoid their Google-dork + LLM board scrape as a production primary path.
