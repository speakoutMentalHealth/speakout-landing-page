# SpeakOut Production Launch Sign-off

Date: 15 September 2026  
Environment: `https://speakoutmentalhealth.org`  
Status: **Not ready for final sign-off**

## Completed checks

- Production Firebase authentication succeeds for the student, teacher, parent, school-admin and super-admin test accounts.
- Test accounts are approved and scoped to the existing `demo-school` tenant.
- Teacher and parent overviews each return the linked UAT student with 10 progress records and 3 certificates.
- The normalized school-admin overview returns the four linked UAT profiles and their scoped learning records.
- The production Cloudflare learning API is deployed and its authenticated role endpoints return HTTP 200.
- The external-learning admin queue matches Firestore and exposes no private evidence URLs.
- Mobile checks at 390 x 844 found no horizontal overflow on the member-access page or public landing page.
- The mobile course player now keeps module navigation in a sticky, accessible bottom sheet and returns learners directly to the lesson after navigation.
- Internal lessons now use course artwork, estimated reading time, focused reading cards, styled content sections and reflection prompts instead of an uninterrupted wall of text.
- The public e-library now introduces its interactive reading features, identifies books that support listening, and gives internal books a clear `Read or Listen` action.
- The book reader now provides browser-native read-aloud controls (play, pause/resume, stop and four playback speeds), a focused reading measure, styled content blocks and a sticky mobile sections drawer.
- Certificate rendering no longer substitutes an email address for the learner name. New internal certificates store the human name separately from `recipientEmail`, while legacy certificates resolve the owner profile and fall back to `Learner` rather than printing an email address.
- The production player returned HTTP 200 with the new mobile and visual-learning components after deployment.
- The production library, book reader and certificate viewer returned HTTP 200 with their rollout markers after deployment.
- Production Worker version `15b8dbc2-0e59-4528-a91b-3038482c0d56` is active, and its unauthenticated learning-dashboard guard correctly returns HTTP 401.
- The current curriculum contains 15 published course records: 6 internal courses with 108 lessons (minimum 324 words; average 426 words) and 9 external learning pathways.
- The complete static regression suite passes: 49 tests, 0 failures.

## Open launch blockers

### 1. Public course catalogue permissions

The public SpeakHub catalogue currently shows zero courses and reports `Missing or insufficient permissions` because production rules require an approved session to read `courses`.

Course lessons are embedded inside each course document, so allowing public reads on `courses` would expose lesson content as well as catalogue metadata. That unsafe rule was never deployed and has been removed from the repository. The catalogue must instead load a deliberately filtered public metadata response while authenticated players continue reading protected course documents.

### 2. Authenticated visual walkthrough

The available in-app test browser cannot reach Firebase Authentication and reports `auth/network-request-failed`. Direct Firebase authentication and every authenticated API check succeed. A normal Chrome/Edge browser surface is required to complete the visual role walkthrough.

### 3. Performance trace

Chrome DevTools MCP is not configured in the current environment. No Core Web Vitals values have been invented or inferred. A real cold-load trace is still required for the landing page, SpeakHub catalogue, library and primary dashboards.

### 4. Analytics

No production analytics provider or measurement identifier is present in the deployable HTML or JavaScript. A provider, measurement property and privacy/consent policy must be selected before implementation.

### 5. Backups

The production Firestore database currently has zero scheduled backup policies. A retention policy must be approved and created, followed by a documented restore test.

## Required decisions

1. Implement and deploy a filtered public course-catalogue endpoint without exposing embedded lessons.
2. Select an analytics provider and supply its production site/property identifier.
3. Approve a Firestore backup policy. Recommended baseline: daily backups retained for 7 days and weekly Sunday backups retained for 14 weeks.
4. Enable the Chrome DevTools MCP service or provide an accessible Chrome/Edge test surface for authenticated visual and performance QA.

## Sign-off gate

Final production sign-off remains blocked until the five open items above are resolved and their production checks pass.
