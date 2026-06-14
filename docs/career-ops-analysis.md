# Career Ops — Architectural Reference Analysis

**Repo:** `external/career-ops` (https://github.com/santifer/career-ops)  
**Purpose:** Reference for Module 4 (scoring) and Module 5 (resume tailoring). No code merged.

---

## 1. How Career Ops scores jobs

**LLM-agent scoring, not deterministic code.** An AI CLI reads markdown modes (`modes/_shared.md`, `modes/oferta.md`) and produces a **1–5 global score** plus qualitative blocks A–G. Weights are implicit in prompts, not encoded in Python/JS.

## 2. Scoring dimensions

| Dimension | Measures |
|-----------|----------|
| CV match | Skills/experience vs JD |
| North Star alignment | Fit with user archetypes |
| Comp | Salary vs market |
| Cultural signals | Culture, remote, growth |
| Red flags | Penalties |

Separate **Block G legitimacy tier** does not change the numeric score.

## 3. Tailored resume generation

Agent workflow in `modes/pdf.md`: read `cv.md` → extract JD keywords → rewrite summary → reorder bullets → fill `templates/cv-template.html` → `generate-pdf.mjs`.

## 4. Resume output formats

| Format | Supported |
|--------|-----------|
| PDF | Yes (primary) |
| HTML | Yes (intermediate) |
| LaTeX | Optional |
| Markdown | Input only (`cv.md`) |
| DOCX | No |

## 5. Playwright for PDF?

**Yes.** `generate-pdf.mjs` uses Playwright Chromium (`page.setContent` → `page.pdf()`).

## 6. Template system

- `templates/cv-template.html` — placeholders `{{NAME}}`, `{{SUMMARY_TEXT}}`, etc.
- `templates/cv-template.tex` — LaTeX variant
- ATS-oriented single-column design

## 7. Hallucination prevention

Prompt rules: never invent experience/metrics/skills; cite CV lines; human review before submit. `cv-sync-check.mjs` audits prompts. **No automated provenance validator** — we build `provenance_checker.py` in Module 5.

## 8. Inputs expected

| Input | Path |
|-------|------|
| CV | `cv.md` |
| Profile | `config/profile.yml` |
| Overrides | `modes/_profile.md` |
| Per job | JD text or URL |

## 9. Outputs created

- `reports/*.md` — evaluation reports
- `output/cv-*.pdf` — tailored resumes
- `data/applications.md` — tracker

## 10. Reimplement in our project

| Idea | Our adaptation |
|------|----------------|
| Truth-only rules | `provenance_checker.py` |
| JD keyword focus | `atsKeywordBank` + job description |
| HTML + Playwright PDF | `pdf_renderer.py` |
| Red flags | `avoidRoles`, `avoidedIndustries` |
| Score-gated tailoring | `applyRecommendation` Apply/Maybe |

## 11. Avoid

- LLM-as-primary scorer (we use deterministic Module 4)
- Agent-only orchestration
- Auto-submit
- Canva MCP path
- Copying `cv.md` schema blindly

## 12. Adaptation to our files

| Career Ops | Ours |
|------------|------|
| `cv.md` | `data/profile/candidate-profile.json` |
| `modes/_profile.md` | `candidate-intelligence.json` |
| JD | `discovered_jobs.json` → title, description |
| Weights | `scoringWeights` (25/25/15/15/10/10) |
