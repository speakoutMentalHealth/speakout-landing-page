# SpeakHub priority course reconciliation — 15 October 2026

**Correction to earlier incomplete-starter inventory:** The six records in `firestore-seed/courses-starter.json` are metadata-only, but `firestore-seed/priority-courses.json` contains developed versions under the *same six stable IDs*. Do **not** create duplicates or conclude courses are missing because the starter file has no modules.

## Priority catalogue source

The checked-in `firestore-seed/priority-courses.json` contains **30 records**: six internal courses and 24 external courses.

| Internal course ID | Modules | Lessons | Final assessment question count in public catalogue metadata |
|---|---:|---:|---:|
| mental-health-awareness-students | 6 | 18 | 8 |
| student-leadership-foundations | 6 | 18 | 8 |
| digital-literacy-essentials | 6 | 18 | 12 |
| teacher-mental-health-support-basics | 6 | 18 | 12 |
| parent-communication-teen-support | 6 | 18 | 12 |
| mental-health-club-coordinator-training | 6 | 18 | 12 |

These are **repository source facts**, not verification that identical complete records exist in production Firestore or that their quizzes work in live user sessions.

## Important assessment separation

`firestore-seed/build-priority-courses.mjs` constructs module and final assessments from existing course material, then runs `publicInternalCourse()` to strip answer-bearing questions from the published catalogue payload. The public `priority-courses.json` therefore exposes assessment metadata rather than full answer keys. **Do not use this public file alone to import or overwrite secure assessment records.** Confirm private assessment migration and end-to-end scoring with the existing approved backend route.

## Publication and integrity gates

1. Read production Firestore course records by exact IDs, compare `modules`, `lessonCount`, `contentVersion` and secure assessment references with the source.
2. Do **not** overwrite richer production records with `courses-starter.json`.
3. Check the private assessment store exists before course promotion or reseeding; never put correct answers into public Firestore documents.
4. Compare the standalone `student-wellbeing-foundations-v1` against `mental-health-awareness-students` for overlap. Consider treating awareness as introductory and wellbeing as in-depth without changing existing progress IDs.
5. Test enrolment, progress/resume, module checks, final assessment and certificate issuance on staging as authenticated learners.
6. Mark as release-ready only after educational/editorial checks appropriate to each audience and explicit go/no-go review.
7. Maintain one browsing route through `speakhub.html` and one books-and-guides route through `my-library.html`, both linked from `learning-hub.html`.

## Editorial next step

Focus on **quality audits and gaps** for the existing 18-lesson leadership and digital-literacy courses, not generating duplicate lesson manuscripts. The earlier development brief assuming all six starter courses lacked lesson content must be interpreted as a metadata-only audit, superseded by this broader source inventory.

No Firestore writes or production course-status changes are authorised by this document.
