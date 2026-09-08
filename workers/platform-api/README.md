# SpeakOut platform API

Cloudflare Worker boundary for operations that cannot safely run in a browser while Firebase remains on Spark.

Do not deploy to production from this checkout until staging tests and the rollout checklist pass. Staging uses `wrangler.staging.jsonc`, which declares all required secret names so deployment fails closed if one is absent. Set values with Wrangler's encrypted secret commands:

```text
wrangler secret put FIREBASE_CLIENT_EMAIL
wrangler secret put FIREBASE_PRIVATE_KEY
wrangler secret put CLOUDINARY_CLOUD_NAME
wrangler secret put CLOUDINARY_API_KEY
wrangler secret put CLOUDINARY_API_SECRET
```

The service account must have only the minimum Firestore permissions needed by these endpoints. CORS must list exact origins. Never use `*` for production authenticated requests.

The current implementation supplies authenticated learning state, lesson completion, private assessment delivery/scoring, idempotent certificate issuance, atomic review decisions, authenticated Cloudinary evidence upload/retrieval, and a read-only assessment/certificate/evidence migration inventory. Unknown privileged endpoints still fail closed with `501`.

Evidence retrieval never returns a Cloudinary signed URL. An approved administrator requests a record through the Worker, which validates its private asset metadata, fetches the authenticated asset server-side, and proxies the bytes with private, no-store response headers.
