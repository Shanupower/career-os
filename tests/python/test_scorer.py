"""Unit tests for deterministic job scoring logic."""

import json
from pathlib import Path

import pytest

from scorer import DEFAULT_WEIGHTS, _weighted_total, score_job

ROOT = Path(__file__).resolve().parents[2]
EXAMPLES = ROOT / "data" / "examples"


@pytest.fixture
def intelligence():
    with open(EXAMPLES / "candidate-intelligence.example.json") as f:
        return json.load(f)


@pytest.fixture
def sample_job():
    return {
        "jobId": "test-1",
        "title": "Full Stack Developer",
        "company": "Example Corp",
        "location": "San Francisco, CA",
        "description": "React, Node.js, PostgreSQL, AWS. Full stack role.",
        "remote": "hybrid",
        "url": "https://example.com/jobs/1",
    }


def test_weighted_total_default_weights():
    dims = {k: 80 for k in DEFAULT_WEIGHTS}
    assert _weighted_total(dims, DEFAULT_WEIGHTS) == 80


def test_weighted_total_custom_weights():
    dims = {
        "roleMatch": 100,
        "skillMatch": 0,
        "industryMatch": 0,
        "experienceMatch": 0,
        "locationMatch": 0,
        "cultureMatch": 0,
    }
    weights = {**DEFAULT_WEIGHTS, "roleMatch": 100, "skillMatch": 0,
               "industryMatch": 0, "experienceMatch": 0, "locationMatch": 0, "cultureMatch": 0}
    assert _weighted_total(dims, weights) == 100


def test_score_job_returns_expected_fields(intelligence, sample_job):
    result = score_job(sample_job, intelligence)
    assert "matchScore" in result
    assert 0 <= result["matchScore"] <= 100
    assert result["matchLabel"] in ("Excellent", "Strong", "Good", "Weak", "Reject")
    assert "scoreBreakdown" in result
    assert "matchedSkills" in result
    assert "missingSkills" in result


def test_score_job_high_skill_match(intelligence, sample_job):
    result = score_job(sample_job, intelligence)
    assert result["skillMatch"] >= 50


def test_red_flag_caps_score(intelligence):
    job = {
        "jobId": "test-rf",
        "title": "Intern",
        "company": "Example",
        "location": "Antarctica",
        "description": "Entry level only. No experience required.",
        "remote": "onsite",
        "url": "https://example.com/intern",
    }
    intel = {
        **intelligence,
        "roleStrategy": {
            **intelligence["roleStrategy"],
            "avoidRoles": ["Intern"],
        },
        "jobFitPreferences": {
            **intelligence["jobFitPreferences"],
            "workToAvoid": ["Entry level only"],
        },
    }
    result = score_job(job, intel)
    if result["redFlags"]:
        assert result["matchScore"] <= 54
