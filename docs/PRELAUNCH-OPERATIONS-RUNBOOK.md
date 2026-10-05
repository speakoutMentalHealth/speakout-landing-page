# SpeakOut pre-launch operations runbook

Last updated: 5 October 2026.

This runbook separates code-ready work from production actions that need named authorization, credentials, factual confirmation or a potentially disruptive write.

## P0 — authentication and security

1. Run **Approval Data Preflight** in `audit` mode. The workflow reports aggregate status only and does not print names, email addresses or user IDs.
2. Review counts for missing canonical status, stale `approved=true` flags and legacy-flag mismatches.
3. Do not grant access by converting a legacy boolean into `status="approved"`. Missing or ambiguous status stays denied until manually reviewed.
4. If Jerry approves the production write, rerun the workflow in `normalize` mode with confirmation `NORMALIZE_APPROVAL_FLAGS`. This only makes the legacy boolean mirror canonical status.
5. Re-run the audit. Only after the stale-flag count is zero should the canonical-status access PR be merged and deployed.
6. Perform authenticated browser acceptance for rejected, suspended, pending and approved users across client, API and Firestore.

## P0 — KPA authenticated acceptance

Use designated test records only. Do not use private student health data.

- Student: register with school code and registration number; wait for approval; sign in; open learning; save progress; complete assessment; obtain and verify one certificate; sign out and recover access.
- Facilitator/teacher: join the school; receive approval; create a flexible club; record a session; upload a session review; verify school tenancy.
- Parent: pair only through the approved child-linking workflow; verify access to the linked child's allowed information; verify an unrelated child is inaccessible.
- School admin: approve and reject designated test users; review sessions/resources; verify school-scoped records; test reversible admin actions before destructive ones.
- SpeakOut super admin: perform the same permitted school-admin support actions; verify cross-school access is intentional, logged and not exposed to ordinary roles.
- Tenant isolation: create School A and School B fixtures and prove School B cannot read or modify School A learner, club or reporting records.

Any failure in role isolation, approval enforcement, assessment scoring or certificate idempotency blocks full production reliance.

## P1 — backup and restore

A backup is not considered launch-ready until a restore has been proven.

Required owner decisions:
- GCS backup bucket and region.
- Retention policy.
- Isolated staging project/database used for restore drills.
- Person accountable for weekly restore evidence.

Recommended policy, subject to Jerry's approval: daily exports retained 7 days and weekly exports retained 14 weeks.

Before scale:
1. Record the production project ID, database ID and backup bucket.
2. Export Firestore using the production service account.
3. Record export URI, timestamp and object count.
4. Restore the export into an isolated non-production project/database.
5. Verify representative schools, users, courses and progress records.
6. Record restore duration and any permission/index failures.
7. Never test a restore by importing over the live production database.

## P1 — mobile and accessibility

For Home, Contact, Donate, SpeakHub, TV, learner dashboard and school admin:
- iPhone Safari and Android Chrome at narrow widths.
- Desktop keyboard-only navigation.
- Visible focus, logical focus order and no keyboard trap.
- 200% text zoom without clipped controls.
- Form labels/status announcements and 44px touch targets.
- Reduced-motion behavior.
- Horizontal overflow checks.
- Slow-network pass for primary CTA and sign-in journeys.

Repository regression tests cover static primitives; real-device acceptance remains required.

## P1 — SEO and performance

Code-ready:
- Canonical URLs and sitemap are present on public launch surfaces.
- Protected surfaces remain excluded from the public sitemap/robots rules.
- Daily live public-route smoke checks are automated.

External/account action required:
- Verify the exact production property in Google Search Console.
- Submit `https://speakoutmentalhealth.org/sitemap.xml`.
- Request recrawl of corrected donation/Academy pages.
- Capture current mobile and desktop Lighthouse/Core Web Vitals evidence for Home, SpeakHub, TV and dashboards.

Do not install GA4/GTM or advertising consent behavior until Jerry approves the measurement/consent model and provides the correct property/container identifiers.

## P1 — forms and donations

Contact:
- The website prepares a WhatsApp message locally; it does not claim to submit to an inbox.
- Verify the handoff on iOS, Android and desktop popup-blocked conditions.
- Assign a named operational responder and response-time expectation.

Donation:
- Current copy must remain one-time unless a real recurring plan is configured.
- A real Paystack transaction, receipt and settlement check requires finance authorization.
- Do not use real student data in payment metadata.

## P1 — learning resources and learner journey

Before marketing any course as certified/free:
- Confirm provider, current price, completion requirement and certificate condition.
- Verify course start, progress persistence, module assessment, final assessment, certificate issuance and verification.
- Verify refresh/retry cannot create duplicate certificates.
- Verify external YouTube/audiobook sources still satisfy the editorial rights/category gate.

## P1 — admin workflows

Verify with designated test content:
- draft -> publish -> public visibility -> unpublish -> removal;
- school approval/rejection;
- facilitator club creation and session reporting;
- parent-child linking;
- TV/audiobook rights gates;
- reversible school administration first.

Permanent school deletion remains a destructive operation and should only be exercised against a disposable test tenant unless Jerry explicitly authorizes a production deletion.

## Inputs still required from Jerry

- Approval to run production legacy-flag normalization after reviewing audit counts.
- Backup bucket, retention policy and isolated restore target.
- Authorized Paystack test amount and settlement recipient.
- Search Console ownership/access.
- GA4/GTM/AdSense consent decision and identifiers if those products are to launch.
- Factual validation of public impact numbers and testimonials.
- Approval of any public Terms, safeguarding or data-retention policy after appropriate review.
- Decision on whether the internal internship agreement should remain in the public GitHub history.
