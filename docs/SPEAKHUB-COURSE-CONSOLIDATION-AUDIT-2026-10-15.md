# SpeakHub unified course and book catalogue — source audit

**Date:** 2026-10-15  
**Scope:** Repository-only source inventory. This does **not** establish what is currently in production Firestore, nor certify editorial quality or live course completion.

## One umbrella, two pathways

- **Learning Hub:** `learning-hub.html`, with one **Courses** entry and one **Books & Guides** entry.
- **Courses:** `speakhub.html` (browse), `my-courses.html` (enrolled), `my-learning.html` (class / level); open internal and externally hosted courses through their existing detail/player IDs.
- **Books & Guides:** `my-library.html` (published library), `my-learning.html#materials` (class materials), audience libraries and `book-reader.html?id=...`.
- Maintain the distinction between public browsing and signed-in learning. Do not redirect authenticated routes or rename record IDs until learner-role and progress tests pass.
- External-provider courses stay labelled as external. Drafts never become public solely because a source file exists.

## Known source records

| Source | Count | Source status | Meaning / limitation |
| --- | ---: | --- | --- |
| `firestore-seed/courses-starter.json` | 6 | active | Starter **catalogue entries** only: no embedded `modules` were found. Do **not** treat these status flags as proof of course readiness. |
| `firestore-seed/student-wellbeing-course.json` | 1 | active | Student Wellbeing Foundations, 16 modules in source; verify learner assessment and clinical/editorial approvals separately. |
| `firestore-seed/kiddies-course-completion-review-v2.json` | 2 | draft | Six-session nursery and primary developmental manuscripts, awaiting teacher approval. |
| `firestore-seed/drafts/primary1-mathematics-six-lesson-review-v1.json` | 1 | draft | Six-session Primary 1 Mathematics developmental manuscript. |
| `firestore-seed/drafts/primary1-english-six-lesson-review-v1.json` | 1 | draft | Six-session Primary 1 English developmental manuscript. |
| `phase2-verified-courses.js` | additional curated entries | mixed | Existing curated catalogue, including external-provider pathways. Reconcile individual IDs with Firestore before calculating a de-duplicated total. |

**Important:** The eleven individually enumerated source records above are **not** a count of production courses, and may overlap with other catalogue sources. Six starter entries are marked active in source but lack embedded modules. Do not publish empty courses.

## Existing guide records

`firestore-seed/audience-guides.json` contains:
- `student-wellbeing-guide-v1`: 16 indexed chapters.
- `teacher-wellbeing-safeguarding-guide-v1`: 12 indexed chapters.
- `parent-caregiver-wellbeing-guide-v1`: 12 indexed chapters.

Guide content and publication-readiness source checks have been added to `tests/learning-hub-source-preflight.mjs`. A successful source preflight or hosting deployment does **not** prove Firestore record availability or individual learner permissions.

## Required reconciliation before content migration

1. Read current production `courses`, `books`, `userProgress` and `readingProgress` **through approved read-only administrative access**. Export minimal metadata only; exclude names, email addresses, personal reflections and individual progress records from public reports.
2. Compare records by exact stable `id`, then secondary title and provider signatures. Tag as **ready / incomplete / editorial-review / external / superseded / duplicate-candidate**. Never delete automatically.
3. For each course record verify modules, actual lesson words, assessment requirements, reviewed learning outcomes, external provider URL and rights, and certificate rules.
4. For each guide verify Firestore presence, reader chapter count, access rules, next/previous navigation and retained progress after refresh.
5. Introduce canonical catalogue navigation *without* copying or re-seeding a course as a second record. Preserve enrollment, progress, completion and verification IDs.
6. Publish draft school material only after mapped school scheme, exact NERDC outcome evidence, qualified subject-teacher signoff, safeguarding/accessibility review and a supervised pilot.
7. Run the existing source preflight and authenticated browser acceptance matrix on staging before production promotion.

## Release decision

**Proceed with non-destructive inventory and routing checks. HOLD Firestore imports, course activation, certificate changes and any destructive redirects until authenticated reconciliation is completed.**

### Suggested next implementation batch
- Add course record completeness indicators in admin-only UI (source status != publishable course).
- Provide one category filter/search on the existing SpeakHub catalogue and one search on the existing library without duplicating records.
- Link course related-book IDs and guide references wherever authoritative mappings exist; leave absent mappings blank rather than guessing.
