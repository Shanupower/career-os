"""LinkedIn contact discovery (basic fields: name, title, company, profile URL).

Two modes, selected with --mode:

  search  (default, zero account risk)
      Drives a real Firefox browser over DuckDuckGo and parses public LinkedIn
      profile snippets out of the search results. linkedin.com is never loaded,
      so no login is involved and the user's LinkedIn account is never at risk.

  deep    (opt-in, requires --li-at session cookie)
      Logs into LinkedIn with the user's own li_at cookie and reads the public
      people-search result cards (name / headline / profile URL only). Modelled
      on yash1raj234/Linkedin_Profile_scrapper's anti-detection approach:
      Firefox engine, randomized viewport, realistic headers, jittered human
      delays, and login-wall / rate-limit detection with backoff. This touches
      linkedin.com directly and therefore carries real account risk; it only
      runs when the caller explicitly opts in.

Prints JSON to stdout: {"contacts": [...], "queriesRun": N, "mode": "...", "engine": "..."}
"""

from __future__ import annotations

import argparse
import json
import random
import re
import time
from urllib.parse import quote

from playwright.sync_api import sync_playwright

ROLE_QUERIES = [
    ("Recruiter", "recruiter"),
    ("Talent Acquisition", '"talent acquisition"'),
    ("Hiring Manager", '"hiring manager"'),
    ("Engineering Manager", '"engineering manager"'),
]

LINKEDIN_RE = re.compile(r"https?://[a-z]{0,3}\.?linkedin\.com/in/[^?&#\s\"]+", re.I)

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:124.0) "
    "Gecko/20100101 Firefox/124.0"
)


# --------------------------------------------------------------------------- #
# Shared helpers                                                              #
# --------------------------------------------------------------------------- #

def simplify_company(company: str) -> str:
    short = re.sub(
        r"\b(india|usa?|uk|private|pvt\.?|limited|ltd\.?|inc\.?|llc|llp|corp\.?|"
        r"technologies|technology|solutions|services)\b",
        "",
        company,
        flags=re.I,
    )
    short = re.sub(r"[,.]", " ", short)
    short = re.sub(r"\s+", " ", short).strip()
    return short or company


def parse_result_title(text: str):
    """'Jane Doe - Technical Recruiter - Acme | LinkedIn' -> dict."""
    text = re.sub(r"\s*[|\u00b7-]\s*LinkedIn.*$", "", (text or "").strip(), flags=re.I)
    parts = re.split(r"\s+[-\u2013\u2014]\s+", text)
    name = parts[0].strip()
    if not name or len(name) > 60 or re.search(r"linkedin|profiles?\b", name, re.I):
        return None
    return {
        "name": name,
        "title": parts[1].strip() if len(parts) > 1 else "",
        "company": parts[2].strip() if len(parts) > 2 else "",
    }


def clean_url(url: str):
    m = LINKEDIN_RE.search(url or "")
    return m.group(0).rstrip("/") if m else None


_TITLE_WORDS = re.compile(
    r"\b(recruiter|recruiting|talent|acquisition|hiring|manager|director|"
    r"engineer|engineering|lead|head|vp|chief|officer|specialist|sourcer|hr)\b",
    re.I,
)


def looks_like_headline(name: str) -> bool:
    """A 'name' containing @, |, or job-title words is really a headline."""
    return bool("@" in name or "|" in name or _TITLE_WORDS.search(name))


def name_from_url(url: str) -> str:
    """Recover a display name from a /in/<slug> URL when parsing failed."""
    m = re.search(r"/in/([^/?#]+)", url or "")
    if not m:
        return ""
    slug = re.sub(r"-?[0-9a-f]{6,}$", "", m.group(1))  # drop trailing id hash
    parts = [p for p in re.split(r"[-_]", slug) if p and not p.isdigit()]
    if not parts:
        return ""
    return " ".join(w.capitalize() for w in parts[:3])


def random_viewport():
    return {"width": random.randint(1280, 1480), "height": random.randint(720, 920)}


def jitter(lo=0.5, hi=2.0):
    time.sleep(random.uniform(lo, hi))


def new_context(p, *, cookies=None):
    """A Firefox context with a realistic fingerprint, per the reference repo."""
    browser = p.firefox.launch(headless=True)
    context = browser.new_context(
        user_agent=USER_AGENT,
        locale="en-US",
        viewport=random_viewport(),
        extra_http_headers={
            "Accept-Language": "en-US,en;q=0.9",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
        },
    )
    if cookies:
        context.add_cookies(cookies)
    return browser, context


# --------------------------------------------------------------------------- #
# Mode: search (DuckDuckGo, no LinkedIn login)                                #
# --------------------------------------------------------------------------- #

def _ddg_results(page, query: str):
    page.goto(
        "https://duckduckgo.com/?q=" + quote(query),
        wait_until="domcontentloaded",
        timeout=30000,
    )
    try:
        page.wait_for_selector("a[href*='linkedin.com/in/']", timeout=8000)
    except Exception:
        pass
    anchors = page.eval_on_selector_all(
        "a[href*='linkedin.com/in/']",
        "els => els.map(e => ({ url: e.href, title: e.innerText }))",
    )
    return [(a["url"], a["title"]) for a in anchors]


def scrape_search(company: str, max_contacts: int):
    short_name = simplify_company(company)
    contacts, seen = [], set()
    queries_run = 0

    with sync_playwright() as p:
        browser, context = new_context(p)
        page = context.new_page()
        for role, keyword in ROLE_QUERIES:
            if len(contacts) >= max_contacts:
                break
            query = f'site:linkedin.com/in {keyword} "{short_name}"'
            try:
                results = _ddg_results(page, query)
            except Exception:
                results = []
            queries_run += 1
            for url, title in results:
                _maybe_add(contacts, seen, url, title, company, short_name, role, max_contacts)
                if len(contacts) >= max_contacts:
                    break
            jitter(1.5, 3.5)
        browser.close()

    return {"contacts": contacts, "queriesRun": queries_run,
            "mode": "search", "engine": "playwright-firefox-ddg"}


def _maybe_add(contacts, seen, url, title, company, short_name, role, max_contacts):
    linkedin_url = clean_url(url)
    if not linkedin_url or linkedin_url.lower() in seen:
        return
    parsed = parse_result_title(title)
    if not parsed:
        return
    haystack = f"{parsed['title']} {parsed['company']} {title}".lower()
    if short_name.lower() not in haystack and company.lower() not in haystack:
        return
    name = parsed["name"]
    role_title = parsed["title"]
    if looks_like_headline(name):
        # The snippet led with the headline; recover the name from the URL slug.
        recovered = name_from_url(linkedin_url)
        if not recovered:
            return
        if not role_title:
            role_title = name
        name = recovered
    seen.add(linkedin_url.lower())
    contacts.append({
        "name": name,
        "title": re.sub(r"\s*(\.{3}|\u2026)\s*$", "", role_title) or role,
        "company": parsed["company"] or company,
        "linkedinUrl": linkedin_url,
        "source": "linkedin_search_scrape",
        "roleQuery": role,
    })


# --------------------------------------------------------------------------- #
# Mode: deep (authenticated LinkedIn people-search, basic fields only)        #
# --------------------------------------------------------------------------- #

def _is_login_wall(page) -> bool:
    url = page.url.lower()
    if "/login" in url or "/authwall" in url or "/checkpoint" in url:
        return True
    try:
        return page.locator("input#username, form.login__form").count() > 0
    except Exception:
        return False


def _is_rate_limited(page) -> bool:
    try:
        body = (page.inner_text("body") or "").lower()
    except Exception:
        return False
    return any(s in body for s in (
        "you've reached the weekly", "try again later",
        "unusual activity", "temporarily restricted",
    ))


def _people_search_cards(page):
    """Extract basic info from LinkedIn people-search result cards."""
    page.evaluate("""() => new Promise((resolve) => {
        let y = 0;
        const step = () => {
            y += 700; window.scrollTo(0, y);
            if (y < 3500) setTimeout(step, 300); else resolve();
        };
        step();
    })""")
    return page.eval_on_selector_all(
        "li.reusable-search__result-container, div.entity-result__item",
        """els => els.map(el => {
            const linkEl = el.querySelector("a[href*='/in/']");
            const nameEl = el.querySelector(
                "span[aria-hidden='true'], .entity-result__title-text a span[aria-hidden='true']"
            );
            const subtitleEl = el.querySelector(".entity-result__primary-subtitle");
            return {
                url: linkEl ? linkEl.href : '',
                name: nameEl ? nameEl.innerText.trim() : '',
                title: subtitleEl ? subtitleEl.innerText.trim() : '',
            };
        })"""
    )


def scrape_deep(company: str, li_at: str, max_contacts: int, max_pages: int = 3):
    short_name = simplify_company(company)
    contacts, seen = [], set()
    queries_run = 0
    status = "ok"

    cookies = [{
        "name": "li_at", "value": li_at,
        "domain": ".linkedin.com", "path": "/",
        "httpOnly": True, "secure": True,
    }]

    with sync_playwright() as p:
        browser, context = new_context(p, cookies=cookies)
        page = context.new_page()

        for role, keyword in ROLE_QUERIES:
            if len(contacts) >= max_contacts or status != "ok":
                break
            keywords = f"{keyword.strip(chr(34))} {short_name}"
            for pg in range(1, max_pages + 1):
                if len(contacts) >= max_contacts:
                    break
                url = (
                    "https://www.linkedin.com/search/results/people/"
                    f"?keywords={quote(keywords)}&page={pg}&origin=GLOBAL_SEARCH_HEADER"
                )
                try:
                    page.goto(url, wait_until="domcontentloaded", timeout=30000)
                except Exception:
                    break
                queries_run += 1
                jitter(0.5, 2.0)

                if _is_login_wall(page):
                    status = "login_wall"
                    break
                if _is_rate_limited(page):
                    status = "rate_limited"
                    time.sleep(random.uniform(10, 15))
                    break

                try:
                    cards = _people_search_cards(page)
                except Exception:
                    cards = []
                if not cards:
                    break

                for c in cards:
                    linkedin_url = clean_url(c.get("url"))
                    name = (c.get("name") or "").strip()
                    if not linkedin_url or not name or linkedin_url.lower() in seen:
                        continue
                    if name.lower() in ("linkedin member",) or len(name) > 60:
                        continue
                    seen.add(linkedin_url.lower())
                    contacts.append({
                        "name": name,
                        "title": c.get("title") or role,
                        "company": company,
                        "linkedinUrl": linkedin_url,
                        "source": "linkedin_deep_scrape",
                        "roleQuery": role,
                    })
                    if len(contacts) >= max_contacts:
                        break
                time.sleep(random.uniform(3, 7))  # human-like gap between requests

        browser.close()

    return {"contacts": contacts, "queriesRun": queries_run,
            "mode": "deep", "engine": "playwright-firefox-linkedin", "status": status}


# --------------------------------------------------------------------------- #
# CLI                                                                         #
# --------------------------------------------------------------------------- #

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--company", required=True)
    ap.add_argument("--mode", choices=["search", "deep"], default="search")
    ap.add_argument("--li-at", default="", help="LinkedIn li_at session cookie (deep mode)")
    ap.add_argument(
        "--i-accept-tos-risk",
        action="store_true",
        help="Required for deep mode: acknowledge LinkedIn ToS violation and account ban risk",
    )
    ap.add_argument("--max", type=int, default=10)
    args = ap.parse_args()

    company = args.company.strip()
    if not company:
        print(json.dumps({"contacts": [], "queriesRun": 0, "error": "no company"}))
        return

    try:
        if args.mode == "deep":
            if not args.i_accept_tos_risk:
                print(json.dumps({
                    "contacts": [], "queriesRun": 0,
                    "error": "deep mode requires --i-accept-tos-risk (LinkedIn ToS violation risk)",
                }))
                return
            if not args.li_at.strip():
                print(json.dumps({"contacts": [], "queriesRun": 0,
                                  "error": "deep mode requires --li-at session cookie"}))
                return
            result = scrape_deep(company, args.li_at.strip(), args.max)
        else:
            result = scrape_search(company, args.max)
    except Exception as e:  # surfaced to caller as JSON, never crash the pipeline
        print(json.dumps({"contacts": [], "queriesRun": 0, "error": str(e)}))
        return

    print(json.dumps(result))


if __name__ == "__main__":
    main()
