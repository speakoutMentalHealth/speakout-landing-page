import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const { approvalState, normalizationPatch } = require("../functions/approval-normalization.js");

test("approval normalization never grants canonical status", () => {
  const cases = [
    [{ approved: true }, { approved: false }],
    [{ status: "pending", approved: true }, { approved: false }],
    [{ status: "rejected", approved: true }, { approved: false }],
    [{ status: "suspended", approved: true }, { approved: false }],
    [{ status: "approved", approved: false }, { approved: true }],
    [{ status: "approved" }, { approved: true }]
  ];
  for (const [profile, patch] of cases) {
    assert.deepEqual(normalizationPatch(profile), patch);
    assert.equal(Object.hasOwn(normalizationPatch(profile), "status"), false);
  }
});

test("canonical approved records remain approved and denied records remain denied", () => {
  assert.equal(approvalState({ status: "approved", approved: true }).canonicalApproved, true);
  for (const profile of [
    {},
    { approved: true },
    { status: "pending", approved: true },
    { status: "rejected", approved: true },
    { status: "suspended", approved: true },
    { status: " APPROVED ", approved: true }
  ]) {
    assert.equal(approvalState(profile).canonicalApproved, false);
  }
});

test("production normalization endpoints are super-admin gated and confirmation protected", () => {
  const source = readFileSync(new URL("../functions/index.js", import.meta.url), "utf8");
  assert.match(source, /async function requireSuperAdmin/);
  assert.match(source, /exports\.auditApprovalProfiles = onCall/);
  assert.match(source, /exports\.normalizeApprovalFlags = onCall/);
  assert.match(source, /NORMALIZE_APPROVAL_FLAGS/);
  assert.match(source, /normalizationPatch\(data\)/);
});
