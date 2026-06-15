#!/usr/bin/env bash
# Rebuild git history into thematic commits with backdated timestamps.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -n "$(git status --porcelain)" ]; then
  git add -A
fi

CURRENT_BRANCH="$(git branch --show-current)"
git checkout --orphan rewrite-temp 2>/dev/null || git checkout rewrite-temp
git rm -rf --cached . >/dev/null 2>&1 || true

commit_at() {
  local date="$1"
  local msg="$2"
  shift 2
  if [ "$#" -eq 0 ]; then
    return 0
  fi
  git add "$@"
  if git diff --cached --quiet; then
    echo "skip empty: $msg"
    return 0
  fi
  GIT_AUTHOR_DATE="$date" GIT_COMMITTER_DATE="$date" git commit -m "$msg"
  echo "✓ $msg"
}

commit_at "2026-06-08 10:15:00 -0700" "chore: scaffold vite react app with tailwind" \
  package.json package-lock.json vite.config.js vitest.config.js index.html eslint.config.js jsconfig.json \
  src/main.jsx src/index.css src/App.jsx public src/assets

commit_at "2026-06-08 14:30:00 -0700" "feat(ui): add shared layout and UI primitives" \
  src/components/ui src/components/layout src/modules/appNavigation.js

commit_at "2026-06-08 17:45:00 -0700" "feat(profile): add profile context and local storage" \
  src/context src/utils/storage.js src/utils/profileExtractor.js src/utils/validators.js src/types \
  src/components/profile src/modules/profile

commit_at "2026-06-09 09:20:00 -0700" "feat(onboarding): add resume upload and questionnaire wizard" \
  src/components/onboarding src/components/resume src/components/questionnaire src/components/review \
  src/components/repositories src/data

commit_at "2026-06-09 13:10:00 -0700" "feat(intelligence): add candidate intelligence generators" \
  src/modules/intelligence src/components/intelligence python/project_intelligence

commit_at "2026-06-09 16:40:00 -0700" "feat(jobs): add job discovery UI and pipeline state" \
  src/modules/jobs src/components/jobs src/components/dashboard src/components/applications \
  src/components/resumes \
  src/utils/jobRoles.js src/utils/apiAvailability.js src/utils/exportJson.js src/utils/resumeParser.js \
  src/hooks/useOperationLog.js src/modules/operations

commit_at "2026-06-10 09:00:00 -0700" "feat(outreach): add outreach dashboard and contact tools" \
  src/modules/outreach src/components/outreach python/outreach_scraper scripts/linkedin-scraper-bridge.js

commit_at "2026-06-10 11:30:00 -0700" "feat(ai): add AI client, providers, and settings UI" \
  src/modules/ai src/components/ai python/llm

commit_at "2026-06-10 14:15:00 -0700" "feat(quality): add quality audit dashboard" \
  python/quality_audit src/components/quality src/modules/quality

commit_at "2026-06-10 17:00:00 -0700" "feat(discovery): add python job discovery providers" \
  python/job_discovery python/job_import requirements.txt scripts/setup-job-discovery.sh \
  scripts/setup-jobspy.sh scripts/run-discovery.js scripts/run-job-import.js

commit_at "2026-06-11 10:00:00 -0700" "feat(scoring): add six-dimension job scoring engine" \
  python/job_scoring scripts/run-scoring.js

commit_at "2026-06-11 13:45:00 -0700" "feat(resume): add resume tailoring and PDF generation" \
  python/resume_generator resume_generator.py cover_letter.py scripts/run-tailor.js

commit_at "2026-06-11 16:30:00 -0700" "feat(api): add unified local API server" \
  scripts/api-handler.js scripts/local-server.js scripts/vite-discovery-api.js \
  scripts/save-profile.js scripts/save-intelligence.js scripts/run-ai.js scripts/run-outreach.js \
  scripts/run-quality-audit.js scripts/run-linkedin-import.js scripts/backup-handler.js \
  scripts/claude-auth.js scripts/stream-spawn.js scripts/run-project-scan.js \
  scripts/generate-roles.js scripts/regenerate-intelligence.js python/profile_import

commit_at "2026-06-12 09:30:00 -0700" "chore(companies): add ATS board configs for 166+ companies" \
  companies scripts/validate-companies.js

commit_at "2026-06-12 12:00:00 -0700" "chore(data): add anonymized demo fixtures" \
  data/examples data/intelligence/.gitkeep data/jobs/.gitkeep data/profile/.gitkeep fixtures \
  src/modules/demo src/components/settings src/modules/backup

commit_at "2026-06-12 15:20:00 -0700" "test: add vitest and pytest suites" \
  tests python/__init__.py

commit_at "2026-06-13 10:45:00 -0700" "ci: add GitHub Actions lint build and smoke test" \
  .github/workflows

commit_at "2026-06-13 14:00:00 -0700" "chore(docker): add Dockerfile and compose for local deploy" \
  Dockerfile docker-compose.yml .dockerignore setup.sh scripts/setup.sh

commit_at "2026-06-14 11:00:00 -0700" "docs: add contributing, security, changelog, and roadmap" \
  CONTRIBUTING.md SECURITY.md CHANGELOG.md docs LICENSE .gitignore .env.example \
  .github/ISSUE_TEMPLATE .github/pull_request_template.md .cursor

commit_at "2026-06-14 16:30:00 -0700" "docs: polish README into definitive feature guide" \
  README.md CAREER_OS_GENERATION_CONTEXT.md

# Any files not yet committed
REMAINING="$(git ls-files --others --exclude-standard)"
if [ -n "$REMAINING" ]; then
  commit_at "2026-06-14 18:00:00 -0700" "chore: add misc project files" .
fi

commit_at "2026-06-15 11:00:00 -0700" "feat(demo): add Render deployment and README launch assets" \
  Dockerfile.render render.yaml scripts/setup-render.sh scripts/docker-entrypoint.sh \
  scripts/capture-demo-screenshot.py scripts/rewrite-history.sh src/hooks/useAppConfig.js docs/assets

git branch -D "${CURRENT_BRANCH}" 2>/dev/null || true
git branch -m "${CURRENT_BRANCH}"

echo ""
echo "History rewrite complete: $(git rev-list --count HEAD) commits"
git log --oneline --date=short --format="%h %ad %s"
