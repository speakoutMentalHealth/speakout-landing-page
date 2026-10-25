# Home Learning editorial publication gate

Status: design specification only. No approval publishing service is active.

## Required sequence
1. A privileged administrator assigns an approved teacher to an exact resource ID and version.
2. The teacher submits immutable findings. Submission is a recommendation, not an approval.
3. An independent editor verifies the teacher's qualifications, curriculum edition and learning outcomes, factual accuracy, answer keys, safeguarding, accessibility, and copyright permissions.
4. A trusted backend independently re-reads the assignment, submission, approved editor identity and current content version. It must reject self-approval, stale content, missing evidence, invalid roles and any mismatched IDs.
5. The backend computes a SHA-256 digest of the exact content approved and writes an append-only decision record with editor UID, reviewer UID, assignment ID, curriculum source, evidence references, decision rationale, timestamp, content digest and next review date.
6. Only after a successful independent approval may a separate publication job update the canonical catalogue in GitHub, with review metadata and an audit-linked content digest. Require protected-branch review and CI checks. A database approval alone must never alter a static catalogue label.
7. On any content change, mismatch, revoked reviewer credentials, or expired review, the public interface must revert to unreviewed/pending verification until a new review is completed.

## Access control
- Client Firestore writes to homeLearningEditorialApprovals remain denied.
- Reviewers can only submit against assignments issued by an approved administrator.
- Editors must be distinct from the assigned reviewer.
- Do not use client-side role flags as an authorization source.
- Preserve immutable records; corrections require a new decision record, never overwriting prior evidence.
- Never include children's identifying or sensitive information in review findings.
- A future backend must authenticate server-side, validate authorization, enforce idempotency, and record failed attempts without leaking private data.

## Acceptance gates before production
- Security rules emulator tests for unauthorized reads/writes and privilege escalation.
- Backend unit and integration tests for self-approval, duplicate decision, tampered content, stale version, rejected content and missing evidence.
- Deployment and rollback procedures documented and exercised in staging.
- Human editorial and safeguarding review of each class pack.

All 16 existing catalogue resource groups remain unreviewed. No automatic or AI-based approval is permitted.
