# Home Learning educator-review foundation (development only)

## Implemented in this branch

Firestore rules define two new collections:
- `homeLearningReviewerAssignments/{assignmentId}`: approved platform administrators can create and delete immutable assignments. The assigned approved teacher and platform administrators may read the assignment. Assignment contains `reviewerUid`, `resourceId`, and server-verified `assignedAt`.
- `homeLearningReviewSubmissions/{assignmentId}`: only an approved teacher with a matching assignment can create an immutable review submission. Submission contains `reviewerUid`, `resourceId`, `reviewStatus: submitted_for_verification`, a 10–4000 character `findings` field and server-verified `submittedAt`.

All other roles, all direct updates, and direct deletions of submissions are denied, including administrator client deletions. The generic administrator collection fallback explicitly excludes both collections.

## Limits and missing approval functionality

**No lesson approval is granted by these rules.** There is no client API that can mark a catalogue resource approved. No review UI has been connected to these private collections. The existing educator review queue remains read-only. The publicly served catalogue is a checked-in JSON file, not an authoritative server-side review database.

Do not interpret an approved user role as a verified teaching qualification. Administrators must verify a teacher's qualifications and independence from authorship before assigning any review. The chosen document ID is a stable assignment identifier, not a role credential. Once the review is submitted, its contents cannot be revised in place. Re-review needs a new administrator-issued assignment and a new submission ID; actual immutability applies to existing documents.

Do not add review findings containing child names, wellbeing information, personal details, or unlicensed copyrighted text. The findings field is not currently subject to server-side moderation or data-loss prevention.

## Required next steps before release

1. **Run the Firebase Emulator suite** on the development branch with `npm ci && npm run test:rules` and inspect rule compilation, errors, and any regressions.
2. Require verified staging Firebase selection to prevent experimental reviews touching production; the existing frontend configuration selects Firebase by hostname, so a GitHub feature branch is not itself an isolated Firebase environment.
3. Add a server-only trusted approval service with independent educator sign-off, versioned source hashing, actual curriculum references, documented authorization, and tamper-evident audit history.
4. Add tests for reviewer independence, duplicate assignments, stale approvals, revocations, child-privacy leakage, and cross-school authorization.
5. Add private, authenticated reviewer UI only after staging and rules are tested. Do not use the public `educator-resource-review-queue.html` as an authorization boundary.
6. Obtain educator, security, legal/privacy and child-safeguarding approval before production.

## Test scope

The new emulator tests cover administrator assignment, assigned-teacher read, unassigned-teacher denial, immutable review submission, forged approval denial, wrong-user denial and denied parent/pending/anonymous access. These tests were written but not executed in this environment. They require the project's emulator and dependencies.
