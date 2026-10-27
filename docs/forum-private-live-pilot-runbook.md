# SpeakOut Community — private live pilot release runbook

**Release state:** code and rules under review in PR #374. **Not activated.** The production control document `forumReleaseControls/pilot` has not been created by this change. No room is published and no real member has been enrolled by this PR.

## Security model

- The live forum is for **individually verified 18+ adults**, including rooms labelled public. The MindCheck DOB selection is a navigation convenience and **is not** eligibility evidence.
- All released pilot rooms must be **private**; only specifically assigned, approved portal users with active `forumAccessGrants` can view or post. Scoped moderator grants permit review only in their authorized private room when published and unlocked.
- Browser/client Firebase rules **cannot create or edit** `forumReleaseControls/pilot` or immutable control audits. A trusted, privileged Firebase Admin SDK operator must activate a named room, expiring in **1–72 hours**, before a portal admin can explicitly publish it.
- Pilot gate expiry revokes all non-admin room/topics/replies access immediately, even if a room still has `published:true`. An administrator must explicitly unpublish and audit. Locking a room also unpublishes it.
- Room updates use immutable paired room audits that record previous and next visibility, status **and publication state**; member grants and moderation decisions also use paired audits.
- New reports are one immutable record per reporter/content, and the target must be a real approved topic or reply in the given room. A future rate-limit policy is still recommended.

## Rollout checklist — staging first

1. Establish a **distinct staging Firebase project** and deploy the proposed Firestore rules **there first**. Never point staging user sessions at the production database.
2. **Review and merge indexes** before deploying: `firebase/forum-firestore.indexes.json` is now the configured index file in `firebase.json`. Firebase CLI index deployment may delete indexes not listed, so export or inspect all existing *remote* indexes first, merge existing ones into the config, and review the resulting diff. Do **not** blindly deploy the two-index draft to production.
3. Create the single private test room, e.g. `adult-pilot`, with status `open` and `published:false` in `admin-forum.html`.
4. Confirm adult eligibility outside of the public forum (reliable identity/age verification per approved organizational procedure). On `admin-forum-access.html`, approve a small roster of adults, plus an approved moderator with `moderatedRoomIds` for exactly this room. Do not put sensitive proof documents into grants or free-text audit reasons.
5. Confirm a named moderator **and backup**, moderation hours, 24-hour safety escalation/referral contact, privacy notice, abuse-report review/retention and an emergency shutdown owner. These are **operational** gates, not automated by the GitHub merge.
6. Install `firebase-admin` only in a privileged operator shell (`npm install --no-save --package-lock=false firebase-admin`) and use tightly scoped Google ADC credentials. Review IAM access, backend audit logging and staging project ID.
7. Dry-run:
   ```bash
   node scripts/forum-pilot-control.mjs --project=YOUR_STAGING_PROJECT --room=adult-pilot --action=enable --hours=24 --actor=OWNER_ID --reason="Reviewed private adult pilot with moderator coverage"
   ```
8. After an independent release review, set `FORUM_PILOT_CONFIRM_PROJECT` and `FORUM_PILOT_CONFIRM_ROOM` to the exact intended values; execute the command with `--apply`. The operator checks private room visibility, approved adult member and assigned moderator, then records an immutable admin-side control audit. For the **production** project (`speaakout-portal`), an extra `--production-ack=PRIVATE_PILOT_ONLY` and matching `FORUM_PILOT_PRODUCTION_APPROVER` are required.
9. As an approved portal administrator, navigate to `admin-forum.html`. The **Publish private pilot room** action becomes available only for approved named room(s) while the release gate is valid. Type the exact room confirmation. Firestore enforces the trusted gate, version and paired immutable publication audit.
10. Test as an approved adult, another approved adult without private membership, an assigned adult moderator, a student/under-18 profile, an anonymous browser and an expired member. Check topics remain **pending** until moderator approval, replies, reporting, room lock, and restart.
11. End pilot with **End pilot for this room** (and a privileged `--action=disable --apply` revocation). Verify no non-admin can see the room, content or reports. Retain audit logs according to the privacy policy.

### Production restrictions

**Do not** set the MindCheck `js/community-config.js` switch to `enabled:true` until the controlled pilot passes staging and production smoke checks, the live URL and indexes are verified, moderator coverage is real, and a verified adult can post/reply through the real backend.

All six existing MindCheck room demos remain simulations; they do not verify real Firestore posting. The production forum UI will show live private-room discussions only to approved members while an active trusted release gate exists.

### Known future work

Robust protection against high-volume reports, moderator shift handoff and dashboards for delegated moderators, content retention/removal lifecycle, age-proof verification integration, accessible multilingual copy, notification privacy, rate limits and production observability. A successful staging test is required before accepting real user content.

## Add-only index operations — no destructive Firebase CLI sync

The forum needs composite indexes for approved topics, approved replies and pending moderator replies. The repository's `firebase/forum-firestore.indexes.json` contains only forum indexes, not every index used by the existing school and learning portal. **Do not blindly deploy this file with `firebase deploy --only firestore:indexes` in production**, because it could delete or alter unrelated remote index definitions.

The additive helper uses the official Firestore Admin REST API. It never sends DELETE, PATCH or an index replacement request.

```bash
# Safe offline plan: needs neither credentials nor network
node scripts/forum-indexes-additive.mjs

# Read-only comparison on the SEPARATE staging project (requires gcloud authentication)
node scripts/forum-indexes-additive.mjs --mode=inspect --project=YOUR_STAGING_PROJECT

# Privileged, explicitly approved staging add-only creation of missing indexes
export FORUM_INDEX_CONFIRM_PROJECT=YOUR_STAGING_PROJECT
node scripts/forum-indexes-additive.mjs --mode=apply --project=YOUR_STAGING_PROJECT --ack=ADD_ONLY
```

For `speaakout-portal` production, additionally supply `--actor=OWNER_ID --production-ack=PRODUCTION_INDEXES_APPROVED` and set `FORUM_INDEX_PRODUCTION_APPROVER=OWNER_ID`. These controls are necessary but do not replace organizational release approval. Use a credential limited to the intended project and never commit or echo service-account secrets.

**Indexes may be creating rather than READY after an API creation response.** Re-run `--mode=inspect` and verify every required composite is READY before declaring production forum discussion queries operational. The script refuses to proceed when an existing matching index is in ERROR state.

No indexing operation is run automatically by the script or PR. A distinct staging Firebase project and appropriate operator credentials remain prerequisites to real end-to-end testing.

## Run the real, synthetic adult forum staging acceptance

This repository already uses the separate Firebase project `speakout-portal-staging` and GitHub secret `STAGING_FIREBASE_SERVICE_ACCOUNT_JSON`. There is **no need to create a new staging project**. Do not attempt this against `speaakout-portal` or use production credentials.

1. Go to **GitHub Actions → Forum Real Firebase Staging Pilot → Run workflow** on `main`.
2. Enter `SYNTHETIC_STAGING_ONLY` in the **acceptance** field. The workflow rejects any other value.
3. Leave **create_missing_indexes** unchecked initially. This runs the staging-capacity preflight and safely inspects the three necessary forum composite indexes. If any is missing, the job stops **without** running the pilot.
4. Keep **run_pilot** unchecked (the default) while inspecting or creating indexes. After reviewing staging database permissions, select **create_missing_indexes** once to create only missing *staging* indexes. No existing indexes are deleted. Because building is asynchronous, the job can stop until they become READY; rerun read-only inspection after they finish. Do not repeatedly launch the pilot on capacity/quota errors.
5. After all indexes read READY, explicitly select **run_pilot** to deploy only Firestore rules to **staging** and conduct the real synthetic user test. With **run_pilot** unchecked, no rules, accounts or forum documents are changed. When enabled, the test creates five synthetic staging Auth identities, an isolated randomly named private room and a 12-minute trusted gate. It tests real Firestore client writes, adult access/denials, audit-paired publication/approval, pending and approved discussion/reply queries, report access and room lock/revocation.
6. The test must report **STAGING CLEANUP PASS**: all its synthetic profiles, grants, content, audits and Firebase Auth users removed, and the previous disabled staging gate restored. Cleanup failure is a release blocker.
7. Record the exact GitHub Actions job URL, commit SHA and tested index/rules state. **Only one successful staging acceptance is enough.** Do not launch repeated runs unless a material issue was fixed.

The workflow uses the **existing** `speakout-shared-staging` concurrency group and performs no automatic runs on PRs or merges. It does not activate production or authorize real members. Release remains gated by real adult-verification procedures, moderator coverage, safety and privacy review, and an explicitly approved production-pilot decision.
