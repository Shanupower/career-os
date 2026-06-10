# Quality Audit & ATS Validation Engine (Module 9)

Deterministic QA layer that audits pipeline outputs before trusting the system at scale.

## What it audits

| Dimension | Weight | Module |
|-----------|--------|--------|
| Job lead quality | 20 | `job_lead_auditor.py` |
| Score accuracy | 15 | `scoring_auditor.py` |
| Resume quality | 25 | `resume_auditor.py` |
| ATS compatibility | 20 | `ats_scorer.py` |
| Cover letter quality | 10 | `cover_letter_auditor.py` |
| Outreach/contact quality | 10 | `outreach_auditor.py` |

Provenance/truth safety (`provenance_auditor.py`) reduces resume and ATS scores when unsupported claims are detected.

## Inputs

- `data/profile/candidate-profile.json`
- `data/intelligence/candidate-intelligence.json`
- `data/jobs/scored_jobs.json`
- `data/resumes/{jobId}/tailored_resume.md`
- `data/resumes/{jobId}/tailored_resume.pdf`
- `data/resumes/{jobId}/cover_letter.md`
- `job.outreach` and `job.aiInsights` (from scored jobs if present)

## Outputs

Written to `data/audits/`:

- `system_audit_report.json`
- `resume_quality_report.json`
- `cover_letter_quality_report.json`
- `job_lead_quality_report.json`
- `ats_score_report.json`

## Usage

```bash
# Full audit (all scored jobs)
npm run audit:quality

# Sample mode — top 5 P1/Apply jobs for current candidate
python python/quality_audit/run_audit.py --sample-me
```

## Safety rules

- **Audit only** — does not auto-fix resumes or cover letters
- `qualityStatus: needs_review` when severe provenance issues or low scores
- `qualityStatus: approved` when safe

## Does NOT modify

- Discovery, scoring, or tailoring pipelines (Modules 1–6)
- AI or outreach logic (Modules 7–8) unless a bug is exposed
