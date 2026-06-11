"""Provider registry and group resolution."""

from __future__ import annotations

from providers.ashby_provider import AshbyProvider
from providers.greenhouse_provider import GreenhouseProvider
from providers.instahyre_provider import InstahyreProvider
from providers.jobspy_provider import JobSpyProvider
from providers.lever_provider import LeverProvider
from providers.naukri_provider import NaukriProvider
from providers.remoteok_provider import RemoteOKProvider
from providers.wellfound_provider import WellfoundProvider
from providers.wwr_provider import WWRProvider
from providers.yc_provider import YCProvider

PROVIDER_CLASSES = {
    "jobspy": JobSpyProvider,
    "greenhouse": GreenhouseProvider,
    "lever": LeverProvider,
    "ashby": AshbyProvider,
    "wellfound": WellfoundProvider,
    "instahyre": InstahyreProvider,
    "remoteok": RemoteOKProvider,
    "yc": YCProvider,
    "wwr": WWRProvider,
    "naukri": NaukriProvider,
}

PROVIDER_GROUPS = {
    "all": [
        "jobspy", "greenhouse", "lever", "ashby", "wellfound", "instahyre",
        "remoteok", "yc", "wwr", "naukri",
    ],
    "india": ["instahyre", "wellfound", "jobspy", "naukri"],
    "ats": ["greenhouse", "lever", "ashby"],
    "ats-india": ["greenhouse", "lever", "ashby"],
    "remote": ["remoteok", "wwr", "jobspy"],
    "startup": ["yc", "wellfound", "ashby"],
}


def resolve_providers(spec: str) -> list[str]:
    key = (spec or "ats").strip().lower()
    if key in PROVIDER_GROUPS:
        return list(PROVIDER_GROUPS[key])

    names = []
    for part in key.split(","):
        name = part.strip().lower()
        if name and name in PROVIDER_CLASSES:
            names.append(name)
    return names or list(PROVIDER_GROUPS["ats"])


def get_provider(name: str):
    cls = PROVIDER_CLASSES.get(name.lower())
    if cls is None:
        raise ValueError(f"Unknown provider: {name}")
    return cls()
