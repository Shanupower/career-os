# Security Policy

## Reporting a vulnerability

If you discover a security issue, please **do not** open a public GitHub issue with exploit details.

Email the maintainers privately with:

- Description of the issue
- Steps to reproduce
- Impact assessment
- Suggested fix (if any)

We will acknowledge receipt within 5 business days.

## Sensitive data

Career OS is **local-first**. Your profile, resumes, and job data stay on your machine unless you explicitly configure cloud AI API keys.

**Never commit:**

- `data/profile/*.json` with real personal information
- `data/resumes/` (tailored PDFs)
- `data/cache/repos/` (cloned work repositories)
- `.env` files or `data/outreach/linkedin_session.json`

If you accidentally commit secrets or PII, rotate credentials immediately and force-remove the data from git history before pushing to a public remote.

## API keys

Cloud AI providers (OpenAI, Anthropic, etc.) are optional. Keys are stored in browser localStorage via Settings and are never sent to third parties except the provider you configure.

## LinkedIn scraping

Career OS outreach includes an optional **deep mode** that automates linkedin.com with your `li_at` cookie. This may violate LinkedIn's Terms of Service and can result in account suspension or a permanent ban. Deep mode requires explicit user consent (`acceptTosRisk` in the API/UI, `--i-accept-tos-risk` on the CLI). The default search mode does not authenticate to LinkedIn.

Never commit `data/outreach/linkedin_session.json` or share your `li_at` cookie.

## AGPL-3.0

This project is licensed under AGPL-3.0. If you deploy a modified version as a network service, you must provide source code to users of that service.
