# Home Learning — Existing Platform Integration Audit

Date: 2026-10-24
Scope: source-code inspection on `feature/home-learning-pathways`. No live access, Firebase rules deployment, emulator run or browser security test performed.

## Confirmed existing components

- `js/auth.js`: Firebase Auth email/password and Google sign-in; role routing includes parent, teacher, student and school dashboards.
- `js/auth-guard.js`: client-side role and approval check for protected views. This is a user-experience gate, not a database security boundary.
- `firebase/firestore.rules`: Firestore rules for user profiles, schools, parent/student links, learning preferences, school resources and other collections. Rules already use approved-role and school-ID checks in several places.
- `teacher-dashboard.html` and `school-dashboard.html`: existing dashboard pages. New Home Learning views should link into these rather than duplicate their account flows.
- `js/firebase-config.js`: staging configuration selected only for specific staging hostnames; other hostnames select production configuration.
- `firebase.json`: Firestore emulator configured; Firebase Hosting serves static root files.

## Risks / implementation constraints

1. **Staging isolation:** A branch preview served from an arbitrary hostname can select the production Firebase project. Do not connect Home Learning test accounts or synthetic data until the environment is explicitly verified. Prefer an explicit build/deployment environment setting with fail-closed behavior for non-production previews, after auditing all dependent pages.
2. **Authorization:** Existing client-side role checks are not sufficient. All new Home Learning school, class, learner and assignment reads/writes must have matching Firestore rules and emulator tests.
3. **Role vocabulary:** Existing platform uses `school_admin`, `teacher`, `parent`, `student` and related roles. Preserve these instead of introducing conflicting names.
4. **Existing school data:** The rules already define `schools`, `parentStudentLinks`, and learning preferences. Audit existing documents and migrations before introducing overlapping collections.
5. **Child privacy:** Existing dashboard includes student-support features. Keep Home Learning educational progress separate from wellbeing, counseling and screening data. Do not populate child records during development.
6. **Testing:** The new static check workflow is committed, but successful execution has not been verified. Test rules with Firebase Emulator, then test on actual mobile browsers and print output.

## Recommended integration sequence

1. Audit the complete Firestore rules, existing dashboard JavaScript, school membership and parent-link workflows.
2. Design Home Learning collections compatible with existing school and role model; document access matrix.
3. Add Firebase Emulator tests for cross-school reads, guardian ownership, pending accounts and assignment permissions.
4. Connect teacher dashboard to approved resource catalogue; keep drafting tools publicly usable without accounts.
5. Add opt-in parent progress sync only after guardian consent and secure per-user rules.
6. Pilot with synthetic learners and approved adult accounts on verified staging.
7. Review accessibility, curriculum content and safeguarding before requesting production merge.

## Non-goals of this audit

This report does not certify the current rules as secure, approve the platform for handling minors' records, or authorize any production changes.
