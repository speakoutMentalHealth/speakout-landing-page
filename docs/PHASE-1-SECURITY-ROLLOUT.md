# Phase 1 security rollout

These repository changes are intentionally **not deployed automatically**.

## Required order

1. Create a separate staging Firebase project on Spark and a staging Cloudinary account/folder.
2. Deploy the external API to Cloudflare Workers and store Firebase service-account and Cloudinary credentials as Worker secrets, never repository variables.
3. Restrict CORS to the exact staging and production origins.
4. Run rule tests in the Firebase Emulator Suite, including self-promotion, self-approval, cross-school access, forged progress and forged certificate cases.
5. Back up production Firestore.
6. Run the non-destructive assessment copy/check, review its report, then separately authorize removal of answer keys from public course documents.
7. Deploy the secure browser clients.
8. Deploy `firebase/firestore.rules` immediately after the secure clients, during a controlled maintenance window.
9. Verify registration, approval, profile edit, course progression, assessment, certificates, external evidence and admin reviews.
10. Roll back the client and rules together if any critical flow fails.

## Spark constraints

- Do not deploy `functions/`; it is retained only as legacy reference until removal is separately approved.
- Do not enable Firebase Storage or App Hosting.
- Firebase Hosting may serve the static site.
- The trusted API belongs on Cloudflare Workers free tier.
- Cloudinary holds media. Signed uploads and destructive operations happen only through the Worker.

## Secrets required by the Worker

- Firebase project ID
- Service-account client email
- Service-account private key
- Cloudinary cloud name
- Cloudinary API key
- Cloudinary API secret
- Allowed web origins

Never prefix these with a public frontend convention or commit them to this repository.
