import assert from "node:assert/strict";
import test from "node:test";
import { isApprovedProfile } from "../js/profile-approval.js";

test("catalogue approval accepts supported approval formats without treating pending profiles as approved", () => {
  assert.equal(isApprovedProfile({ approved: true }), true);
  assert.equal(isApprovedProfile({ status: "approved" }), true);
  assert.equal(isApprovedProfile({ status: " APPROVED " }), true);
  for (const profile of [null, {}, { status: "pending" }, { approved: "true" }, { approved: false, status: "rejected" }]) {
    assert.equal(isApprovedProfile(profile), false);
  }
});
