# SpeakOut Community — Phase 1 Administration Runbook

## Scope and release status
This change adds an **admin-only staging configuration** for six proposed forum rooms. It does **not** create a public discussion service. All room records contain `published: false` and Firestore denies non-admin reads of all room configuration, all forum topics, replies and membership records.

## Access and roles
- Entry: `admin-dashboard.html` → **Forum Rooms** → `admin-forum.html`.
- Uses existing `requireRoles(["admin","super_admin"])` and canonical Firestore approval/status checks.
- All forum-room changes require a paired, append-only audit record in the **same Firestore batch**. Rules verify prior and new states, actor, revision, timestamp and event identity.
- Each room has **independent** `visibility` (`public`, `members_only`, `private`) and `status` (`open`, `read_only`, `locked`). Reopening does not make a private room public.
- Room deletion and forum posting are disabled. Existing portal members have no forum access in this phase.

## Initial deployment sequence (not performed)
1. Review changes and run `npm test` and `npm run test:rules` in a checked-out repository with Node and Firebase Emulator.
2. Deploy Firestore rules to an authorized **staging** Firebase project; do not rely on static HTML to secure rooms.
3. Deploy web changes to staging. Sign in as an **approved** administrator and confirm admin navigation.
4. Select “Create missing starter rooms”. This creates six unpublished room configurations and immutable audit events only.
5. Verify: admin create, visibility update, lock/read-only/reopen; role and status denial; anonymous and approved non-admin cannot fetch room directly through Firestore SDK.
6. Check that no member or public portal can view unlaunched rooms, discussions, private attachments or room names.
7. Verify failed writes leave neither the room nor an audit record partially committed. Confirm event history in `forumRoomAudits`.
8. Verify mobile and keyboard accessibility; perform production readiness review **before** enabling any user discussions.

## Controlled failure modes and non-goals
- Missing or outdated Firestore rules means launch is blocked; do not merge website functionality expecting backend protections to follow later.
- No public `forum.html`, post composer, direct messages, invite flow, or user-generated discussion feature is enabled.
- Changing a room setting in admin does not yet change any real member access because publication is disabled.
- Forum data is not linked to MindCheck assessments, schools' private records or any child's account.
- Do not seed identifiable student content, sensitive disclosures or unlicensed media.
- Proposed public forum and private group read/write enforcement will need **separate** backend policy and emulator testing, plus moderation, consent, adult verification and incident playbook.
- This phase remains a draft PR until tests and staging acceptance pass; do not merge or deploy without review.
