import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { normalizedSlug, privacyWarning, roomState, STARTER_ROOMS } from "../js/forum-room-state.js";
const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("starter rooms have independent visibility and interaction status", () => {
  assert.equal(STARTER_ROOMS.length, 6);
  for (const room of STARTER_ROOMS) {
    assert.equal(normalizedSlug(room.id), room.id);
    assert.deepEqual(roomState(room), {
      title: room.title, description: room.description,
      visibility: room.visibility, status: room.status
    });
  }
  assert.equal(STARTER_ROOMS.find(room => room.id === "school-leaders-educators").visibility, "private");
  assert.equal(STARTER_ROOMS.find(room => room.id === "school-leaders-educators").status, "locked");
});
test("invalid room visibility/status rejected; privacy downgrade explicitly flagged", () => {
  assert.throws(() => roomState({ title: "Forum", visibility: "everyone", status: "open" }), /visibility/);
  assert.throws(() => roomState({ title: "Forum", visibility: "private", status: "published" }), /status/);
  assert.throws(() => normalizedSlug(""), /longer room/);
  assert.equal(privacyWarning("private", "public"), true);
  assert.equal(privacyWarning("private", "members_only"), true);
  assert.equal(privacyWarning("private", "private"), false);
  assert.equal(privacyWarning("members_only", "public"), false);
});
test("admin page and module are gated; no public posting UI", () => {
  const page = read("admin-forum.html");
  const module = read("js/forum-admin.js");
  assert.match(page, /id="adminUI" hidden/);
  assert.match(page, /noindex,nofollow/);
  assert.match(page, /Closed development phase/);
  assert.match(module, /requireRoles\(\["admin", "super_admin"\]/);
  assert.match(module, /published:\s*false/);
  assert.match(module, /writeBatch\(db\)/);
  assert.match(module, /batch\.set\(auditRef/);
  assert.match(module, /batch\.update\(roomRef/);
  assert.match(module, /privacyWarning/);
  assert.match(module, /Lock room/);
  assert.match(module, /Reopen room/);
  assert.doesNotMatch(page, /contenteditable/);
});
test("Firestorm collection rules require admin and paired immutable audit before room changes", () => {
  const rules = read("firebase/firestore.rules");
  const dashboard = read("admin-dashboard.html");
  assert.match(rules, /match \/forumRooms\/\{roomId\}/);
  assert.match(rules, /match \/forumRoomAudits\/\{auditId\}/);
  assert.match(rules, /forumRoomValid\(\)/);
  assert.match(rules, /forumAuditPaired\(/);
  assert.match(rules, /getAfter\(path\)/);
  assert.match(rules, /r\.published == false/);
  assert.match(rules, /allow update, delete: if false/);
  assert.match(rules, /match \/forumTopics\/\{topicId\} \{ allow read, write: if false/);
  assert.match(rules, /collection in \["forumRooms", "forumRoomAudits", "forumTopics", "forumReplies", "forumRoomMembers"\]/);
  assert.match(dashboard, /href="admin-forum.html"/);
});
