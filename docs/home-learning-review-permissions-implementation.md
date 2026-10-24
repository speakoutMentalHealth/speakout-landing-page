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

## Transactional commit preflight (design-only)

`scripts/home-learning-approval-commit-guard.mjs` inspects a proposed decision against a trusted resource snapshot, current audit-chain head, existing approval keys, current resource version and retirement state. The new unit tests in `tests/home-learning-approval-commit-guard.test.mjs` exercise rejection of replayed decisions, concurrent audit-head changes, tampered proposals, stale lessons, missing transaction state, retired resources and an already-active approval.

This is **not** a database transaction, approval endpoint or authorization mechanism. The `trustedState.transactional` flag is a caller-provided development contract and must never be accepted from an external request. The eventual server adapter must read this state **within the same atomic transaction** used to write the approval and append-only audit event. A failed preflight must produce no writes; a lost race must retry or reject, never proceed with stale results. A SHA-256 digest detects changes relative to trusted stored state but is not, by itself, a tamper-evident audit log.

Do not permit student data in approval submissions or audit payloads. Store signed reviewer evidence outside the public web root and enforce limited retention. Require separate human-reviewed paths for revocation and replacement of superseded teaching materials.

**Release blocker:** Neither these pure-function tests nor Firebase Emulator tests are confirmed passing in GitHub CI yet; production merging, deployment, AI tutoring, content publication and live approval writes remain disabled.

## Read-only approval rehearsal — Phase 30

`scripts/home-learning-approval-rehearsal.mjs` composes the existing evidence, proposal and commit guards through an injected, read-only snapshot provider. The caller's request may contain **only** a resource ID and assignment ID. The provider must independently authenticate an authorized server principal, establish staging isolation, load the current content and immutable review evidence, and supply the entire trusted snapshot; none of this can be inferred from the request.

The code exports no Firestore write operation, no HTTP endpoint, no model integration and no publisher. Its output contains only whether the rehearsal passed, safe error labels and minimal resource identifiers. Six new synthetic tests cover a nominal read-only rehearsal, rejected client flags, nonstaging/non-authenticated snapshots, ID mismatches, replay/stale-version failures and provider errors.

**Critical security limit:** The provider is an injected test contract, not a real authenticated backend. Its `authenticatedServerPrincipal`, `isolatedStaging` and `verified` values have no security significance when set by arbitrary code. Never expose the rehearsal to clients or activate approval writes based only on these booleans. The actual adapter needs independent credentials, reads within a real Firestore transaction, verified reviewer qualification and content snapshots, and audit/write authority isolated from the web application. Test results in GitHub Actions and Firebase Emulator still require confirmation.

## Phase 31: CI trigger coverage and snapshot-provider callback safety

The Firestore Emulator workflow now triggers on changes to the educator reviewer client, approval validators, proposal/commit guards, rehearsal, and their regression tests (in addition to rules changes). This prevents relevant approval-layer changes from silently skipping the dedicated security workflow.

The read-only rehearsal now ignores any result manufactured by a snapshot adapter. It requires its internal validation callback to be invoked **exactly once**. A provider that skips or repeats the callback returns a rejected result. Two synthetic regression tests cover those cases.

**Not a security authority:** An untrusted adapter can still fabricate a passing snapshot. No browser or arbitrary request may construct the provider, trusted flags, verified evidence or authorization identity. The rehearsal remains a non-deployable development aid. This change does not constitute verified staging isolation, server authentication, database transactions, educator approval, or AI release.

**Verification limitation:** GitHub source files and workflow triggers have been confirmed via the connected repository. This environment could not check out the repo over the network and has not verified a passing Firebase Emulator or GitHub CI run. No production deployments or data modifications occurred.

## Phase 32 — repeatable CI evidence and staging boundary regression

Two GitHub Actions workflows can now be invoked manually on the development branch using **Actions > Home Learning Checks** or **Actions > Home Learning Firebase Rules Tests > Run workflow**. They also retain their automatic push/PR triggers. The former checks the staging-host restrictions, Firebase project selection and server-only editorial approval write rules; the latter captures Firebase Emulator output. Both upload short-lived (seven-day) diagnostic log artifacts even when tests fail.

An observed **green GitHub run** with downloadable logs is required evidence for each workflow; a configured workflow, commit status without checks, or a successfully downloaded source file is not evidence of passing tests. In the event of a failed run, inspect the first failing assertion or Firestore rule compilation error and correct it on this branch before rerunning.

These static staging-boundary checks catch accidental edits to the configured host and approval-rule restrictions, but do **not** prove production credentials cannot be reached by other application code, nor independently validate Firebase project IAM. Confirm staging authentication, Firestore isolation, security rules deployment and an end-to-end teacher review on staging before trusting the pilot. No production merge or deploy is authorized.

## Phase 33 — stored review identity normalization

Firestore reviewer submissions deliberately omit an editable `assignmentId` field because their security rules permit only the six review content fields. The trusted approval validator still needs the assignment identifier to prove correspondence. `scripts/home-learning-review-snapshot.mjs` now derives `assignment.id` and `submission.assignmentId` from the matching Firestore **document IDs** supplied by a future trusted server read, while rejecting document ID mismatches, conflicting inline identity fields, inconsistent resource IDs, version changes, and reviewer changes.

The read-only rehearsal consumes `assignmentDocument: {id, data}` and `submissionDocument: {id, data}` instead of a fabricated client-supplied `assignmentId` in the submission body. Six regression test groups cover normalization success, malformed evidence and forgery. Both development workflows watch the updated adapter and tests.

This adapter does not authenticate database paths or retrieve documents. The eventual trusted server must enforce the exact collection paths, use Firebase Admin credentials only in a protected runtime and verify that the records were read from staging. Never construct the documents from an HTTP request body. Firestore Emulator and GitHub Actions passing results are still required.

## Phase 34 — explicit source-path and staging-project checks

The read-only rehearsal now rejects snapshots whose `projectId` is not exactly `speakout-portal-staging`. The stored-review normalizer also requires the assignment and submission snapshots to identify the canonical Firestore collections `homeLearningReviewerAssignments/{id}` and `homeLearningReviewSubmissions/{id}`, and it rejects unexpected fields in either stored document. New regression tests cover production-project identifiers, cross-collection paths and extra fields.

**Boundary:** The project ID and path properties are still provided by an injected adapter, which is not yet a trusted backend. A future real adapter must derive project ID from the Firebase Admin app and document paths from Firestore references after validating the server service account; these values must never be copied from browser requests. No live Firestore writes, approvals, deployments or AI functions have been enabled. GitHub Actions and Firebase Emulator results remain unverified.

## Phase 36 — no production Firebase initialization from private reviewer

The private reviewer now waits until the browser hostname matches one of the two explicit staging Firebase Hosting domains before dynamically importing the shared Firebase configuration module. It also checks the initialized Firebase app's actual `app.options.projectId` against `speakout-portal-staging` before attaching the teacher authentication listener. This avoids the previous eager import that initialized the production Firebase app even when the reviewer page was disabled on production hosts. A regression test guards the import ordering and project check.

The staging host gate is a client-side safeguard, not an authorization boundary: real permissions must still be enforced by Firestore rules and the future authenticated server. A misconfigured staging deployment or malicious client cannot be trusted based on JavaScript checks alone. CI and Emulator passing results have not been independently verified; no production deployment or data mutation was performed.

## Phase 37 — reviewer session race handling and draft-source disclosure

The staging reviewer now checks the active Firebase user and auth callback generation immediately after the profile read and after a submission completes, preventing stale asynchronous UI callbacks from displaying success under a different session. An ambiguous submission failure no longer claims no write occurred; teachers are instructed to reload and verify the submission state before retrying. The review screen explicitly warns that linked HTML drafts are mutable previews, **not** verified immutable content snapshots, and tells teachers to confirm the assigned source revision with the administrator.

These are UI safeguards, not transaction-level source integrity or authentication. The trusted approval service must verify a stored content digest, reviewer assignment, reviewer qualifications and actual content snapshot. No production merge or approval is enabled. The added regression tests are committed but their CI execution remains unconfirmed.

## Phase 38 — review submission recovery

When submission status is uncertain, the staging reviewer now reads the saved submission record before permitting another attempt. A confirmed existing record blocks retries; an unavailable verification requires reload. This does not replace Firestore security rules or end-to-end testing. No production release is authorized.

## Phase 39 — stage-gated SDK imports

The private reviewer no longer statically imports Firebase Auth or Firestore SDK modules before the staging hostname check. All three Firebase-related imports are now reached only inside the staging-host branch, with a subsequent project-ID verification before authentication starts. A static regression test checks that SDK imports stay behind this gate. These browser-level checks are defense-in-depth only: database rules must still enforce reviewer permissions. No passing GitHub Actions or Emulator run has been verified and no production deployment was performed.
