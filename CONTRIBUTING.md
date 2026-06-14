# Contributing to Career OS

Thank you for helping improve Career OS. This project is licensed under [AGPL-3.0](LICENSE).

## Development setup

```bash
git clone <your-fork-url>
cd career-os
npm run setup
npm run dev
```

Open http://localhost:5173. The Vite dev server includes the full `/api` pipeline.

## Branch naming

- `feat/short-description` — new features
- `fix/short-description` — bug fixes
- `docs/short-description` — documentation only
- `chore/short-description` — tooling, deps, CI

## Before opening a PR

```bash
npm run lint
npm run build
```

If you changed Python pipeline code:

```bash
npm run setup:jobs
cp data/examples/candidate-intelligence.example.json data/intelligence/candidate-intelligence.json
cp data/examples/candidate-profile.example.json data/profile/candidate-profile.json
npm run discover:jobs:mock
npm run score:jobs
```

## What not to commit

- Personal data under `data/profile/`, `data/jobs/`, `data/resumes/`, `data/cache/`
- API keys, `.env` files, LinkedIn session cookies
- Cloned repos under `external/` (created by setup scripts)

## Architecture

- **Frontend:** React + Vite (`src/`)
- **API:** `scripts/api-handler.js` (shared by Vite dev middleware and `scripts/local-server.js`)
- **Pipeline:** Python under `python/` (discovery, scoring, tailoring, audit)

See [README.md](README.md) for the full module overview.

## Adding ATS company configs

Career OS discovers jobs from public Greenhouse, Lever, and Ashby APIs using slugs in [`companies/`](companies/).

1. Find the board slug (see [`companies/README.md`](companies/README.md))
2. Add an entry to the appropriate JSON file:
   - **Greenhouse:** `{ "company": "Acme Corp", "board": "acme" }`
   - **Lever / Ashby:** append the slug string to the array
3. Validate locally:

```bash
node scripts/validate-companies.js
```

4. Open a PR with only the company config change (no personal data)

**PR checklist for company configs:**
- [ ] Slug verified against the live careers URL or public API
- [ ] No duplicate slugs in the same file
- [ ] `node scripts/validate-companies.js` passes
- [ ] Company name is human-readable (Greenhouse only)
