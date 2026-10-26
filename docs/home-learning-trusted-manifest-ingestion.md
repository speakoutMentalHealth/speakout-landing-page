# Home Learning trusted manifest ingestion — controlled protocol

Status: **design only; no trusted manifest writer is enabled**.

## Separation of duties
1. GitHub Actions generates a `candidate-unverified` digest inventory from a pinned repository commit.
2. A qualified educator independently reviews the exact resource version, answer keys, age suitability, safeguarding, licence, and curriculum references. Record the reviewer's identity, evidence, date, and outcome.
3. An independent editor verifies the review, curriculum source, immutable Git commit, file path, and SHA-256 of the exact checked-out bytes. The editor must not be the reviewer.
4. A separately authenticated and audited ingestion service (not the browser, reviewer, or public callable) may create a trusted manifest only after checks 1–3 pass. It must use an allowlisted immutable commit and reject missing evidence, mismatched digests, duplicate assignments, and stale versions.
5. Each manifest must bind `assignmentId`, `resourceId`, `resourceVersion`, `resourceUrl`, `sourceCommit`, `contentSha256`, `reviewEvidence`, `verifiedBy`, and `status: trusted`. It must be immutable and written with create-only semantics. No client may write this collection.
6. Run Firestore emulator authorization tests and staging callable integration tests for absent, mismatched, stale, forged, and valid manifests. Confirm no editorial decision publishes a resource.
7. Publication requires a separate protected pull request, catalogue update, and production approval after all checks. A trusted manifest alone never publishes.

## Hard stops
- Do not derive trust from a client-supplied digest, the candidate report, or a reviewer self-approval.
- Do not mark any existing learning resources approved until the independent review evidence exists.
- Do not deploy ingestion to production before authenticated staging tests and human authorization.
- The current callable accepts only `request_changes` and `reject`; positive approval remains disabled.
