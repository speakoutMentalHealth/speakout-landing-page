# SpeakOut production and marketing readiness audit

Audit date: 3 October 2026 (Africa/Lagos). Baseline commit: `4293a99439f8bc9bc09550a06bb0a726952da898`.

**Decision: proceed with a controlled pilot after the listed fixes deploy; broad platform and paid conversion campaigns remain conditional on authenticated acceptance, recovery readiness and measurement.** The public website is already live. This is an audit of readiness, not a claim that every advertised service is unavailable.

## Evidence and limits

- Current main: Firebase Hosting, GitHub Pages and SpeakOut CI succeeded on 3 October. CI logs show 17 Firestore emulator tests passed. The platform API deployed successfully at commit `8891ad004f374e32fdae49e1d0cdb9dee411eea8`.
- Baseline repository suite: 255 passed, zero failed. Updated suite: 256 passed, zero failed. Most repository checks are structural/source checks; they do not establish a complete production learner journey.
- Latest recorded Firestore rules deployment found: 28 September, commit `4ba1b2d2b26e25cf0a20cf2d015eea149dbb8624`, successful. This is deployment evidence, not a fresh readback of the currently released rules.
- 25 public entry-page source files: zero missing local link/script/image/style destinations. This does not verify external destinations or every runtime route.
- Live browser: homepage, sign-in gateway, individual join panel and school registration panel rendered. No applications, accounts, emails or donations were submitted.
- Live TV loaded published videos, crash courses and an audiobook. The audiobook could be saved locally and opened in a YouTube embed. The player exposed its title and duration; sustained playback and resume behavior were not conclusively verified.
- The curator production audit succeeded. Its report includes 363 candidates, 307 pending, 28 drafted and 28 rejected; 106 learning candidates pending. It shows a published audiobook classified as `official_author`. This proves queue and publication state, not a legal determination or a fresh save-and-publish transaction.
- Paystack opened a donation form for Speakout Mental Health Outreach, with donor details and an NGN amount. No recurring-plan control was visible. Payment, receipt and settlement were not tested.
- Direct API requests from this audit's shell received 403 responses; the live browser successfully loaded TV data. The shell responses are an environment/access limitation and are not evidence of a production outage.
- No signed-in test accounts or cloud administrative credentials were available for this audit. No current Core Web Vitals measurement, backup configuration readback or restore drill was completed.

## Corrective changes in this release

1. Academy: use the approval boolean or approved status accepted by the existing role gate/API; add behavioral tests for accepted and denied profile states. This client check does not grant server permissions or normalize legacy records; Firestore still uses canonical approved status.
2. Academy: signed-out/pending states show unavailable statistics rather than zero inventory, clear stale course/progress state, disable unavailable filters and provide actionable sign-in/join links.
3. Academy: remove database implementation wording from the user-facing benefits.
4. Homepage: Latest Episodes now opens the Watch view; Programming Schedule opens the Live view instead of unsupported hashes.
5. Donations: describe the current checkout as one-time giving and replace the recurring-giving implication.
6. Hosting: exclude the internal internship-agreement DOCX from both Firebase and GitHub Pages output. The source file remains in a public repository and its history; owner review is still required. Hosting exclusion does not make public Git content private.

## Launch gates

| Area | Status | Required evidence / owner |
| --- | --- | --- |
| Latest hosting and baseline CI | Passed | Successful deployment and CI at the audited baseline; verify the corrective release separately. Technical owner. |
| Public entry routes and gateway panels | Passed within scope | Main public screens rendered; source destinations exist. Technical owner. |
| TV catalogue and published audiobook opening | Passed within scope | Catalogue, local saving and embedded player opening observed. Technical/editorial owners. |
| Full learner journey | Blocked by access | Approved test learner: registration/login, lessons, assessment, stored progress, certificate issuance and verification, logout and recovery. Technical owner + tester. |
| School and parent workflow | Blocked by access | Two school tenants; cross-school denial; parent sees only linked children; facilitator club creation; school-code verification; student approval; super-admin school support. Technical owner + KPA coordinator. |
| Admin publishing | Blocked by access | Save draft, publish, confirm public visibility, unpublish and confirm removal; include audiobook rights/category gates. Editorial owner + tester. |
| Approval consistency | Needs verification | Audit legacy profiles for inconsistent status/approved flags. Firestore checks canonical status while client/API support the boolean too. Verify suspended/rejected profiles are denied in every path; normalize records through trusted writes. Technical owner. |
| Impact figures and testimonials | Blocked by evidence | Validate 21+ schools reached, 30+ volunteers, 185+ summit participants, partner counts and testimonials; label plans/targets separately from delivered activity and distinguish engaged/onboarded/reached. Programme owner. No figures were invented or replaced. |
| Course/certificate marketing claims | Conditional | Match each promoted course to current price, provider, completion and certificate requirements. The Academy supports selected certificates and free/premium pathways; do not generalize all content as free and certified. Learning owner. |
| Donation success and receipt | Needs verification | Authorized test transaction, receipt and correct recipient/settlement; no automatic recurrence claim until a real plan exists. Finance owner. |
| Enquiry handoff and response | Conditional | Contact form prepares a WhatsApp message; it does not independently submit to an inbox. Confirm successful handoff, user-send step and a named responder. Programme owner. |
| Analytics and conversion reporting | Failed for measured campaigns | Current marketing layer only queues in-memory events; no production GA4/GTM identifier found. Select/configure reporting and verify actual completed conversions, not click or submit intent alone. Marketing + technical owners. |
| Search Console | Unverified external setup | Confirm property verification and sitemap submission in the account. Public code cannot establish this. Marketing owner. |
| Backups and recovery | Unverified, required before scale | Confirm current backup/export schedule and retention, then document a restore test. September's audit reported no scheduled backups; current absence is not asserted. Technical owner. |
| Monitoring and abuse protection | Needs verification | No App Check integration or explicit Worker application-level throttle was found in the reviewed code; provider-side protections remain unverified. Check auth quotas, signup/public-write abuse controls and operational alerts. Technical owner. |
| Mobile, accessibility and performance | Unverified for current release | Real Android/iPhone and desktop checks; keyboard, labels, contrast, overflow and slow-network journeys; collect current cold-load/performance evidence. Technical owner + testers. |
| Public internal document | Owner review required | Decide whether the internship agreement belongs in a public repository; move future private records outside it. Source/history remain public after hosting exclusion. Organisation owner. |

## Acceptance script

Use designated test records; do not enter real student health information during testing.

1. Learner: join, verify email/recovery where supported, approve through the trusted workflow, sign in, open a course, finish a lesson, leave/reopen, complete assessment, obtain and verify certificate, log out.
2. School A admin: verify school code/registration number, approve student and facilitator, create a flexible club, record a session and assignment, verify persisted reporting. School B must not read School A's learner records.
3. Parent: pair with the designated child through the verified workflow; see that child's allowed learning information; confirm an unrelated child's records are inaccessible.
4. Admin: publish and unpublish designated media; exercise audiobook category/rights checks; confirm public views update; reject/suspend a test profile and confirm access is denied across client, API and Firestore.
5. Marketing: follow a campaign-tagged link; complete a designated enquiry; verify the reporting destination receives a safe conversion and that the enquiry reaches the responsible person.
6. Finance: separately authorize a small test donation and check its receipt/settlement.
7. Operations: perform a backup and restore drill in an isolated destination; confirm alerting and rollback instructions.

## Recommended sequence

Deploy verified corrective changes. Validate the public release. Run authenticated acceptance with KPA/designated testers. Reconcile impact/certificate claims, reporting and recovery evidence. Start targeted campaigns for the journeys that passed; expand once the remaining relevant gates pass. Avoid adding optional features during this sign-off phase.
