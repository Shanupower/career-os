"""We Work Remotely RSS feed provider."""

from __future__ import annotations

import logging
import re
import xml.etree.ElementTree as ET

import requests

from providers.base_provider import JobProvider, build_canonical_job, filter_jobs

logger = logging.getLogger(__name__)

RSS_FEEDS = [
    "https://weworkremotely.com/categories/remote-programming-jobs.rss",
    "https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss",
    "https://weworkremotely.com/categories/remote-full-stack-programming-jobs.rss",
]


class WWRProvider(JobProvider):
    provider_name = "wwr"

    def _parse_feed(self, url: str) -> list[dict]:
        try:
            resp = requests.get(url, timeout=30)
            resp.raise_for_status()
            root = ET.fromstring(resp.content)
            items = []
            for item in root.findall(".//item"):
                title_raw = (item.findtext("title") or "").strip()
                link = (item.findtext("link") or "").strip()
                description = (item.findtext("description") or "").strip()
                pub_date = (item.findtext("pubDate") or "").strip()
                company, title = self._split_title(title_raw)
                items.append({
                    "title": title,
                    "company": company,
                    "link": link,
                    "description": description,
                    "pubDate": pub_date,
                })
            return items
        except Exception as exc:
            logger.warning("WWR feed %s failed: %s", url, exc)
            return []

    @staticmethod
    def _split_title(title_raw: str) -> tuple[str, str]:
        """WWR titles are often 'Company: Role'."""
        if ":" in title_raw:
            parts = title_raw.split(":", 1)
            return parts[0].strip(), parts[1].strip()
        return "Unknown", title_raw

    def fetch_jobs(
        self,
        search_terms: list[str],
        locations: list[str],
        remote_filters: list[str],
        country: str = "India",
    ) -> list[dict]:
        primary_term = search_terms[0] if search_terms else ""
        primary_loc = locations[0] if locations else ""
        all_jobs: list[dict] = []
        seen_urls: set[str] = set()

        for feed_url in RSS_FEEDS:
            for posting in self._parse_feed(feed_url):
                url = posting.get("link") or ""
                if url in seen_urls:
                    continue
                seen_urls.add(url)
                description = re.sub(r"<[^>]+>", " ", posting.get("description") or "")
                job = build_canonical_job(
                    provider="wwr",
                    source="weworkremotely",
                    title=posting.get("title") or "",
                    company=posting.get("company") or "Unknown",
                    location="Remote",
                    job_url=url,
                    description=description,
                    is_remote=True,
                    date_posted=posting.get("pubDate") or "",
                    search_term=primary_term,
                    search_location=primary_loc,
                    site="weworkremotely",
                )
                if job["title"]:
                    all_jobs.append(job)

        return filter_jobs(all_jobs, search_terms, locations, remote_filters, country)
