#!/usr/bin/env python3
"""Offline, synthetic Home Learning validation regression tests."""
import importlib.util
import tempfile
import unittest
from pathlib import Path

PATH = Path(__file__).resolve().parents[1] / "scripts/check_home_learning.py"
spec = importlib.util.spec_from_file_location("home_learning_check", PATH)
checks = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checks)

def resource(**overrides):
    original = {
        "id": "example-primary-math", "level": "Primary 3", "subject": "Mathematics",
        "topic": "Counting", "resource_url": "sample.html", "review_status": "unreviewed",
        "curriculum_reference": None, "reviewer": None, "reviewed_at": None,
        "license": "SpeakOut original draft"
    }
    original.update(overrides)
    return original

class CatalogueValidationTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        (self.root / "sample.html").write_text("<title>Test</title>", encoding="utf-8")

    def validate(self, *entries):
        return checks.validate_catalogue({"resources": list(entries)}, self.root)

    def test_unreviewed_sample_is_valid(self):
        self.assertEqual(self.validate(resource()), [])

    def test_unreviewed_sample_cannot_become_approved_without_evidence(self):
        errors = self.validate(resource(review_status="approved"))
        self.assertTrue(any("reviewer" in value for value in errors))
        self.assertTrue(any("curriculum_reference" in value for value in errors))
        self.assertTrue(any("review date" in value for value in errors))

    def test_approved_requires_valid_review_date(self):
        item = resource(review_status="approved", reviewer="Qualified reviewer",
            curriculum_reference="Verified source and outcome", reviewed_at="not-a-date")
        self.assertTrue(any("ISO review date" in value for value in self.validate(item)))

    def test_valid_approved_metadata_passes_syntactic_check_only(self):
        item = resource(review_status="approved", reviewer="Qualified reviewer",
            curriculum_reference="Verified source and outcome", reviewed_at="2026-01-01")
        self.assertEqual(self.validate(item), [])

    def test_invalid_path_and_duplicate_id_are_rejected(self):
        errors = self.validate(resource(), resource(resource_url="../secret.html"))
        self.assertTrue(any("duplicate ID" in value for value in errors))
        self.assertTrue(any("invalid local resource path" in value for value in errors))

    def test_missing_file_fails(self):
        self.assertTrue(any("resource file missing" in value for value in self.validate(resource(resource_url="missing.html"))))

    def test_unknown_status_and_missing_field_fail(self):
        data = resource(review_status="published")
        del data["license"]
        errors = self.validate(data)
        self.assertTrue(any("missing fields" in value for value in errors))
        self.assertTrue(any("invalid review status" in value for value in errors))

if __name__ == "__main__":
    unittest.main()
