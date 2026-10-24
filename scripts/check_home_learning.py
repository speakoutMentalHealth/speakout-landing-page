#!/usr/bin/env python3
"""Home Learning catalogue, review metadata and local-link validation."""
import json
import re
from datetime import date
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
PAGES = [
    "home-learning.html", "learning-hub.html", "learning-resource-catalog.html",
    "parent-learning-planner.html", "home-learning-progress.html",
    "teacher-learning-toolkit.html", "educator-ai-readiness.html", "early-years-counting-pack.html",
    "primary-home-learning-packs.html", "upper-primary-home-learning-packs.html",
    "junior-secondary-home-learning-packs.html",
    "senior-secondary-home-learning-packs.html",
    "secondary-science-home-learning-packs.html",
    "primary-science-home-learning-packs.html",
    "social-civic-home-learning-packs.html",
]
STATUSES = {"unreviewed", "in_review", "changes_requested", "approved", "retired"}
REQUIRED_FIELDS = {
    "id", "level", "subject", "topic", "resource_url",
    "curriculum_reference", "review_status", "reviewer", "reviewed_at", "license",
}
RESOURCE_ID = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
RESOURCE_PATH = re.compile(r"^[a-z0-9][a-z0-9/_-]*\.html$")

class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
    def handle_starttag(self, tag, attrs):
        href = dict(attrs).get("href")
        if tag == "a" and href:
            self.links.append(href)

def validate_catalogue(catalogue, root=ROOT):
    """Return actionable catalogue validation errors. Reject bogus approvals."""
    errors = []
    if not isinstance(catalogue, dict) or not isinstance(catalogue.get("resources"), list):
        return ["Catalogue must contain a resources list"]
    ids = set()
    for index, item in enumerate(catalogue["resources"]):
        if not isinstance(item, dict):
            errors.append(f"Resource {index}: expected object")
            continue
        ident = item.get("id")
        label = ident if isinstance(ident, str) else f"resource-{index}"
        missing = REQUIRED_FIELDS - item.keys()
        if missing:
            errors.append(f"{label}: missing fields {', '.join(sorted(missing))}")
        if not isinstance(ident, str) or not RESOURCE_ID.fullmatch(ident):
            errors.append(f"{label}: invalid resource ID")
        elif ident in ids:
            errors.append(f"{label}: duplicate ID")
        else:
            ids.add(ident)
        for field in ("level", "subject", "topic", "license"):
            value = item.get(field)
            if not isinstance(value, str) or not value.strip():
                errors.append(f"{label}: missing or empty {field}")
        path = item.get("resource_url")
        if not isinstance(path, str) or not RESOURCE_PATH.fullmatch(path):
            errors.append(f"{label}: invalid local resource path")
        elif not (root / path).is_file():
            errors.append(f"{label}: resource file missing: {path}")
        status = item.get("review_status")
        if status not in STATUSES:
            errors.append(f"{label}: invalid review status")
        if status == "approved":
            for field in ("reviewer", "curriculum_reference"):
                value = item.get(field)
                if not isinstance(value, str) or not value.strip():
                    errors.append(f"{label}: approved without {field}")
            try:
                reviewed = date.fromisoformat(item.get("reviewed_at", ""))
                if reviewed > date.today():
                    errors.append(f"{label}: review date is in the future")
            except (TypeError, ValueError):
                errors.append(f"{label}: approved without valid ISO review date")
        elif status in {"unreviewed", "in_review", "changes_requested"}:
            if any(item.get(key) for key in ("reviewer", "reviewed_at", "curriculum_reference")):
                # Metadata may be kept while a resource is under review; its presence
                # is never sufficient to confer approved status.
                pass
    return errors

def validate_pages(root=ROOT):
    errors = []
    for name in PAGES:
        page = root / name
        if not page.is_file():
            errors.append(f"Missing page: {name}")
            continue
        content = page.read_text(encoding="utf-8")
        if "<title>" not in content:
            errors.append(f"Missing title: {name}")
        parser = Links()
        parser.feed(content)
        for href in parser.links:
            parts = urlsplit(href)
            if parts.scheme or parts.netloc or href.startswith("#"):
                continue
            if not parts.path:
                continue
            target = (page.parent / parts.path).resolve()
            if not target.is_relative_to(root.resolve()) or not target.is_file():
                errors.append(f"Broken or unsafe local link: {name} -> {href}")
    for path in ("docs/home-learning-educator-review-template.md",
                 "docs/home-learning-school-roles-design.md",
                 "docs/home-learning-ai-tutor-safety-gate.md"):
        if not (root / path).is_file():
            errors.append(f"Missing required document: {path}")
    return errors

def main():
    errors = validate_pages()
    try:
        catalogue = json.loads((ROOT / "data/home-learning-catalog.json").read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        errors.append(f"Invalid or unreadable catalogue: {exc}")
        catalogue = None
    if catalogue is not None:
        errors.extend(validate_catalogue(catalogue))
    if errors:
        print("\n".join(errors))
        raise SystemExit(1)
    print(f"Home Learning checks passed for {len(PAGES)} pages and {len(catalogue['resources'])} resource groups. Educator, safeguarding, browser and emulator reviews remain required.")

if __name__ == "__main__":
    main()
