"""Unit tests for resume provenance verification."""

from provenance_checker import build_canonical_facts, check_provenance


def test_verified_metric_passes():
    profile = {
        "basicProfile": {"fullName": "Alex Dev"},
        "resume": {
            "rawText": "Built API serving 10k daily users",
            "parsedData": {"skills": ["React"], "projects": [], "education": [], "workExperience": [], "certifications": []},
        },
    }
    intelligence = {
        "experienceMap": {"projectHighlights": ["Built TaskFlow API serving 10k daily users"]},
        "skillsMap": {"technicalSkills": ["React"]},
    }
    facts = build_canonical_facts(profile, intelligence)
    passed, issues = check_provenance("Delivered 10k daily users on the platform.", facts)
    assert passed is True
    assert issues == []


def test_unverified_metric_fails():
    profile = {
        "basicProfile": {"fullName": "Alex Dev"},
        "resume": {"rawText": "Software engineer", "parsedData": {}},
    }
    intelligence = {"experienceMap": {}, "skillsMap": {}}
    facts = build_canonical_facts(profile, intelligence)
    passed, issues = check_provenance("Increased revenue by 500% in one quarter.", facts)
    assert passed is False
    assert len(issues) == 1
    assert "500%" in issues[0]


def test_build_canonical_facts_includes_profile_fields():
    profile = {
        "basicProfile": {"email": "alex.dev@example.com"},
        "resume": {"parsedData": {"skills": ["TypeScript"]}, "rawText": ""},
    }
    facts = build_canonical_facts(profile, {})
    assert "alex.dev@example.com" in facts
    assert "typescript" in facts
