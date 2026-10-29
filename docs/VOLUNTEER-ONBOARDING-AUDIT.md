# Volunteer onboarding: audited flow and next implementation gates

## Baseline inspected (28 October 2026)

- Account registration: `auth/auth.html` supports `Volunteer` role. Individual accounts are created with `status: pending` and `approved: false`. A real administrator must approve them.
- Account fields: name, email, optional WhatsApp number, role, optional location, optional joining reason. These are not a complete role-specific volunteer intake.
- Existing volunteer pages: `pages/volunteer.html`, `pages/join-us.html` and MindCheck's `volunteers.html` / `training-hub.html`.
- Existing MindCheck training: five self-paced lessons; reading progress is stored on the device. The qualifying assessment opens an external Apps Script service. Neither lesson-progress nor verified assessment result is known to be reliably joined to a SpeakOut portal user.
- Identified routing defect: `volunteer` pointed to `student-dashboard.html` while access policy only allowed students there.
- There is no verified, role-specific, persisted onboarding checklist in the SpeakOut dashboard.

## Implemented on the draft branch (not yet deployed)

- Corrected volunteer role routing to a dedicated role-guarded `volunteer-dashboard.html`.
- Added a self-service intake form with city/state, work preferences, weekday availability, weekly hours, languages, interests, experience, safeguarding acknowledgement and optional email/WhatsApp updates.
- Intake is owned by the approved volunteer UID, with authoritative review stage/assessment/safeguarding/placement statuses readable but not writable by the volunteer.
- `firebase/firestore.rules` validates intake data and protects review decisions. The generic catch-all is explicitly excluded from the volunteer collection.
- Added `admin-volunteers.html` and `js/admin-volunteers.js` for administrators to review intakes and manually record independently verified milestones. Account approval stays in the existing admin area.
- Added `tests/volunteer-rules.emulator.test.mjs` and package scripts to verify owner-only intake, rejection of forged clearance and basic admin review rules.
- Public volunteer CTAs link to account registration before the training journey.
- The volunteer dashboard is explicit about unlinked MindCheck training records and manual messaging.

This is a staged MVP; **do not merge until all permission, regression, browser and operational gates pass.**

## Required backend work before describing onboarding as fully automated

1. **Volunteer intake** — Approved applicants complete a concise, accessible, secure form with availability, location (city/state only), languages, areas of interest, remote/in-person preferences, relevant experience, consent to contact and acknowledgement of safeguarding expectations. Do not ask for medical history, identity documents or beneficiary data at the initial stage. Age-band/guardian safeguards require separate review for minors.
2. **Authoritative data model** — Store `volunteer_profiles/{uid}` and admin-owned `volunteer_onboarding/{uid}` records (or an equivalent reviewed backend design). Access must be restricted to the authenticated individual and authorized coordinators. Do not permit client-side claims about approval, assessment passes or safeguarding clearance.
3. **Verified milestones** — Define application → account approved → intake submitted → induction started/completed → assessment pending/verified → safeguarding check → assignment eligible → active/paused. Distinguish portal-account approval from role/placement approval.
4. **Assessment integration** — Match external assessment to user identity via a signed one-time token or trusted backend verification. Never accept a user-edited localStorage value or pasted certificate text as authoritative evidence of completion. Reconcile pre-existing certificates with consent.
5. **Dashboard status and next action** — Read server-side milestones and present one clear next step, outstanding documents only when genuinely required, coordinator contact, public announcements, assignment opportunities and reports. Pending applicants must be able to see a safe status page without unrestricted portal access.
6. **Notifications** — Send transactional email on successful application, account approval, training result verification and placement invitation using approved templates, with reliable logs, retries and opt-out where appropriate. WhatsApp automation requires an authorized provider, explicit contact consent and approved template/process; until then provide a manual contact link only.
7. **Operations and safeguarding** — Name a coordinator and backup, review timetable, confidential escalation channel, data retention/deletion policy, volunteer role boundaries and incident procedure before piloting with people.
8. **Acceptance** — Test on iPhone and Android: sign-up; pending state; approval; correct redirect; intake save/resume; training completion; trusted assessment attestation; protected status change; email/WhatsApp communications; denied/revoked accounts; role leakage; offline and accessibility behavior.

## Current limits

This PR **does** implement volunteer intake persistence and a manually managed, server-authoritative review dashboard. It does **not** implement MindCheck assessment-to-account verification, automatic email/WhatsApp dispatch, automated placement scheduling, review-action audit history, a pending-applicant self-service status page or production deployment. Validate these before advertising fully automated onboarding.
