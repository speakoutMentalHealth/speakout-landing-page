import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("unpublished forum preview does not expose rooms or diagnose participants", () => {
  const page = read("forum.html");
  const ui = read("js/forum-community.js");
  const rules = read("firebase/firestore.rules");
  assert.match(page, /not launched/);
  assert.match(page, /noindex,nofollow/);
  assert.match(page, /js\/account-controls.js/);
  assert.match(ui, /forumAccessGrants/);
  assert.match(ui, /adultVerified/);
  assert.match(ui, /moderationStatus: "pending"/);
  assert.match(ui, /where\("moderationStatus", "==", "approved"\)/);
  assert.match(ui, /textContent =/);
  assert.match(rules, /r.published == false/);
});
test("member grant and content administration both use centralized role controls", () => {
  for (const path of ["admin-forum-access.html", "admin-forum-review.html"]) {
    const page = read(path);
    assert.match(page, /launch-role-guard.js/);
    assert.match(page, /js\/account-controls.js/);
  }
  const access = read("js/forum-access-admin.js");
  const review = read("js/forum-review-admin.js");
  assert.match(access, /requireRoles\(\["admin", "super_admin"\]/);
  assert.match(access, /writeBatch\(db\)/);
  assert.match(access, /forumGrantAudits/);
  assert.match(review, /forumModerationAudits/);
  assert.match(review, /moderationStatus: next/);
  assert.match(review, /writeBatch\(db\)/);
});
test("Phase 2 forum collections excluded from legacy catchall and guarded by audit", () => {
  const rules = read("firebase/firestore.rules");
  for (const collection of ["forumAccessGrants", "forumGrantAudits", "forumTopics", "forumReplies", "forumReports", "forumModerationAudits"]) {
    assert.match(rules, new RegExp('match /' + collection + '/\\{', "u"));
  }
  assert.match(rules, /forumApprovedAdult\(\)/);
  assert.match(rules, /forumPrivateMember\(roomId\)/);
  assert.match(rules, /forumCanPost\(roomId\)/);
  assert.match(rules, /pairedForumGrantAudit\(/);
  assert.match(rules, /forumModerationPair\(/);
  assert.match(rules, /"forumGrantAudits", "forumModerationAudits", "forumReports", "forumReleaseControls", "forumReleaseControlAudits"/);
});
