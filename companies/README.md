# ATS Company Configs

Community-maintained lists of company board slugs for job discovery.

## Files

| File | ATS | Format |
|------|-----|--------|
| `greenhouse.json` | Greenhouse | `[{ "company": "Stripe", "board": "stripe" }, ...]` |
| `lever.json` | Lever | `["figma", "netflix", ...]` |
| `ashby.json` | Ashby | `["cursor", "linear", ...]` |

## How to find board slugs

### Greenhouse
1. Open a company's careers page (e.g. `https://boards.greenhouse.io/stripe`)
2. The slug after `/boards/` is the `board` value
3. API: `https://boards-api.greenhouse.io/v1/boards/{board}/jobs`

### Lever
1. Open `https://jobs.lever.co/{company}`
2. `{company}` is the slug
3. API: `https://api.lever.co/v0/postings/{company}`

### Ashby
1. Open `https://jobs.ashbyhq.com/{slug}`
2. `{slug}` is the company identifier
3. API: `https://api.ashbyhq.com/posting-api/job-board/{slug}`

## Validate before submitting a PR

```bash
node scripts/validate-companies.js
```

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md#adding-ats-company-configs).
