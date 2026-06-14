# Changelog

All notable changes to Career OS are documented here.

## [1.0.0] - 2026-06-10

### Added

- **Career OS** open-source release under AGPL-3.0
- Unified local API server (`scripts/api-handler.js` + `scripts/local-server.js`)
- One-command setup: `npm run setup`
- Production start: `npm run start` (build + Express server)
- Docker Compose support with persistent `data/` volume
- Anonymized demo data in `data/examples/` with "Load demo data" in Settings
- GitHub Actions CI: lint, build, mock discovery + scoring smoke test
- Contributor docs: CONTRIBUTING.md, SECURITY.md, issue/PR templates

### Changed

- Replaced `import.meta.env.DEV` gates with `/api/pipeline/health` probe — production mode has full pipeline access
- README rewritten for OSS quick start
- Branding updated to Career OS

### Security

- Scrubbed personal data from repository
- Expanded `.gitignore` for runtime data paths
- Added `.env.example` template
