# Home Learning educator-review foundation (development only)

## Implemented in this branch

Firestore rules define three new collections:
- `homeLearningReviewerAssignments/{assignmentId}`: approved platform administrators can create and delete immutable assignments. The assigned approved teacher and platform administrators may read the assignment. Assignment contains `reviewerUid`, `resourceId`, and server-verified `assignedAt`.
- `homeLearningReviewSubmissions/{assignmentId}`: only an approved teacher with a matching assignment can create an immutable review submission. Submission contains `reviewerUid`, `resourceId`, `reviewStatus: submitted_for_verification`, a 10–4000 character `findings` field and server-verified `submittedAt`.
- `homeLearningEditorialApprovals/{approvalId}`: only approved platform administrators may read final approval records. All client-side create, update and delete operations are denied, even to admins. A future trusted server may write through the Admin SDK only after independently validating the review evidence.

All other roles, all direct updates, and direct deletions of submissions are denied, including administrator client deletions. The generic administrator collection fallback explicitly excludes all three collections.

## Limits and missing approval functionality

**No lesson approval is granted by these rules.** There is no client API that can mark a catalogue resource approved. A staging-only teacher reviewer screen (`educator-private-review.html`) can read assigned work and submit findings; its role checks in the browser are supplemental to Firestore rules. The public educator review queue remains read-only. The publicly served catalogue is a checked-in JSON file, not an authoritative server-side review database.

Do not interpret an approved user role as a verified teaching qualification. Administrators must verify a teacher's qualifications and independence from authorship before assigning any review. The chosen document ID is a stable assignment identifier, not a role credential. Once the review is submitted, its contents cannot be revised in place. Re-review needs a new administrator-issued assignment and a new submission ID; actual immutability applies to existing documents.

Do not add review findings containing child names, wellbeing information, personal details, or unlicensed copyrighted text. The findings field is not currently subject to server-side moderation or data-loss prevention.

## Required next steps before release

1. **Run the Firebase Emulator suite** on the development branch with `npm ci && npm run test:rules` and inspect rule compilation, errors, and any regressions.
2. Require verified staging Firebase selection to prevent experimental reviews touching production; the existing frontend configuration selects Firebase by hostname, so a GitHub feature branch is not itself an isolated Firebase environment.
3. Add a server-only trusted approval service with independent educator sign-off, versioned source hashing, actual curriculum references, documented authorization, and tamper-evident audit history.
4. Add tests for reviewer independence, duplicate assignments, stale approvals, revocations, child-privacy leakage, and cross-school authorization.
5. Verify the existing staging-only authenticated reviewer UI end to end after Firebase Emulator tests pass. Do not use the public `educator-resource-review-queue.html` as an authorization boundary.
6. Obtain educator, security, legal/privacy and child-safeguarding approval before production.

## Test scope

The emulator tests cover administrator assignment, assigned-teacher read, unassigned-teacher denial, immutable review submission, forged approval denial, wrong-user denial, denied parent/pending/anonymous access, and the server-only approval-record collection. These tests were written but not executed in this environment. They require the project's emulator and dependencies.
