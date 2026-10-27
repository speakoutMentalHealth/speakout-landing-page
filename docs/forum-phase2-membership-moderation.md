# SpeakOut Community — Phase 2 membership and moderation (stacked development branch)

**Status:** Closed, non-public, feature-gated. Not a live forum. Parent PR: #366 (room settings). This PR targets that branch, not production main.

## What is implemented
- Approved adult membership grants at `forumAccessGrants/{uid}`. Grant is manually created by existing approved site administrator following documented eligibility review. User's portal role must not be `student` and their canonical account status must be approved.
- Grant field `privateRoomIds` is the whitelist for private rooms; `moderatedRoomIds` grants a vetted moderator only specific room review authority in security rules. Ordinary users cannot edit grants.
- New `admin-forum-access.html` reviews an existing portal UID, with manual adult-verification confirmation, private-room assignment, and atomic audit event.
- New `admin-forum-review.html` provides an admin moderation queue, approval/removal actions using paired immutable `forumModerationAudits`, and safety report review. Delegated moderators have server-side scoped permissions but their own dashboard workflow is not in this PR.
- `forum.html` is a non-indexed preview route with discussions, replies and reporting modules, deliberately **not** added to public navigation. User submissions are always `pending`, and public listing only queries `approved` topics/replies.
- `firebase/forum-firestore.indexes.json` contains proposed query indexes; configure/deploy to staging before meaningful content tests.
- Updated Firestore rules specifically exclude forum collections from existing permissive admin catch-all. Room read permissions are enforced per document. Locks prohibit ordinary reading/posting; private memberships are explicit and revoked grants disable immediately at request time.
- Existing phase 1 `forumRooms` create/update policy **always requires `published == false`**. This is an intentional go-live gate. Emulator tests seed hypothetical published rooms with rules temporarily disabled solely to verify *future* policy.

## Security and product constraints
1. No forum for children; a user claiming to be an adult is **insufficient** without human adult verification. Do not store government ID scans or DOB in this UI.
2. MindCheck assessment/check-in data and private school records must not be read, shared or joined with forum profiles.
3. No private messaging, student/adult 1:1 contact, notifications containing private content, file uploads or open chat.
4. Public rooms cannot actually be published through browser/Firebase rules yet. A separate controlled backend, moderation rota, privacy review and security release are required before publish-capability is implemented.
5. Do not turn on collection permissions by loosening blanket rules or adding client-side `published` toggles.
6. Limit content and avoid clinical advice; reports are category-only and do not copy private case histories.
7. All moderator actions must generate immutable audit records in a Firestore batch.
8. Existing approved portal **school staff** eligibility does not grant access to private school data in the forum. Membership assignment is independent.

## Required staging validation
- Run `npm test` and `npm run test:rules` from an installed repository checkout.
- Verify Firebase rules syntax and Firestore emulator audit transaction tests pass.
- Verify public/private/locked/unpublished room reads across anonymous, adult member, unassigned adult, verified school-adult moderator, student, pending account and administrator.
- Verify client writes cannot publish, approve themselves, forge role/grants, add attachments or edit immutable audit logs.
- Verify moderator role cannot act on unassigned rooms or change room visibility.
- Verify grant revoke and private-room removal immediately deny access; no stale cached private content.
- Exercise admin form UX on a narrow Android device and iPhone, with keyboard-only navigation.
- Validate existing registration, course, parent/student, school and MindCheck flows remain unchanged.
- Establish monitored moderator shifts, an emergency/referral protocol and verified member onboarding before enabling publishing.
- Approve separate public launch PR only after security/privacy review and written operational signoff.

**Known remaining work:** production implementation of release authorisation, real member profile and interest discovery, robust report abuse throttling, spam detection, notification privacy, legal privacy/deletion/retention workflow, moderator capacity, cross-device QA, launch security review, and monitoring.

**Do not merge phase 2 before phase 1 has passed staging acceptance and been merged.**
