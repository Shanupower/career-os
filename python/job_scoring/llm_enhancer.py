"""Optional LLM score enhancement (stub for future Ollama integration)."""

from __future__ import annotations

from typing import Protocol


class ScoreEnhancer(Protocol):
    def enhance(self, job: dict, base_result: dict, intelligence: dict) -> dict:
        ...


class NoOpEnhancer:
    """Default: deterministic scores only."""

    def enhance(self, job: dict, base_result: dict, intelligence: dict) -> dict:
        _ = (job, intelligence)
        return base_result
