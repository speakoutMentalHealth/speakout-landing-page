# Volunteer pilot — branch safeguards and certificate assurance handoff

**Date:** 2026-11-01. **Decision:** NO-GO for a real-volunteer pilot until all blocking evidence is signed off.
Tracks [SpeakOut #409](https://github.com/speakoutMentalHealth/speakout-landing-page/issues/409) and [MindCheck #81](https://github.com/speakoutMentalHealth/MindCheck/issues/81).

## Evidence at review
- On `main` SHA `ead4537ead7c2e3f7d2cfbdfe1dab1d52e11b4ec`, GitHub's branch endpoint returned `protected: false` with status-check enforcement `off`, and the repository rulesets list was empty.
- Both connected GitHub accounts received 403 when reading the branch-protection *details*. A 403 alone would not prove an unprotected branch; the independently returned branch metadata **does**.
- Ordinary Node and Firestore security rules CI passed at that SHA, but not every release test is configured to run for every commit. A green CI job is not proof that it is mandatory for merging.
- Prior volunteer synthetic browser, staging release, and production deployment workflows have passed on specific different commits. They do not replace live permission tests or prove identity/revocation for MindCheck certificates.
- `MindCheck/verify.html` validates `ok === true` plus a matching returned certificate ID from an external Apps Script deployment. The server source and authoritative pass/issuer/recipient/revocation logic have not been independently inspected.

## Read-only automated signal

The `Volunteer Pilot Branch Safeguard` workflow runs on pull requests and on an explicit manual dispatch. It tests the classifier and queries **only the GitHub branch metadata** for `main`. When the branch is not protected, the job **fails by design**. Do not bypass this failure or mark the pilot ready to make CI green.

The workflow is intentionally lightweight (no staging, billing, Firebase writes, email, volunteer data or deployment). Its successful result attests **only** that GitHub reports the target branch as protected, *not* that seven release checks are configured or that the pilot is safe.

## Repository administrator action — required

1. Sign in as a repository owner/admin; open **Settings → Rules → Rulesets** (or Branches for classic branch protection). Target only `main`, set the rule to active, prevent deletion and force pushes, require pull requests before merging, and require at least one independent approving review when a qualified reviewer is available. Do not grant blanket bypass rights or permit direct push for normal contributors.
2. Require status checks that **run on every PR**: `Node tests`, `Firestore security rules`, and `Pilot branch safeguard evidence` after this workflow is reviewed and merged. Status names must match those shown by GitHub. An administrator should test enforcement via a non-production PR with a known failing check, observing that merge is blocked.
3. **Do not blindly set seven historical release checks as required contexts**: the staging, accessibility, Lighthouse, volunteer synthetic browser, home-learning and other workflows use different path/event triggers, so some checks are absent on unrelated PRs. Requiring absent checks would deadlock routine merges. For the volunteer *release decision*, collect the seven applicable acceptance results on the **actual candidate SHA** separately and link each evidence run.
4. Record a dated redacted screenshot or admin-reviewed configuration summary of required checks, bypass list and protection rule. An app-issued 403 to read detailed protection is not proof of successful configuration. Re-run the safeguard workflow and verify the live branch state without disabling checks.
5. Compare deployed production Hosting, Firestore rules, Platform API Worker and applicable Cloud Functions versions against the intended candidate. Complete production dependency alert review; do not infer production safety from a root `npm audit` alone.

## MindCheck Apps Script owner action — required

**Do not copy personal records, real certificate IDs, secrets or Apps Script deployment credentials into GitHub or messages.**

1. Identify the authorized Apps Script project editor and document the current authoritative issuer, data source, assessment pass requirements, server-side access controls and deployed version **privately**.
2. Verify that certificate issuance cannot be triggered using forged client progress, editable name, a fabricated score, or a guessed certificate ID.
3. In an isolated approved test deployment with a synthetic adult identity, test the full course → assessment → issuance → certificate view → `verify_cert` sequence. Assert that issuer, recipient, correct assessment, actual pass, issuance date, current validity and (if supported) revocation status are derived from authoritative server records.
4. Exercise unknown ID, mismatched requested/returned ID, different holder, revoked/invalidated ID and backend outage. Fail closed in every ambiguous case. Minimise publicly displayed verification fields.
5. Record deployment/version, result matrix, reviewer and dated sign-off privately; keep the tracking issue free of identifying test records. Treat assessment completion as distinct from safeguarding clearance and professional licensure.

## Ordered stop/go gates

1. GitHub admin demonstrates enforced merge safeguards and candidate-specific tests, deployment parity and production dependency review.
2. MindCheck backend owner/reviewer signs off synthetic issuer/recipient/pass/revocation/outage verification.
3. QA performs one bounded synthetic live registration-to-dashboard journey across approved/pending/rejected/revoked adult accounts on iPhone and Android: bio/photo save/close/reopen, manual certificate review transitions, independent safeguarding, coordinator assignment/pause, in-app delivery/read and denied cross-account access. Verify cleanup.
4. Programme lead signs off named safeguarding owner/backup, adult consent, coordinator capacity, nonclinical duties, data-minimisation, incident escalation and stop procedures.
5. **Only then** the release authority records GO for an opt-in **5–10 approved adult** supervised pilot. Record its results before considering wider rollout.

**No-go overrides:** certificate trust unresolved; missing protections; a failed required check; high-severity unmitigated exposure; unauthorized role access; failed revocation; missing safeguarding escalation; unverified real-user consent. Do not rerun shared staging repeatedly on HTTP 429.
