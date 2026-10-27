import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = file => readFileSync(new URL("../"+file,import.meta.url),"utf8");
test("forum professional layout preserves real member interaction hooks and launch safeguards", () => {
  const page = read("forum.html");
  for(const id of ["status","communityEmpty","rooms","roomSearch","discussion","roomTitle","roomDescription","topics","topicSearch","newTopic","topicTitle","topicBody"]) {
    assert.match(page,new RegExp('id="'+id+'"'),"missing forum UI hook "+id);
  }
  assert.match(page,/noindex,nofollow/);
  assert.match(page,/not launched/i);
  assert.match(page,/Verified adult membership/i);
  assert.match(page,/js\/forum-community\.js/);
  assert.match(page,/js\/account-controls\.js/);
  assert.match(page,/@media\(max-width:700px\)/);
  assert.doesNotMatch(page, /sample post|fake members|\d+ active users/i);
});
test("forum rooms and topic search filter locally without unlocking unpublished content", () => {
  const ui = read("js/forum-community.js");
  const rules = read("firebase/firestore.rules");
  assert.match(ui, /function filterRooms\(/);
  assert.match(ui, /function filterTopics\(/);
  assert.match(ui, /button\.setAttribute\("aria-current"/);
  assert.match(ui, /post\.dataset\.searchText/);
  assert.match(ui, /where\("moderationStatus", "==", "approved"\)/);
  assert.match(ui, /adultVerified/);
  assert.match(ui, /moderationStatus: "pending"/);
  assert.match(ui, /textContent =/);
  assert.match(rules, /r\.published == false/);
});
