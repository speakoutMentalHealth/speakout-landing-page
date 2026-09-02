# DEPLOYMENT ORDER — SpeakHub Secure Learning

## 1. Firebase plan
Cloud Functions deployment requires a Firebase project configured for Functions. Use the Firebase CLI and the project's supported billing setup.

## 2. Initialize Functions (first time only)
From the repository root:

    firebase login
    firebase init functions

Choose:
- Existing SpeakOut Firebase project
- JavaScript
- Node.js 20
- Install dependencies

If `functions/` already exists, do not overwrite unrelated functions. Merge `index.js` exports instead.

## 3. Copy backend files
Copy:
- functions/index.js
- functions/package.json

Then:

    cd functions
    npm install
    cd ..

## 4. Deploy functions

    firebase deploy --only functions

Functions:
- syncCourseAssessments
- getLearningState
- markLessonComplete
- getAssessment
- submitAssessment
- reviewExternalCertificate (new — admin approve/reject/resubmission for external-course certificate submissions)

## 5. Run one-time assessment migration
Upload `secure-assessment-migration.html` temporarily to the site.
Sign in as approved admin and click **Secure Assessments** once.

This:
- creates private courseAssessments records,
- removes answer keys from public course docs,
- leaves only quiz metadata in the public course documents.

Remove the migration page from public hosting afterward.

## 6. Update Firestore rules
`firebase/firestore.rules` is the single source of truth — the learning-security
blocks (`courseAssessments`, `userProgress`, `certificates`, `externalLearningRecords`)
are already merged into it alongside the unrelated school/media/user rules.
There is no separate `firestore-learning-secure.rules` file anymore.

Deploy:

    firebase deploy --only firestore:rules

## 7. course-player.html (done)
`course-player.html` now calls the callable functions described in `CLIENT-INTEGRATION.md` instead of scoring locally or writing `userProgress`/`certificates` directly. No further edits needed here — this step is complete in the repo.

## 7a. Seed the flagship course content (new)
`firestore-seed/student-wellbeing-course.json` was enriched with real lesson content, module quizzes and a final assessment (previously it had titles only, no content or quiz questions). This file is not auto-imported — use whatever process you already use for the other `firestore-seed/*.json` files (e.g. `seed-learning-engine.html`/`.js`, or a manual Admin SDK import script) to write it into the `courses` collection at `courses/student-wellbeing-foundations-v1`. After importing, run step 5 (`syncCourseAssessments`) again so the new module/final quiz questions get moved into the private `courseAssessments` collection — otherwise `getAssessment` will return "Secure assessment record not found" for this course.

## 8. Test in this order
**Internal course (secure grading + certificate):**
1. New/cleared learner starts a course (e.g. Student Wellbeing Foundations, once seeded per 7a).
2. Attempt to click future lesson → blocked.
3. Complete Lesson 1 → Lesson 2 unlocks.
4. Finish module → quiz unlocks.
5. Submit deliberately wrong answers → score below pass mark; next module remains locked.
6. Submit passing answers → next module unlocks.
7. Finish all modules → 100%; final assessment unlocks.
8. Fail final → no certificate.
9. Pass final → one certificate is created.
10. Refresh/retry final → no duplicate certificate.
11. Try writing userProgress manually from browser → Firestore rejects.
12. Try reading courseAssessments from browser → Firestore rejects.

**External course (certificate submission + admin review):**
13. Learner opens `external-learning-submit.html?courseId=<id>` for an external course and submits a proof image → record status shows "Pending Review" on the dashboard.
14. Admin opens `admin-external-certificates.html`, sees the pending submission, and clicks **Approve** → a `certificates` doc with `type:"external-completion"` is created; the learner's dashboard card switches to "View SpeakOut Certificate"; `certificate-view.html?id=...` and `verify-certificate.html` both resolve it.
15. Repeat with **Reject** (with a reviewer note) → learner's dashboard shows the note and a "Resubmit Certificate" button linking back to `external-learning-submit.html`; resubmitting works (Firestore rules allow the learner to write their own record only when it sets status back to `pending_review`).
16. Confirm a non-admin account gets `permission-denied` calling `reviewExternalCertificate` directly.

## 9. App Check hardening
After the secure flow works, register the web app with Firebase App Check and then enable `enforceAppCheck: true` on the callable functions. Test App Check metrics before enforcement on an already-released site.
