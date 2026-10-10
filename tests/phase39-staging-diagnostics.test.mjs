import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import { consoleDiagnostic, noticeDiagnostic, observeCatalogue, profileDiagnostic, requestCategory, responseDiagnostic } from "./staging-diagnostics.mjs";

test("server evidence records permission failures without arbitrary error text or profile identity", () => {
  const secret = "private-key learner@example.test user-secret";
  const result = {
    response: { status: 403, ok: false },
    body: { error: { status: "PERMISSION_DENIED", message: secret, details: [secret] } },
    data: { status: "suspended", uid: secret, email: secret, approved: true }
  };
  assert.deepEqual(profileDiagnostic(result), { httpStatus: 403, serverCode: "PERMISSION_DENIED", canonicalStatus: "suspended" });
  result.body.error.status = secret;
  result.data.status = secret;
  assert.deepEqual(profileDiagnostic(result), { httpStatus: 403, serverCode: "UNRECOGNIZED", canonicalStatus: "unknown" });
  assert.deepEqual(responseDiagnostic({ status: 200, ok: true }, {}), { httpStatus: 200, serverCode: "OK" });
});

test("request and console classifiers discard credentials, identifiers and unknown codes", () => {
  assert.equal(requestCategory("https://firestore.googleapis.com/v1/users/private-user?access_token=secret", "http://localhost:5000"), "firestore");
  assert.equal(requestCategory("https://securetoken.googleapis.com/v1/token?key=secret", "http://localhost:5000"), "authentication");
  assert.equal(requestCategory("http://localhost:5000/speakhub.html?uid=secret", "http://localhost:5000"), "portal");
  assert.equal(requestCategory("not a URL secret", "http://localhost:5000"), "other");
  assert.deepEqual(consoleDiagnostic("learner@example.test FirebaseError [code=permission-denied] auth/network-request-failed auth/private-secret"), ["permission-denied", "network-request-failed"]);
  assert.equal(noticeDiagnostic("Your account is awaiting approval. learner@example.test"), "approval-pending");
  assert.equal(noticeDiagnostic("private-secret"), "other");
});

test("catalogue observer captures bounded evidence and removes listeners on completion", async () => {
  const page = new EventEmitter();
  page.evaluate = async () => ({ searchDisabled: true, notices: ["Your account is awaiting approval.", "Sign in learner@example.test", "private-secret"] });
  const observer = observeCatalogue(page, "http://localhost:5000");
  page.emit("response", { status: () => 403, url: () => "https://firestore.googleapis.com/users/private-secret?token=secret" });
  page.emit("console", { type: () => "error", text: () => "FirebaseError [code=permission-denied] learner@example.test" });
  for (let index = 0; index < 60; index++) page.emit("requestfailed", { url: () => "https://securetoken.googleapis.com?token=secret" });
  const captured = await observer.capture();
  assert.equal(captured.events.length, 40);
  assert.deepEqual(captured.events[0], { type: "http-error", service: "firestore", httpStatus: 403 });
  assert.deepEqual(captured.events[1], { type: "console", severity: "error", codes: ["permission-denied"] });
  assert.deepEqual(captured.ui, { searchDisabled: true, notices: ["approval-pending", "sign-in-required", "other"] });
  assert.doesNotMatch(JSON.stringify(captured), /private-secret|learner@|token|googleapis|secret/);
  observer.dispose();
  for (const event of ["response", "console", "requestfailed"]) assert.equal(page.listenerCount(event), 0);
});

test("a closed browser still provides its collected structural evidence", async () => {
  const page = new EventEmitter();
  page.evaluate = async () => { throw new Error("closed private-secret"); };
  const observer = observeCatalogue(page, "http://localhost:5000");
  assert.deepEqual(await observer.capture(), { events: [], ui: null });
  observer.dispose();
});
