"""Generate mock jobs for --mock discovery runs."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from providers.base_provider import build_canonical_job

INDIA_COMPANIES = [
    "Razorpay",
    "Zepto",
    "Swiggy",
    "Groww",
    "CRED",
    "Meesho",
    "Freshworks",
    "Zoho",
    "BrowserStack",
    "Postman",
]

TITLES = [
    "Senior Software Engineer",
    "Staff Backend Engineer",
    "Platform Engineer",
    "DevOps Engineer",
    "Data Engineer",
    "Machine Learning Engineer",
    "Frontend Engineer",
    "Full Stack Developer",
    "Site Reliability Engineer",
    "Engineering Manager",
]

LOCATIONS = [
    "Bangalore, India",
    "Hyderabad, India",
    "Mumbai, India",
    "Pune, India",
    "Chennai, India",
    "Remote, India",
]

PROVIDERS = [
    ("jobspy", "indeed"),
    ("jobspy", "linkedin"),
    ("greenhouse", "razorpay"),
    ("greenhouse", "freshworks"),
    ("lever", "browserstack"),
    ("lever", "postman"),
    ("ashby", "zepto"),
    ("ashby", "groww"),
    ("wellfound", "wellfound"),
    ("instahyre", "instahyre"),
]


def generate_mock_jobs(count: int = 55) -> list[dict]:
    scraped_at = datetime.now(timezone.utc).isoformat()
    jobs: list[dict] = []

    for i in range(count):
        company = INDIA_COMPANIES[i % len(INDIA_COMPANIES)]
        title = TITLES[i % len(TITLES)]
        location = LOCATIONS[i % len(LOCATIONS)]
        provider, source = PROVIDERS[i % len(PROVIDERS)]
        is_remote = "remote" in location.lower()
        posted = (datetime.now(timezone.utc) - timedelta(days=i % 14)).isoformat()

        if provider == "jobspy":
            job_url = f"https://www.indeed.com/viewjob?jk=mock{i:04d}"
            site = source
        elif provider == "greenhouse":
            job_url = f"https://boards.greenhouse.io/{source.lower()}/jobs/{1000 + i}"
            site = source.lower()
        elif provider == "lever":
            job_url = f"https://jobs.lever.co/{source}/{i:04d}"
            site = source
        elif provider == "ashby":
            job_url = f"https://jobs.ashbyhq.com/{source}/{i:04d}"
            site = source
        elif provider == "wellfound":
            job_url = f"https://wellfound.com/role/mock-{i}"
            site = "wellfound"
        else:
            job_url = f"https://www.instahyre.com/job-{i}"
            site = "instahyre"

        jobs.append(
            build_canonical_job(
                provider=provider,
                source=source,
                title=f"{title} — {company}",
                company=company,
                location=location,
                job_url=job_url,
                description=f"Mock {provider} listing for {title} at {company} in {location}.",
                salary="₹25L - ₹45L per year" if i % 3 == 0 else "",
                employment_type="Full-time",
                is_remote=is_remote,
                date_posted=posted,
                search_term="software engineer",
                search_location=location,
                scraped_at=scraped_at,
                site=site,
            )
        )

    return jobs
