# Academic Results staging acceptance gate

This feature handles student academic records and fee-controlled parent access. It must pass an authenticated staging run before PR #157 is marked ready or merged.

## One-time GitHub Actions secrets

Add these repository or environment secrets to GitHub Actions. Never commit the values.

### STAGING_FIREBASE_SERVICE_ACCOUNT_JSON

Use the complete JSON for a least-privilege service account belonging to the Firebase project:

`speakout-portal-staging`

The account needs only the permissions required to deploy Firestore rules and seed/delete the temporary test records used by `tests/staging-live.integration.mjs`.

The workflow writes this value only to a temporary runner file and deletes it with the runner.

### STAGING_CLOUDINARY_CREDENTIALS_JSON

Use a JSON object for the isolated staging Cloudinary account:

```json
{
  "cloudName": "STAGING_CLOUD_NAME",
  "apiKey": "STAGING_API_KEY",
  "apiSecret": "STAGING_API_SECRET"
}
```

This credential is used only by the staging acceptance test to remove private test uploads after the run. It must point to staging, never the production Cloudinary account.

## Existing credentials

The workflow also requires the existing GitHub Actions secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

The October 6, 2026 preflight confirmed these Cloudflare credentials are already available. The missing secrets were the two staging-only credentials above.

## What the gate deploys

The workflow:

1. deploys the branch Firestore rules to `speakout-portal-staging`;
2. deploys the branch Worker using `workers/platform-api/wrangler.staging.jsonc`;
3. creates temporary staging school-admin, student and parent identities;
4. seeds an approved parent-child link;
5. uploads a private academic result;
6. confirms draft results are invisible to parents;
7. publishes the result;
8. confirms fee clearance blocks access;
9. issues an 8-digit PIN and rejects an incorrect PIN;
10. unlocks the result with the valid PIN;
11. downloads the protected file and checks private/no-store headers;
12. rotates the PIN and confirms the prior unlock/PIN are invalid;
13. resets fee clearance and confirms download is blocked again;
14. cleans up temporary Firestore, Auth and Cloudinary test data.

The same run also executes the repository's existing live learning, certificate and protected-evidence acceptance checks.

## Merge rule

Do not merge the academic-results PR while the **Academic Results Staging Acceptance** workflow is blocked, skipped or failing.

After the two staging-only secrets are configured, rerun the failed workflow. Mark the PR ready only after the authenticated staging job completes successfully.
