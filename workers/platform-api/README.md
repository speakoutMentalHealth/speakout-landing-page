# SpeakOut platform API

Cloudflare Worker boundary for operations that cannot safely run in a browser while Firebase remains on Spark.

Do not deploy from this checkout until staging tests and the rollout checklist pass. Copy `wrangler.example.jsonc` to `wrangler.jsonc` and set secrets with Wrangler:

```text
wrangler secret put FIREBASE_CLIENT_EMAIL
wrangler secret put FIREBASE_PRIVATE_KEY
wrangler secret put CLOUDINARY_CLOUD_NAME
wrangler secret put CLOUDINARY_API_KEY
wrangler secret put CLOUDINARY_API_SECRET
```

The service account must have only the minimum Firestore permissions needed by these endpoints. CORS must list exact origins. Never use `*` for production authenticated requests.

The current Phase 1 implementation supplies authenticated learning state, lesson completion, private assessment delivery/scoring, idempotent certificate issuance, and a dry-run assessment migration inventory. Review and media endpoints deliberately return `501` until their Cloudinary and reviewer audit implementation is completed and tested; the clients fail closed in that state.
