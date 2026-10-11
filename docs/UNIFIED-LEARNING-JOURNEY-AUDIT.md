# Unified SpeakOut learning journey — navigation audit (2026-10-11)

## Verified current routes
- Public Academy landing: `pages/academy.html`; includes course browsing and separate Primary development preview.
- Public SpeakHub catalogue: `speakhub.html`; routes course cards to `course-details.html` or `course-player.html`, depending on course type.
- Alternate SpeakHub page: `learning/speakhub.html`; separately routes to `courses.html`, `course-player.html` and `course-details.html`.
- Authenticated `my-learning.html`: learner section/class selector with **Courses and units** and **Materials** tabs, driven by `js/learner/my-learning.js` and education-level filtering.
- Authenticated `my-courses.html`: enrolled-course dashboard with SpeakHub catalogue CTA, driven by `js/learner/my-courses.js`.
- Authenticated `my-library.html`: books/guides dashboard driven by `js/learner/my-library.js`.
- Primary sample hub `pages/primary-learning-home.html` and sample questions `pages/primary-learning-preview.html`: unapproved development preview, not student curriculum catalogue.

## Information architecture to implement
**Explore** (public catalogue) → **Course detail** (source, audience, prerequisites, external-provider label) → **Enrol / sign in** → **My Courses** (only actual enrolments) → **Course player** (resume/progress) → **Materials** (resources linked to the same course/unit, plus clearly labelled standalone library) → **Completion** (where supported).

School track: **My Learning** → **Stage / class** → **Subject** → **Approved unit** → **Lesson** → **Attached materials** → **Practice / assessment** → **Progress**. Do not mix unapproved draft units into approved learner views.

## Non-negotiable migration rules
1. Keep external-provider courses visibly marked as external; do not silently merge their content with SpeakOut-owned units.
2. Use stable course/unit identifiers across catalogue, enrolment, lesson, resource and progress; document existing identifiers before changing schema.
3. Preserve existing Firestore records, role access, enrolment and progress. No redirects or replacements until route and permission tests pass.
4. A material should link to its parent unit/course where known; standalone library resources remain discoverable under Library.
5. One shared navigation vocabulary: Explore Courses, My Courses, My Learning, Materials & Library, Continue Learning.
6. Desktop/mobile keyboard, zoom and screen-reader testing required before declaring completion.

## Outstanding verification
- Inspect actual catalogue/enrolment/learning Firestore queries and schemas and reconcile IDs; **not yet done**.
- Trace authenticated learner route and resource link resolution end-to-end with test accounts; **not yet done**.
- Confirm which of the two SpeakHub pages is canonical before redirects; **not yet done**.
- Verify existing external course provider links and their availability; **not yet done**.
- Confirm partner-school curriculum source and teacher approval before publishing school draft content; **not yet done**.
