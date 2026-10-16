# SpeakOut draft course and book review — 16 October 2026

## Confirmed source inventory and limitation

This is an inventory of the inspected repository sources, **not** an exhaustive Firestore audit, a full Nigerian curriculum approval, or a publication authorisation.

### Developmental courses (source drafts)
- `firestore-seed/kiddies-course-completion-review-v2.json`: 2 draft course outlines (Nursery and Primary), 6 sessions each.
- `firestore-seed/drafts/primary1-english-six-lesson-review-v1.json`: 1 draft, 6 lessons, now includes facilitator sequence, accessible formative checks, reteach guidance and teacher review gate.
- `firestore-seed/drafts/primary1-mathematics-six-lesson-review-v1.json`: 1 draft, 6 lessons, with the same teaching and review improvements.
- `firestore-seed/drafts/mental-health-awareness-students-review-v1.json`: 1 **alternative adaptation draft**, 8 modules / 16 lesson activities, overlapping the existing published-source course `mental-health-awareness-students`. Do not import under that ID without reconciling with the live course and clinical review.

Additional development materials exist under `content/kiddies/drafts/`, `data/academy-native-lessons.json`, and other school-specific sources. These should be reconciled by class, subject, unit and source status before authoring more material.

### Starter library source records
`firestore-seed/books-starter.json` currently has **29 records labelled active**, but this is not evidence that all 29 have full readable text.

- **8 contain substantial inline HTML content**: six SpeakOut-developed guides/handbooks and two public-domain titles (`pd-as-a-man-thinketh`, `pd-acres-of-diamonds`).
- **21 contain no inline `content` or `readerHtml` in this source**: 15 author-title catalogue entries (`author-*`) and six curated published-book references (`curated-*`). They may use external/licensed access in another system; they must **not** be fabricated into book-length manuscripts or described as complete in-platform texts merely because `status=active`.
- Do not reproduce commercial copyrighted full books without the necessary rights. For catalogue-only books, maintain metadata, authorship, lawful links and descriptions; distinguish **catalogue reference** from **full text available to read**. Independently verify publication rights and external links.

### Approval and release gates
1. Draft educational units require subject-teacher review, curriculum outcome mapping, safeguarding and accessibility review before any public import.
2. Mental health advice for children and teachers requires qualified safeguarding and mental-health review, without making unsupported diagnoses.
3. Leave published Firestore IDs, assessments, learner progress and certificates intact.
4. Book completion requires legitimate text access, licensed distribution or verified public-domain status plus enough readable chapters and proper attribution. Do not infer missing text from a title.
5. Verify the live library catalogue separately; source `status` is not proof of production visibility or reader accessibility.

## Next authoring order
1. Reconcile Nursery and Primary outlines against the available class-specific materials; fill only gaps.
2. Extend Primary 1 English and Mathematics in curriculum-mapped batches beyond the current 6-session development sample, with educator review.
3. Audit Primary 2–6 class resources for distinct lesson coverage before expanding manuscripts.
4. Review the existing 8 full-text book sources for chapter indexing, accessible rendering and citation/source rights.
5. Request source manuscripts/licensing from authors for catalogue-only entries before converting them into full in-platform books.

**This file documents a non-destructive editorial backlog; it does not change public publication status.**
