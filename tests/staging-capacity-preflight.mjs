/* Staging admission check: test a real, bounded Firestore read before running
   the expensive browser-release matrix. Never use production credentials. */
import assert from "node:assert/strict";
import { createSign } from "node:crypto";
import { readFile } from "node:fs/promises";
import { firestoreQuotaSummary } from "./staging-quota-diagnostics.mjs";

const projectId = "speakout-portal-staging";
const credentialsFile = process.env.FIREBASE_SERVICE_ACCOUNT_FILE;
if (!credentialsFile) throw new Error("Staging Firestore preflight needs FIREBASE_SERVICE_ACCOUNT_FILE.");

const account = JSON.parse(await readFile(credentialsFile, "utf8"));
assert.equal(account.project_id, projectId, "The release workflow must never test against production Firestore.");
assert.match(account.client_email || "", /^[a-zA-Z0-9._-]+@speakout-portal-staging\.iam\.gserviceaccount\.com$/, "Credential identity must be a staging service account.");
// Service-account email is an IAM principal identifier, not a secret.
// Print this (never the private key or token) so the operator can inspect the
// exact principal in IAM rather than guessing from a service-account name.
console.log("Staging Firestore preflight principal:", account.client_email);
console.log("Staging Firestore preflight project:", projectId);

const base64url = value => Buffer.from(JSON.stringify(value)).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const head = base64url({ alg: "RS256", typ: "JWT" });
const payload = base64url({
  iss: account.client_email, sub: account.client_email,
  aud: "https://oauth2.googleapis.com/token",
  scope: "https://www.googleapis.com/auth/datastore",
  iat: now, exp: now + 300
});
const unsigned = head + "." + payload;
const signer = createSign("RSA-SHA256");
signer.update(unsigned);
const jwt = unsigned + "." + signer.sign(account.private_key).toString("base64url");

const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: jwt
  }),
  signal: AbortSignal.timeout(15000)
});
if (!tokenResponse.ok) {
  throw new Error("Staging service-account authentication failed (HTTP " + tokenResponse.status + ").");
}
const token = (await tokenResponse.json()).access_token;
if (typeof token !== "string" || !token) throw new Error("Staging service-account token was not returned.");

// A query against a real collection exercises the same Firestore read API that
// the release tests use. A nonexistent-document GET cannot establish that the
// project's remaining read budget is healthy.
const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
const response = await fetch(url, {
  method: "POST",
  headers: { authorization: "Bearer " + token, "content-type": "application/json" },
  body: JSON.stringify({ structuredQuery: { from: [{ collectionId: "users" }], limit: 1 } }),
  signal: AbortSignal.timeout(15000)
});
if (response.status === 429) {
  // Preserve the release block, but report allowlisted Google RPC quota
  // fields instead of guessing that the daily free-tier allowance was used.
  const details = await response.json().catch(() => ({}));
  throw new Error(
    "Staging Firestore returned HTTP 429 on a one-record query. " +
    firestoreQuotaSummary(details) + ". " +
    "Daily quota exhaustion, regional capacity and request-rate limits remain possible; " +
    "inspect this project's usage and request metrics. Do not rerun the release suite until the limit is identified."
  );
}
if (!response.ok) {
  // Report the structured Google API error without echoing credentials,
  // authorization headers, Firestore documents or the raw response body.
  const body = await response.json().catch(() => ({}));
  const status = String(body?.error?.status || "UNKNOWN").replace(/[^A-Z_]/g, "").slice(0, 40);
  const detail = String(body?.error?.message || "No Google API error message returned")
    .replace(/[\r\n\t]/g, " ").slice(0, 240);
  const guidance = response.status === 403
    ? " Check that the IAM policy for THIS service-account principal grants " +
      "datastore.entities.list (for example, Cloud Datastore Viewer or User), " +
      "that no IAM Deny or conditional binding blocks it, and that the Firestore API is enabled. " +
      "Do not add roles to a different principal or rerun without investigating."
    : " Inspect the API status and staging service health before retrying.";
  throw new Error("Staging Firestore preflight HTTP " + response.status + " [" + status +
    "] for " + account.client_email + " in " + projectId + ": " + detail + "." + guidance);
}
const rows = await response.json();
if (!Array.isArray(rows)) throw new Error("Staging Firestore preflight returned an unexpected query response.");
console.log("PASS: staging Firestore served a bounded authenticated query. This is an admission check, not a guarantee of remaining daily quota.");
