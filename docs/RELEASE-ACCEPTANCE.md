# Combined release acceptance

The combined workflow deploys one checkout's Firestore rules and Platform API Worker to `speakout-portal-staging`, serves that checkout locally, and runs approval, independent learning, school management, publishing, academic results API and academic results browser acceptance sequentially. It runs manually, on pushes to main, and on PR changes to its workflow or the support-session policy. All staging acceptance workflows share `speakout-shared-staging` concurrency with cancellation disabled to protect cleanup.

Required existing Actions secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `STAGING_FIREBASE_SERVICE_ACCOUNT_JSON`, `STAGING_CLOUDINARY_CREDENTIALS_JSON`. Missing credentials fail closed. Evidence includes the tested commit, environment scope, browser screenshots, summaries and cleanup reports, retained for 30 days in the combined artifact. Any suite failure keeps the workflow failed while subsequent suites still run after successful setup. GitHub concurrency is not a FIFO queue: pending runs can be replaced; always inspect the result for the exact intended release commit.

## Dependency findings

The root lockfile previously resolved `@grpc/grpc-js` 1.9.16 through Firebase's Node test dependencies. Five high-severity package findings propagated from that dependency, including GHSA-m9gg-hp2v-232j; the underlying package also reports GHSA-f596-whhp-79r4. A root override pins 1.14.6 without downgrading Firebase or rules-unit-testing. The root audit after installation reports zero vulnerabilities. This is a tooling dependency remediation; browser Firebase CDN versions and Cloud Functions dependencies are separate scopes. Verify emulator compatibility before merging. Do not close broader production dependency review from the root audit alone.

## Remaining release gates

- **Support activation enforcement deployed and staging verified:** a canonical-approved super-admin must start an actor-bound, school-bound session before school context is applied. One active school per admin; expiry is one hour. End revokes the session before writing its audit event. Direct browser access to session records is denied, including super-admin writes. Requests already authorized before termination may complete; subsequent school-context requests are rejected. This does not remove the super-admin role's separate root permissions. New unit, emulator and staging checks cover activation, scope, expiry and termination. All six suites passed on merged commit `2dfa41640c3e2ffe4fc0cfaa0909742de453554f` in combined run [37931836366](https://github.com/speakoutMentalHealth/speakout-landing-page/actions/runs/37931836366). Production Worker and Firestore rules deployments succeeded. Authenticated production acceptance remains open.
- Re-audit production approval data; test active-session revocation and all roles.
- Complete school-code signup and approval rather than relying on seeded school accounts.
- Run CMS browser publishing, alternate upsert/scheduling paths, consent/editorial rejection and rights downgrade checks.
- Complete password recovery beyond request acknowledgement.
- Validate real devices, accessibility and low connectivity.
- Perform backup and isolated restore; authorized payment receipt/settlement test; claims and operational-policy review.

## Deployment scope

This workflow does not publish production, deploy Cloud Functions, prove production parity, or serve the actual hosted frontend. Record production hosting, Worker, Firestore rules and Cloud Functions versions separately. The final gate is successful acceptance on the intended commit plus documented deployment parity and the remaining operational gates in issue #161.

## Board reconciliation

Issue #161 marks parent linking complete in Learn but incomplete in Schools. Programme attendance/assignments demonstrated by #167 do not automatically establish school-wide attendance/homework readiness. Reconcile those scopes; do not mark broader requirements complete solely from this UAT. Review open #109 against current onboarding before refresh/closure. #153 and #160 were superseded by #164.
