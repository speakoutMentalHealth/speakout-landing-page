# Account approval and forum access

General rooms are signed-in adult community rooms, even when stored with `public` visibility. They are never anonymous or under-18 discussion spaces. No room is published automatically by approval.

## Administrator flow

In Admin Users, filter/select the accounts to review. Approve selected accounts, then confirm adult eligibility only if EVERY selected person has been independently verified as 18+. Approval and the associated forum grant/audit are committed atomically for each person. An account-only approval leaves existing forum eligibility unchanged and does not create adult eligibility. A failed account transaction is reported separately; successful accounts are not rolled back across the group. Existing private rooms and moderator roles are preserved.

Previously approved adults without a recorded grant can be selected and reviewed once through the same approval action. Do not mark unknown-age users as adults to work around access problems. Adult student grants additionally record `adultStudentVerified`; older student grants without that field remain denied. Under-18 communities are not implemented.

In Adult Member Permissions, search names/emails, filter roles, select eligible accounts and choose a private room. Adding members is audited and does not publish that room or promote moderators. Private publication continues to require the trusted pilot gate.

## Release checks

1. Pass Node, browser and Firestore emulator checks for the exact PR head.
2. Deploy compatible rules and the additive `forumRooms` discovery index. Verify the new index is READY before relying on general-room discovery.
3. Deploy website modules and admin HTML together. Old UI may still reject adult students conservatively until refreshed.
4. Review/create a general room as unpublished, then explicitly publish it. Do not convert private discussion history to general visibility; unpublish and create a separate general room.
5. Test with synthetic staging accounts: approved adult, pending, suspended, adult student, unverified student, and selected/unselected private members. Confirm that members cannot edit their eligibility or membership, that private rooms are not listed, and that guests cannot read general discussions.
6. Run the supervised iPhone pilot before wider rollout. No claim of production readiness from mocked browser tests alone.

Rollback: unpublish general rooms. A member's suspended account or inactive grant blocks reads/writes immediately at Firestore rules even if a stale page remains visible. Keep immutable audits. Do not delete existing grants, memberships or discussions.

Notifications/email are unchanged. This change does not send invitations or automatically notify room additions.
