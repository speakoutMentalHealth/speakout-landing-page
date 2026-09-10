# SpeakOut canonical production data schema

Status: Phase 1 contract. Existing data is not migrated by this document.

## Trust model

- Browser clients may create their own pending account and submission records and edit a small set of profile fields.
- Role, approval, school membership, assessment results, progress, reviews and certificates are protected fields.
- Protected writes are performed only by an authorized administrator under Firestore rules or by the trusted Cloudflare Worker using Google IAM.
- Assessment answers exist only in `courseAssessments`, which no browser may read.
- Cloudinary stores public editorial media. Production private evidence uses a non-public Cloudflare R2 bucket; the isolated staging adapter may use authenticated Cloudinary assets. Firestore stores immutable asset metadata, never a reusable delivery URL.

## Collections

### `users/{uid}`

Identity/profile: `uid`, `email`, `firstName`, `lastName`, `fullName`, `phone`, `country`, `state`, `city`, `location`, `occupation`, `bio`, `photoURL`, `profileCompleted`.

Protected authorization: `role`, `status`, `approved`, `schoolId`, `schoolCode`, `premiumAccess`, `createdAt`, `approvedAt`, `approvedBy`.

Canonical roles: `student`, `parent`, `teacher`, `school_admin`, `ambassador`, `contributor`, `volunteer`, `admin`, `super_admin`. `school` is a temporary legacy alias for `school_admin`.

Canonical statuses: `pending`, `approved`, `rejected`, `suspended`.

### `courses/{courseId}`

Public-to-approved-user catalogue and lesson material: title, summary, provider, category, audience, level, access, price metadata, image URL, status, ordered `modules[].lessons[]`, assessment metadata and completion policy. It must never contain answer keys.

### `courseAssessments/{courseId__type__index}`

Private questions and answer keys: `courseId`, `type`, `moduleIndex`, `title`, `passMark`, `questions`, `version`. Browser reads and writes are denied.

### `assessmentAttempts/{attemptId}`

Server-written audit record: `userId`, `courseId`, assessment identity, score, pass/fail, answer digest, attempt number and timestamps. Raw answers should be retained only if policy requires them.

### `userProgress/{uid_courseId}`

Server-authoritative progress: `userId`, `courseId`, completed lesson IDs, passed module assessments, best scores, percentage, state, final-assessment state, certificate ID and timestamps.

### `certificates/{certificateId}`

Private full certificate record: owner, course, issuance policy/version, scores where required, status, certificate number, verification code and timestamps. Readable by its owner and administrators only.

### `publicCertificateVerifications/{verificationCode}`

Minimal public projection: recipient display name, award title, issuer, issue date, status and certificate number. Never include uid, email, score, evidence or reviewer information.

### `externalLearningRecords/{uid_courseId}`

Learner-associated submission metadata with `evidenceAssetId`, `evidencePublicId`, `evidenceVersion`, `evidenceFormat`, `evidenceResourceType` and `evidenceStorage`, plus provider details, status, reviewer identity/feedback and timestamps. The object key must remain under `speakout/private-evidence/{uid}/`. The trusted Worker creates pending submissions and permits resubmission only after rejection; only trusted reviewers can retrieve evidence, decide a record or issue a certificate.

### `books/{bookId}`

Published resource metadata and original SpeakOut reader content. Third-party works store metadata and authorized outbound links, not copied protected text.

### `bookSubmissions/{submissionId}`

Submitter-owned pending metadata, Cloudinary cover URL, rights declaration, review state and reviewer fields. Submitters cannot approve or publish their submission.

### `programmes/{programmeId}` and `media/{mediaId}`

Canonical public content collections for programmes and Cloudinary-backed media. The legacy `homepageMedia`, `newsEvents` and audience-specific resource collections remain supported until a reviewed migration.

## Compatibility and migrations

No destructive migration is authorized in Phase 1. Before production rules are deployed:

1. Export/backup Firestore.
2. Deploy and validate the Worker in staging.
3. Copy answer-bearing course assessments to `courseAssessments` and remove answers from `courses` in a reviewed migration.
4. Create public certificate projections without deleting full certificate records.
5. Normalize legacy aliases in a reversible batch with an audit log.
6. Deploy rules only after the secure clients have passed integration tests.
