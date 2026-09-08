# Staging migration dry-run review

Date: 2026-09-08  
Mode: read-only repository inventory; zero Firestore writes  
Decision: **not yet safe to migrate or deploy to production**

## Scope and limits

This preflight inspected the canonical repository seed, migration code paths, certificate clients and evidence schema. The staging Firestore database is newly created, so an empty staging inventory would not validate production data. Production document contents were deliberately not read or changed. A production backup and authenticated read-only inventory are still required before any production migration is authorized.

## Assessment inventory

`courses-seed.json` contains:

- 25 courses.
- 101 module assessments.
- 17 final assessments.
- 118 generated canonical assessment IDs, with no duplicate IDs.
- 448 questions; all 448 contain an answer key recognized by the current grading implementation.

These answer keys are still present in a repository-tracked public seed file. Copying this file directly to a browser-readable `courses` collection would disclose every answer. The safe migration must create private `courseAssessments/{courseId__type__index}` documents and replace each public assessment with metadata only. The old callable-function migration is not approved for use: its assessment writes and public-course redaction happen in separate commits, so interruption can leave a partially migrated state.

## Certificate inventory

No trustworthy Firestore certificate export is stored in this repository, so live counts, missing codes, duplicate codes and missing public verification projections cannot be certified locally. Static review found multiple legacy identifiers (`id`, `certificateId`, `certificateNumber`, and `verificationCode`) and legacy browser paths that query or write full `certificates` records directly.

Before a production certificate migration:

1. Export/backup Firestore and record the backup identifier.
2. Run the Worker's read-only `/v1/admin/assessments/migrate` inventory against an approved, authenticated snapshot.
3. Resolve missing or duplicate verification codes deterministically.
4. Create minimal `publicCertificateVerifications` projections without deleting or broadening access to full certificate records.
5. Reconcile orphan projections and test every legacy lookup route against a copied staging dataset.

## Evidence inventory

Legacy `proofData`, `proofUrl`, `evidenceUrl`, and `secureUrl` fields are migration exceptions. The admin page now refuses to display them directly. New submissions require complete authenticated Cloudinary metadata: asset ID, public ID, version, format and resource type. The Worker dry-run counts both legacy fields and partial secure metadata as incomplete.

## Deployment gate

The coordinated staging deployment remains blocked until all of the following are true:

- A separate Cloudinary staging product environment/account exists and authenticated delivery credentials are stored only as Worker secrets.
- A least-privilege Firebase staging service account exists and its private key is stored only as a Worker secret.
- The staging Worker has all five required secrets and an exact-origin CORS allowlist.
- The secure client is configured with the final staging Worker URL.
- The rules, Worker and client are deployed in the same controlled staging window.
- Emulator tests, Worker build checks, authentication, assessment, certificate and protected-evidence integration tests pass after deployment.

No migration write path is enabled by the current Worker. Its inventory endpoint reports `writesPerformed: 0` and rejects any request where `dryRun` is not exactly `true`.
