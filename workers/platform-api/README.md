# SpeakOut platform API

Cloudflare Worker boundary for operations that cannot safely run in a browser while Firebase remains on Spark.

Do not deploy to production from this checkout until staging tests and the rollout checklist pass. Production stores new external-course evidence in the private `speakout-private-evidence` R2 bucket through the `EVIDENCE_BUCKET` binding. Create it once before the first production deployment:

```text
wrangler r2 bucket create speakout-private-evidence
```

Staging retains the authenticated Cloudinary adapter for isolated integration testing. Its `wrangler.staging.jsonc` declares all required secret names so deployment fails closed if one is absent. Set those values with Wrangler's encrypted secret commands:

```text
wrangler secret put FIREBASE_CLIENT_EMAIL
wrangler secret put FIREBASE_PRIVATE_KEY
wrangler secret put CLOUDINARY_CLOUD_NAME
wrangler secret put CLOUDINARY_API_KEY
wrangler secret put CLOUDINARY_API_SECRET
```

The service account must have only the minimum Firestore permissions needed by these endpoints. CORS must list exact origins. Never use `*` for production authenticated requests.

## On The Move applicant email

The admin dashboard sends through `POST /v1/admin/on-the-move/send-email`. The Worker verifies an approved Firebase admin, reads the recipient from the saved application or sponsor enquiry, sends a plain text email through Resend, and records the accepted provider message ID and sender identity in Firestore. A provider acceptance is recorded as `accepted`, not as proof of delivery. The browser's manual email draft does not write a send audit.

Production already requires an encrypted `RESEND_API_KEY`. Before deploying staging, add its own encrypted `RESEND_API_KEY` to the staging Worker. Confirm that `speakoutmentalhealth.org` is verified in Resend for the configured `RESEND_FROM_EMAIL` sender, or change that public sender setting to an address on a verified domain. Deploy Firestore rules alongside the site so browser writes cannot forge communication history, then deploy the production Worker with `wrangler deploy --config wrangler.production.jsonc` and publish the updated dashboard. Do not put the key in the repository or a public Wrangler variable.

The current implementation supplies authenticated learning state, lesson completion, private assessment delivery/scoring, idempotent certificate issuance, transactional external-course submission, atomic review decisions, private R2 evidence upload/retrieval with a staging Cloudinary fallback, and a read-only assessment/certificate/evidence migration inventory. Unknown privileged endpoints still fail closed with `501`.

Evidence retrieval never returns an R2 or Cloudinary delivery URL. An approved administrator requests a record through the Worker, which validates ownership metadata, fetches the private object server-side, and streams the bytes with private, no-store response headers.
