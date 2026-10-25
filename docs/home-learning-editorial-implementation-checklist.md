# Editorial approval implementation checklist

This checklist does not grant approval or change any public resource status.

## Before implementing the backend
- Confirm the production Firebase Functions deployment workflow and Node runtime.
- Keep approval writes limited to a trusted server and separate them from teacher submissions.
- Require approved administrator identity and an independent reviewer.
- Match each decision to the exact assignment ID, resource ID and resource version.
- Verify curriculum references, licensing, accessibility and safeguarding evidence.
- Compare the exact content fingerprint before publishing.
- Preserve immutable decisions and a separate publication audit trail.
- Keep all existing catalogue entries unreviewed until human sign-off.
- Test denial paths in the Firestore emulator and staging before production.

## Production acceptance
A release is not ready until automated tests, independent human review, rollback procedures and deployment verification all pass.
