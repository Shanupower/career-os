"""JobSpy adapter with per-site graceful fallback."""

from __future__ import annotations

import logging
import warnings

import pandas as pd

logger = logging.getLogger(__name__)

# JobSpy site ids (Indeed / Glassdoor require country_indeed + location for narrowing)
SITE_LINKEDIN = "linkedin"
SITE_INDEED = "indeed"
SITE_GLASSDOOR = "glassdoor"
SITE_GOOGLE = "google"

SITES = [SITE_LINKEDIN, SITE_INDEED, SITE_GLASSDOOR, SITE_GOOGLE]
RESULTS_PER_SEARCH = 50
HOURS_OLD = 72
DEFAULT_COUNTRY = "USA"

# Exact Indeed / Glassdoor country names (JobSpy Country.from_string compatible).
# Glassdoor support marked with * in JobSpy docs; all listed countries work on Indeed.
INDEED_GLASSDOOR_COUNTRY_NAMES = {
    "argentina": "Argentina",
    "australia": "Australia",
    "austria": "Austria",
    "bahrain": "Bahrain",
    "belgium": "Belgium",
    "brazil": "Brazil",
    "canada": "Canada",
    "chile": "Chile",
    "china": "China",
    "colombia": "Colombia",
    "costa rica": "Costa Rica",
    "czech republic": "Czech Republic",
    "czechia": "Czech Republic",
    "denmark": "Denmark",
    "ecuador": "Ecuador",
    "egypt": "Egypt",
    "finland": "Finland",
    "france": "France",
    "germany": "Germany",
    "greece": "Greece",
    "hong kong": "Hong Kong",
    "hungary": "Hungary",
    "india": "India",
    "indonesia": "Indonesia",
    "ireland": "Ireland",
    "israel": "Israel",
    "italy": "Italy",
    "japan": "Japan",
    "kuwait": "Kuwait",
    "luxembourg": "Luxembourg",
    "malaysia": "Malaysia",
    "mexico": "Mexico",
    "morocco": "Morocco",
    "netherlands": "Netherlands",
    "new zealand": "New Zealand",
    "nigeria": "Nigeria",
    "norway": "Norway",
    "oman": "Oman",
    "pakistan": "Pakistan",
    "panama": "Panama",
    "peru": "Peru",
    "philippines": "Philippines",
    "poland": "Poland",
    "portugal": "Portugal",
    "qatar": "Qatar",
    "romania": "Romania",
    "saudi arabia": "Saudi Arabia",
    "singapore": "Singapore",
    "south africa": "South Africa",
    "south korea": "South Korea",
    "spain": "Spain",
    "sweden": "Sweden",
    "switzerland": "Switzerland",
    "taiwan": "Taiwan",
    "thailand": "Thailand",
    "turkey": "Turkey",
    "türkiye": "Turkey",
    "ukraine": "Ukraine",
    "united arab emirates": "United Arab Emirates",
    "uae": "United Arab Emirates",
    "uk": "UK",
    "united kingdom": "UK",
    "gb": "UK",
    "usa": "USA",
    "us": "USA",
    "united states": "USA",
    "uruguay": "Uruguay",
    "venezuela": "Venezuela",
    "vietnam": "Vietnam",
}

# City → "City, State" for India (Indeed/Glassdoor location narrowing)
INDIA_CITY_STATE = {
    "bangalore": "Bangalore, Karnataka",
    "bengaluru": "Bangalore, Karnataka",
    "hyderabad": "Hyderabad, Telangana",
    "mumbai": "Mumbai, Maharashtra",
    "pune": "Pune, Maharashtra",
    "chennai": "Chennai, Tamil Nadu",
    "delhi": "Delhi, Delhi",
    "new delhi": "New Delhi, Delhi",
    "gurgaon": "Gurgaon, Haryana",
    "gurugram": "Gurugram, Haryana",
    "noida": "Noida, Uttar Pradesh",
    "kolkata": "Kolkata, West Bengal",
    "ahmedabad": "Ahmedabad, Gujarat",
    "jaipur": "Jaipur, Rajasthan",
    "kochi": "Kochi, Kerala",
    "chandigarh": "Chandigarh, Chandigarh",
}


def _empty_frame() -> pd.DataFrame:
    return pd.DataFrame()


def normalize_country(country: str) -> str:
    """Map input to exact Indeed/Glassdoor country name for country_indeed."""
    key = (country or DEFAULT_COUNTRY).strip().lower()
    exact = INDEED_GLASSDOOR_COUNTRY_NAMES.get(key)
    if exact:
        return exact
    # Preserve Title Case input if it looks like a valid country name
    titled = country.strip()
    if titled.lower() in INDEED_GLASSDOOR_COUNTRY_NAMES:
        return INDEED_GLASSDOOR_COUNTRY_NAMES[titled.lower()]
    logger.warning(
        "Unknown country %r; defaulting to %s. Use an exact Indeed country name.",
        country,
        DEFAULT_COUNTRY,
    )
    return DEFAULT_COUNTRY


def _strip_country_suffix(location: str, country: str) -> str:
    """Remove trailing ', Country' when country_indeed already scopes the search."""
    loc = location.strip()
    country_lower = country.lower()
    for suffix in (country, country_lower):
        needle = f", {suffix}"
        if loc.lower().endswith(needle.lower()):
            return loc[: -len(needle)].strip()
    return loc


def _narrow_location_for_country(location: str, country: str) -> str:
    """Narrow location to city & state for Indeed/Glassdoor APIs."""
    loc = _strip_country_suffix(location, country)

    if country == "India":
        if "," not in loc:
            city_key = loc.strip().lower()
            loc = INDIA_CITY_STATE.get(city_key, loc)
        return loc

    # US-style "City, ST" and other "City, Region" strings pass through
    return loc


def _resolve_location(location: str, remote: bool, country: str) -> tuple[str, bool]:
    """
    Resolve location for JobSpy.

    Indeed and Glassdoor require country_indeed separately; use location only
    to narrow by city/state. For remote searches, leave location empty and set
    is_remote=True.
    """
    loc = (location or "").strip()
    if loc.lower() == "remote":
        return "", True
    if remote:
        return "", True

    country_norm = normalize_country(country)
    if not loc:
        return "", False

    narrowed = _narrow_location_for_country(loc, country_norm)
    return narrowed, False


def _scrape(
    site_names: list[str],
    search_term: str,
    location: str,
    remote: bool,
    country: str,
) -> pd.DataFrame:
    from jobspy import scrape_jobs

    country_indeed = normalize_country(country)
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        return scrape_jobs(
            site_name=site_names,
            search_term=search_term,
            location=location or None,
            results_wanted=RESULTS_PER_SEARCH,
            hours_old=HOURS_OLD,
            is_remote=remote,
            country_indeed=country_indeed,
            verbose=1,
        )


def fetch_jobs(
    search_term: str,
    location: str,
    remote: bool = False,
    country: str = DEFAULT_COUNTRY,
) -> pd.DataFrame:
    """Fetch jobs for one search term and location. Never raises — returns empty DataFrame on total failure."""
    country_norm = normalize_country(country)
    loc, is_remote = _resolve_location(location, remote, country_norm)

    logger.debug(
        "JobSpy params: country_indeed=%r location=%r is_remote=%s",
        country_norm,
        loc,
        is_remote,
    )

    try:
        df = _scrape(SITES, search_term, loc, is_remote, country_norm)
        if df is not None and not df.empty:
            return df
    except Exception as exc:
        logger.warning("Batch scrape failed for %r @ %r: %s", search_term, loc or "remote", exc)

    frames: list[pd.DataFrame] = []
    for site in SITES:
        try:
            df = _scrape([site], search_term, loc, is_remote, country_norm)
            if df is not None and not df.empty:
                frames.append(df)
                label = "Indeed" if site == SITE_INDEED else "Glassdoor" if site == SITE_GLASSDOOR else site
                logger.info(
                    "Recovered %d jobs from %s for %r @ %r (country=%s)",
                    len(df),
                    label,
                    search_term,
                    loc or "remote",
                    country_norm,
                )
        except Exception as exc:
            label = "Indeed" if site == SITE_INDEED else "Glassdoor" if site == SITE_GLASSDOOR else site
            logger.warning(
                "%s failed for %r @ %r (country=%s): %s",
                label,
                search_term,
                loc or "remote",
                country_norm,
                exc,
            )

    if not frames:
        return _empty_frame()

    frames = [f for f in frames if f is not None and not f.empty]
    if not frames:
        return _empty_frame()

    return pd.concat(frames, ignore_index=True)
