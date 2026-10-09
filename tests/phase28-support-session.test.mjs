import assert from "node:assert/strict";
import test from "node:test";
import { requireActiveSupportSession, SUPPORT_SESSION_MS } from "../workers/platform-api/src/support-session.js";

const now = Date.parse("2026-10-09T12:00:00Z");
const active = { actorUid: "admin-a", schoolId: "school-a", active: true, expiresAt: new Date(now + SUPPORT_SESSION_MS).toISOString() };

test("support requires active actor-bound school-bound unexpired session", () => {
  assert.equal(requireActiveSupportSession(active, "admin-a", "school-a", now), active);
  for (const session of [null, {}, { ...active, active: false }, { ...active, actorUid: "other" },
    { ...active, schoolId: "school-b" }, { ...active, expiresAt: "invalid" },
    { ...active, expiresAt: new Date(now).toISOString() }]) {
    assert.throws(() => requireActiveSupportSession(session, "admin-a", "school-a", now), { status: 403 });
  }
  assert.throws(() => requireActiveSupportSession(active, "admin-a", "school-a", now + SUPPORT_SESSION_MS), { status: 403 });
});
