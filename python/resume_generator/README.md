# Resume Tailoring (Module 5)

Truth-only tailored resumes from profile + intelligence + scored job.

Resumes are built from the **canonical structure in `profile.resume.rawText`** (your uploaded PDF text): About Me, Professional Experience with bullets, categorized Skills, and Education. Job-specific keywords from `matchedSkills` are woven into the summary and skill ordering while preserving your original experience bullets.

Output HTML/PDF uses a Calibri-style layout matching a one-page professional resume (centered name, section headers, two-column skills table).

## Run

```bash
source .venv/bin/activate
pip install jinja2
python python/resume_generator/run_tailor.py --job-id <jobId>
python python/resume_generator/run_tailor.py --priority P1 --limit 5
```

## Output

`data/resumes/{jobId}/tailored_resume.md`, `.html`, `.pdf`, `cover_letter.md`

Paths stored in `tailoredAssets` on each job in `scored_jobs.json`.
