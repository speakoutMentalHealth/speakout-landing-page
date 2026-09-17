import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const source = read("workers/platform-api/src/index.js");
const implementation = source.slice(source.indexOf("const onTheMoveCollections ="), source.indexOf("function requireRole(")).trim();

function harness({ role = "admin", providerOk = true, storedEmail = "saved@example.org", status = "new", type = "hosts" } = {}) {
  let providerCalls = 0;
  let saved;
  const id = type === "hosts" ? "SOM-123" : "SOMS-123";
  const document = { id, status, email: storedEmail, contactName: "Saved Contact", communicationHistory: [], ...(type === "hosts" ? { applicationId: id } : { enquiryId: id }) };
  const context = {
    clean: value => String(value || "").trim(),
    normalized: value => String(value || "").trim().toLowerCase(),
    safeId: value => value,
    looksLikeEmail: value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    requireAdmin: user => { if (!["admin", "super_admin"].includes(user.profile.role)) throw Object.assign(new Error("Forbidden"), { status: 403 }); },
    getDocument: async () => document,
    runTransaction: async (_env, action) => action({ get: async () => document, patch: (_path, next) => { saved = next; Object.assign(document, next); } }),
    fetch: async (_url, options) => { providerCalls++; assert.equal(options.headers["Idempotency-Key"], "on-the-move/12345678-1234-4234-8234-123456789abc"); assert.deepEqual(JSON.parse(options.body).to, [storedEmail]); return { ok: providerOk, json: async () => providerOk ? { id: "provider-123" } : { message: "failed" } }; },
    Date
  };
  const send = vm.runInNewContext(`${implementation}\nsendOnTheMoveEmail`, context);
  const data = { type, id, requestId: "12345678-1234-4234-8234-123456789abc", subject: "Update", body: "Message", to: "attacker@example.org" };
  const user = { uid: "admin-1", email: "admin@example.org", profile: { role } };
  const env = { RESEND_API_KEY: "test-key", RESEND_FROM_EMAIL: "SpeakOut <sender@example.org>" };
  return { send: () => send(env, user, data), data, get calls() { return providerCalls; }, get saved() { return saved; } };
}

test("only approved admin route can send and browser recipient is ignored", async () => {
  const denied = harness({ role: "student" });
  await assert.rejects(denied.send(), { status: 403 });
  assert.equal(denied.calls, 0);
  const allowed = harness();
  const result = await allowed.send();
  assert.equal(result.entry.recipientEmail, "saved@example.org");
  assert.equal(result.entry.providerMessageId, "provider-123");
  assert.equal(result.entry.deliveryStatus, "accepted");
  assert.equal(allowed.saved.communicationHistory.length, 1);
  assert.equal(allowed.saved.communicationHistory[0].recordedByUid, "admin-1");
  await allowed.send();
  assert.equal(allowed.calls, 1, "retry should reuse the audited send");
});

test("provider rejection creates no sent audit", async () => {
  const h = harness({ providerOk: false });
  await assert.rejects(h.send(), { status: 502 });
  assert.equal(h.saved, undefined);
});

test("all current host and sponsor workflow statuses can reach the provider", async () => {
  const hostStatuses = ["new", "under_review", "action_required", "approved", "confirmed", "completed", "declined", "waitlisted"];
  const sponsorStatuses = ["new", "contacted", "qualified", "proposal", "committed", "closed", "declined"];
  for (const status of hostStatuses) {
    const h = harness({ status });
    await h.send();
    assert.equal(h.calls, 1, `host status ${status} should be sendable`);
  }
  for (const status of sponsorStatuses) {
    const h = harness({ status, type: "sponsors" });
    await h.send();
    assert.equal(h.calls, 1, `sponsor status ${status} should be sendable`);
  }
});

test("invalid request type and persisted status cannot reach provider", async () => {
  const wrongType = harness();
  wrongType.data.type = "users";
  await assert.rejects(wrongType.send(), { status: 400 });
  assert.equal(wrongType.calls, 0);
  const invalidStatus = harness({ status: "unknown" });
  await assert.rejects(invalidStatus.send(), { status: 409 });
  assert.equal(invalidStatus.calls, 0);
});

test("dashboard uses authenticated Worker and browser cannot write communication audit", () => {
  const dashboard = read("admin-on-the-move.html");
  const rules = read("firebase/firestore.rules");
  assert.match(dashboard, /platformRequest\("\/v1\/admin\/on-the-move\/send-email"/);
  assert.doesNotMatch(dashboard, /Record as Sent|arrayUnion\(/);
  assert.equal((rules.match(/affectedKeys\(\)\.hasAny\(\["communicationHistory", "lastCommunicationAt"\]\)/g) || []).length, 3);
  for (const config of ["production", "staging"]) {
    const wrangler = JSON.parse(read(`workers/platform-api/wrangler.${config}.jsonc`));
    assert.ok(wrangler.secrets.required.includes("RESEND_API_KEY"));
  }
});
