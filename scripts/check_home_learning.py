#!/usr/bin/env python3
"""Standard-library static checks for SpeakOut Home Learning development pages."""
import json
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

ROOT=Path(__file__).resolve().parents[1]
PAGES=["home-learning.html","learning-hub.html","learning-resource-catalog.html","parent-learning-planner.html","home-learning-progress.html","teacher-learning-toolkit.html","early-years-counting-pack.html","primary-home-learning-packs.html","upper-primary-home-learning-packs.html","junior-secondary-home-learning-packs.html","senior-secondary-home-learning-packs.html","secondary-science-home-learning-packs.html"]

class Links(HTMLParser):
    def __init__(self):
        super().__init__();self.links=[]
    def handle_starttag(self,tag,attrs):
        d=dict(attrs)
        if tag=="a" and d.get("href"):self.links.append(d["href"])

def main():
    errors=[]
    for name in PAGES:
        path=ROOT/name
        if not path.is_file():
            errors.append(f"Missing page: {name}");continue
        html=path.read_text(encoding="utf-8")
        parser=Links();parser.feed(html)
        for href in parser.links:
            u=urlsplit(href)
            if u.scheme or u.netloc or href.startswith(("#","mailto:","tel:")):continue
            target=(path.parent/u.path).resolve()
            if not target.is_relative_to(ROOT.resolve()):
                errors.append(f"Outside repository: {name} -> {href}")
            elif u.path and not target.is_file():
                errors.append(f"Broken local link: {name} -> {href}")
        if "<title>" not in html:errors.append(f"Missing title: {name}")
    catalogue=json.loads((ROOT/"data/home-learning-catalog.json").read_text(encoding="utf-8"))
    ids=set()
    allowed_statuses={"unreviewed","in_review","changes_requested","approved","retired"}
    for item in catalogue["resources"]:
        ident=item["id"]
        if ident in ids:errors.append(f"Duplicate catalogue ID: {ident}")
        ids.add(ident)
        target=(ROOT/item["resource_url"]).resolve()
        if not target.is_relative_to(ROOT.resolve()) or not target.is_file():
            errors.append(f"Missing resource: {ident}")
        if item.get("review_status") not in allowed_statuses:
            errors.append(f"Invalid review status: {ident}")
        if item["review_status"]=="approved" and not (item.get("reviewer") and item.get("reviewed_at") and item.get("curriculum_reference")):
            errors.append(f"Approved without documented review: {ident}")
    if not (ROOT/"docs/home-learning-educator-review-template.md").is_file():
        errors.append("Missing educator review template")
    if not (ROOT/"docs/home-learning-school-roles-design.md").is_file():
        errors.append("Missing school roles design document")
    if errors:
        print("\n".join(errors));raise SystemExit(1)
    print(f"Static checks passed: {len(PAGES)} pages, {len(ids)} catalogue groups. Browser, accessibility, educator and print reviews still required.")

if __name__=="__main__":main()
