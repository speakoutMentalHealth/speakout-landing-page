# Home Learning educator-review foundation (development only)

## Implemented in this branch

Firestore rules define three new collections:
- `homeLearningReviewerAssignments/{assignmentId}`: approved platform administrators can create and delete immutable assignments. The assigned approved teacher and platform administrators may read the assignment. Assignment contains `reviewerUid`, `resourceId`, an immutable `resourceVersion`, and server-verified `assignedAt`.
- `homeLearningReviewSubmissions/{assignmentId}`: only an approved teacher with a matching assignment can create an immutable review submission. Submission contains `reviewerUid`, `resourceId`, matching `resourceVersion`, `reviewStatus: submitted_for_verification`, a 10–4000 character `findings` field and server-verified `submittedAt`.
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

## Version-pin migration note

The development rules now require `resourceVersion` on new assignments and corresponding submissions. Any previous staging-only assignment documents without this field must be reissued by an authorised administrator using a new assignment ID; do not populate a guessed version. The review client hides legacy assignments lacking this field. Version labels alone do not prove an immutable file revision; the eventual trusted service must pair them with a verified SHA-256 digest and authoritative source snapshot. This is a pre-production schema change; no production migration has been performed.

## Dry-run approval proposal module

`scripts/home-learning-approval-proposal.mjs` constructs a **proposal only** from evidence. It does not open Firestore, accept an HTTP request, authenticate accounts, deploy, publish content or grant approval. `tests/home-learning-approval-proposal.test.mjs` covers a synthetic valid proposal and invalid identity, credentials, version, content, audit-chain and timestamp inputs. The development CI workflow is configured to execute these tests.

The `verified` input is **not itself secure**. It must never come from a browser, client request or arbitrary caller. A future trusted service must construct it from independent database queries and verified authorization. No endpoint should import this module and directly trust caller-provided `verified`, `actor`, `decision` or source bytes.

The SHA-256 audit digest is a deterministic integrity identifier, **not** a digital signature or a tamper-proof audit log. The final architecture requires append-only server-side audit storage, restricted writer identities, sequencing, transaction checks, verifiable timestamps, monitoring and secure backup. Revocation and superseding content need a separate documented state machine.

### Required trusted-service flow (not yet implemented)
1. Verify the caller's identity and independently authorized editorial role in isolated staging.
2. Load the canonical versioned resource, source snapshot and hash from trusted content storage.
3. Load the administrator-issued review assignment and immutable teacher submission from the database.
4. Independently confirm actual reviewer qualifications, review scope, current assignment and separation from author and approver.
5. Verify evidence for real Nigerian curriculum sources, safety, accessibility, licensing and answer keys. Client-supplied checkboxes are not evidence.
6. Enforce transactional compare-and-set for resource version, duplicate decision prevention, authorization and prior audit head.
7. Write an immutable decision and audit event using trusted server credentials only after all checks succeed.
8. Keep public catalogue and AI index separate until publication controls and human sign-off are complete.

### Test and release blocker
Repository commits and CI configuration are **not** proof of a successful test run. The complete Firestore Emulator run and staging acceptance tests have not been confirmed. Until they pass, all review-to-approval service integration remains disabled.
