/* Staging admission check: test a real, bounded Firestore read before running
   the expensive browser-release matrix. Never use production credentials. */
import assert from "node:assert/strict";
import { createSign } from "node:crypto";
import { readFile } from "node:fs/promises";

const projectId = "speakout-portal-staging";
const credentialsFile = process.env.FIREBASE_SERVICE_ACCOUNT_FILE;
if (!credentialsFile) throw new Error("Staging Firestore preflight needs FIREBASE_SERVICE_ACCOUNT_FILE.");

const account = JSON.parse(await readFile(credentialsFile, "utf8"));
assert.equal(account.project_id, projectId, "The release workflow must never test against production Firestore.");

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
  throw new Error(
    "Staging Firestore returned HTTP 429 on a one-record query. " +
    "The direct Firestore API is rejecting a bounded read (rate limit, temporary capacity or another project/API quota). " +
    "Do not assume the daily Firebase free allowance has been exhausted. Review Firestore and Google Cloud API error metrics for speakout-portal-staging."
  );
}
if (!response.ok) {
  throw new Error("Staging Firestore preflight returned HTTP " + response.status + "; see project service health and IAM.");
}
const rows = await response.json();
if (!Array.isArray(rows)) throw new Error("Staging Firestore preflight returned an unexpected query response.");
console.log("PASS: staging Firestore served a bounded authenticated query. This is an admission check, not a guarantee of remaining daily quota.");
