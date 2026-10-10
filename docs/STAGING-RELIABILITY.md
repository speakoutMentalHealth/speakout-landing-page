# Staging reliability evidence

Issue: https://github.com/speakoutMentalHealth/speakout-landing-page/issues/187

The Unit 4 release passed on the third attempt of an unchanged commit. Earlier failures were a profile-seeding response and a disabled SpeakHub search field. Their causes are not established. A successful retry does not resolve this issue.

## Evidence added

- Approval fixture seeding records HTTP status, an allowlisted Google service error code and the synthetic scenario in `artifacts/approval-state-browser/profile-seed-failure.json`. Failed write attempts are included in fixture cleanup because a missing acknowledgement does not prove no write occurred.
- Both SpeakHub visits in the independent learner journey wait for an enabled search field for the existing 30-second timeout. Failure remains a test failure; there is no automatic navigation, write or authentication retry.
- `artifacts/independent-learner-browser/catalogue-unlock-failure.json` records bounded request failures, HTTP error statuses by service category, allowlisted Firebase console codes, classified loading/approval/sign-in notices and the disabled state. A separate trusted server profile read records only canonical status and response status/code, with a ten-second diagnostic timeout.
- Diagnostic files exclude URLs, query strings, payloads, raw messages, tokens, keys, email addresses and learner identifiers. Existing workflows upload these artifact directories even on failure.

## Interpretation and next action

A server-approved profile with an approval-pending browser notice establishes a disagreement, not its cause. SpeakHub currently converts missing profiles and caught profile-read failures into an unapproved fallback, so the notice alone cannot distinguish those cases. Firestore failure codes can support a read-failure explanation; authentication or SDK failures may prevent profile resolution entirely. An absence of HTTP errors does not prove success because Firestore streaming requests can return HTTP 200 with protocol-level errors.

Keep canonical approval enforcement and denied-state assertions intact. Use new failure evidence to decide whether a production fix or bounded transient-service retries are justified. Never retry away 401/403, change account approval to make a test pass, or infer a cached profile from the pending notice alone. Re-run the complete signup → trusted approval → login → catalogue journey and the approved/pending/rejected/suspended matrix after any implementation fix.

This diagnostics change does not modify production access behaviour. Stable results on one PR and its merged commit demonstrate those tested journeys only; they do not establish the root cause of the earlier failures or production Cloud Functions parity.
