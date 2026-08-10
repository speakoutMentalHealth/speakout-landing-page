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

## 5. Run one-time assessment migration
Upload `secure-assessment-migration.html` temporarily to the site.
Sign in as approved admin and click **Secure Assessments** once.

This:
- creates private courseAssessments records,
- removes answer keys from public course docs,
- leaves only quiz metadata in the public course documents.

Remove the migration page from public hosting afterward.

## 6. Update Firestore rules
Merge the blocks in `firestore-learning-secure.rules` into your complete current Firestore rules.
Do NOT delete your unrelated school/media/user rules.

Deploy:

    firebase deploy --only firestore:rules

## 7. Update course-player.html
Replace browser-side score calculation / progress writes / certificate writes with the callable functions described in CLIENT-INTEGRATION.md.

## 8. Test in this order
1. New/cleared learner starts Anxiety Management.
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

## 9. App Check hardening
After the secure flow works, register the web app with Firebase App Check and then enable `enforceAppCheck: true` on the callable functions. Test App Check metrics before enforcement on an already-released site.
