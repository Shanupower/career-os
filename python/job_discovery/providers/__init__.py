"""Multi-provider job discovery."""

from providers.base_provider import JobProvider, build_canonical_job
from providers.provider_registry import PROVIDER_GROUPS, get_provider, resolve_providers

__all__ = [
    "JobProvider",
    "build_canonical_job",
    "PROVIDER_GROUPS",
    "get_provider",
    "resolve_providers",
]
