# Admin traffic reporting

Entry: Admin Command Centre → Traffic & Sign-ins (`admin-traffic.html`). Legacy admin console also links here. Organisation admins and super admins only; school support sessions are denied. Browser and intermediary caching is disabled. Reports are cached server-side for 60 seconds.

## One-time private connection

In the private `mindcheck.goatcounter.com` owner account, create a token with **read statistics only** permission. In Cloudflare → Workers & Pages → `speakout-platform-api` → Settings → Variables and Secrets, add **Secret** `GOATCOUNTER_READ_TOKEN` and deploy. Never put it in repository variables, browser JavaScript, chat, URLs, or local storage. The dashboard remains private; do not enable public embedding or public counters. Refresh the internal traffic page after a minute.

Reference: https://www.goatcounter.com/help/api and https://developers.cloudflare.com/workers/configuration/secrets/ . Provider total is estimated visits, not exact people or pageviews. MindCheck has no login system; its visits are separate from portal authentication. The API requests only a fixed provider origin and projects safe public paths and aggregate counts, omitting titles and user data. Missing credentials/outages show connection/unavailable states, never fabricated zeroes.

## Portal sign-ins

The shared account controls submit Firebase-authenticated receipts without blocking login/logout. The API verifies the token, derives the account and authentication time from verified claims, rejects receipts older than 15 minutes, and transactionally deduplicates each account/authentication timestamp. Restored older sessions and token refreshes do not count as new sign-ins. Registration that authenticates a user counts as a sign-in. Two authentications for the same account in the same second count once. Closing the page before receipt delivery or network/privacy failures can omit an event. Historical sign-ins cannot be reconstructed.

Only a project-scoped SHA-256 account key, verified authentication timestamp and Lagos day are retained, without raw UID, name, email, IP, device, or health answers. These records are pseudonymous, not anonymous. Hourly cleanup removes up to 500 receipts older than 31 days per run; backlogs can extend retention. Browser Firestore access, including admin access, is denied. The server returns distinct accounts across the full period and daily event totals, not account identifiers. At more than 10,000 events, the report is explicitly partial. Reports cover today / last 7 / last 30 calendar days in Africa/Lagos (UTC+1).

## Verification

`node --test tests/phase103-admin-traffic.test.mjs` checks date boundaries, fresh auth receipts, uniqueness, safe provider projections/failure states, authorization before cache access, and transactional deduplication. `npm run test:rules` includes server-only receipt access regressions. After deployment, sign in with an approved admin, open Traffic & Sign-ins, choose all three periods, and confirm actual provider totals after the private connection. Test an ordinary account is denied and logout clears displayed counts. A provider token is required for a real provider-connected end-to-end check.
