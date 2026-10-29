import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { registrationService, registrationEvent, registrationCodes } from "./registration-diagnostics.mjs";

test("only registration provider and local portal errors are classified", () => {
  assert.equal(registrationService("https://firestore.googleapis.com/v1/projects/staging", "http://localhost:5000"), "firestore");
  assert.equal(registrationService("https://identitytoolkit.googleapis.com/v1/accounts:signUp", "http://localhost:5000"), "authentication");
  assert.equal(registrationService("http://localhost:5000/auth.html", "http://localhost:5000"), "portal");
  assert.equal(registrationService("https://unknown.example/private", "http://localhost:5000"), "other");
  assert.deepEqual(registrationEvent("firestore", 429), {kind:"http",service:"firestore",status:429});
  assert.equal(registrationEvent("other", 429), null);
  assert.equal(registrationEvent("authentication", 200), null);
});

test("only allowlisted SDK error code categories survive", () => {
  assert.deepEqual(registrationCodes("FirebaseError: Firebase: Missing or insufficient permissions. (firestore/permission-denied)"), ["permission-denied"]);
  assert.deepEqual(registrationCodes("Auth error (auth/too-many-requests)"), ["too-many-requests"]);
  assert.deepEqual(registrationCodes("Private account data secret@example.com"), []);
});

test("learner acceptance fails on actual registration errors without dumping raw logs", () => {
  const source=readFileSync(new URL("./independent-learner-browser.mjs",import.meta.url),"utf8");
  assert.match(source,/message\.classList\.contains\("bad"\)/);
  assert.match(source,/registrationEvent\(/);
  assert.match(source,/registrationCodes\(/);
  assert.match(source,/Staging registration failed; see redacted registration-failure\.json/);
  assert.match(source,/page\.off\("response", observeResponse\)/);
});

test("synthetic account cleanup runs after early registration failure and never deletes unrelated identities", () => {
  const source=readFileSync(new URL("./independent-learner-browser.mjs",import.meta.url),"utf8");
  assert.match(source,/async function cleanupRegistrationFixture\(/);
  assert.match(source,/body: JSON\.stringify\(\{ email: \[email\] \}\)/);
  assert.match(source,/assert\.equal\(accounts\[0\]\.email, email/);
  assert.match(source,/tasks\.push\(\{ label: "Current synthetic learner Auth and profile", run: cleanupRegistrationFixture \}\)/);
  assert.doesNotMatch(source,/deleteAuthFixture\("[A-Za-z0-9]{20,}"\)/);
});
