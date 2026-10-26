# Home Learning — staging and launch acceptance gates

**Current release classification:** development preview; not production-approved.  
**Production Firebase project in repo:** `speaakout-portal` (from `.firebaserc`). **Do not use this as staging.**

## Automated technical gate
- [ ] Home Learning Integrity passes on the release commit (including Phase 127 auth tests and the real pinned-GitHub-byte smoke test).
- [ ] Home Learning Firestore emulator passes on the same commit (including rules + backend integration tests).
- [ ] Confirm the test run SHA matches the exact commit intended for release.
- [ ] Check results for skipped, flaky, or silently omitted tests; a green check alone is insufficient if a relevant job is missing.

## Separate Firebase staging project
- [ ] Create or identify a nonproduction Firebase project with its own Auth and Firestore; **never use `speaakout-portal` or real student records**.
- [ ] Record its project ID and appoint a person authorized to operate it.
- [ ] Deploy only the candidate-ingestion callable to this staging project after reviewing its environment settings. The callable defaults to disabled via `HOME_LEARNING_CANDIDATE_INGESTION_ENABLED`.
- [ ] Verify that the callable cannot ingest when disabled, even for an authenticated super administrator.
- [ ] Enable ingestion **only in staging**, using approved configuration and an explicitly pinned Git commit.
- [ ] Authenticate real staging test accounts: approved `super_admin`, teacher, ordinary user and logged-out user. Use synthetic identities; never copy production user data.
- [ ] Confirm unauthorized calls are rejected and that a forged `data.actorUid` cannot impersonate the authenticated user.
- [ ] Confirm the source is fetched from the approved Git repository at the immutable SHA, with exact SHA-256 and byte-length matches.
- [ ] Confirm mismatched version/hash, missing assignment, oversized/unsafe paths and repeat submissions are rejected.
- [ ] Confirm the only saved record is in `homeLearningManifestCandidates` with `status: candidate-unverified`; no document is created in `homeLearningTrustedResourceManifests`, `homeLearningEditorialApprovals` or published catalogue.
- [ ] Review callable audit logs and verify no private credentials or student data appear.
- [ ] Disable staging ingestion after the test or explicitly document ongoing staging access controls.

## Human educational review — still outstanding
The current catalogue contains **16 unreviewed resource entries across 8 unique HTML files**.
- [ ] Qualified educators review content correctness, answers, age suitability and Nigerian curriculum alignment with source citations.
- [ ] Record each assignment's reviewer identity, resource version, evidence, review date and permitted reuse/licence.
- [ ] An independent editor validates each submission and all corrected resource versions.
- [ ] Address child safety, accessible learning modes, language clarity and actual parent/learner feedback.
- [ ] Never copy `candidate-unverified` to `trusted` automatically. There is currently no authorized trusted-manifest promotion implementation; this is a future separately approved gate.

## Release acceptance
- [ ] Test actual parent, learner, teacher and admin journeys on iPhone, Android and desktop.
- [ ] Validate privacy, age-appropriate navigation, error handling, recovery and basic accessibility.
- [ ] Confirm staging smoke tests and a documented rollback procedure.
- [ ] Obtain written educational and operational sign-off for the minimum launch scope.
- [ ] Approve a separate protected GitHub content-release change and re-run checks.
- [ ] Only then authorize explicit production deployment and monitor the release.

## Reporting
Do not label this project **complete** on the basis of CI alone. Record separately:
1. Technical CI: unknown until the latest runs pass.
2. Staging integration: not yet executed.
3. Curriculum review: 0 of 16 resource entries currently marked reviewed.
4. Production approval: not granted.

A launch-readiness percentage is an approximation, not a measured pass rate; only mark a gate complete with verifiable evidence.
