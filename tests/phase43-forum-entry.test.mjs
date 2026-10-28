import test from "node:test";
import assert from "node:assert/strict";
import { forumEntry, forumReturn } from "../js/forum-entry.js";

test("anonymous entry does not fetch profiles or admit MindCheck-only visitors", async () => {
  const result = await forumEntry(null, () => assert.fail("anonymous profile read"));
  assert.equal(result.allowed, false);
});
test("only canonical approved accounts enter regardless of role or legacy approval", async () => {
  for (const role of ["teacher", "parent", "student", "volunteer", "school_admin", "super_admin"]) {
    for (const status of ["approved", "pending", "rejected", "suspended", undefined]) {
      const result = await forumEntry({ uid: "member" }, async uid => {
        assert.equal(uid, "member");
        return { role, status, approved: status !== "approved" };
      });
      assert.equal(result.allowed, status === "approved", `${role}/${status}`);
    }
  }
  assert.equal((await forumEntry({ uid: "missing" }, async () => null)).allowed, false);
  await assert.rejects(forumEntry({ uid: "offline" }, async () => { throw Error("offline"); }));
});
test("forum login return requires approval and accepts no arbitrary URL", () => {
  assert.equal(forumReturn("?next=forum", { status: "approved" }), "forum.html");
  for (const status of ["pending", "rejected", "suspended", undefined]) {
    assert.equal(forumReturn("?next=forum", { status, approved: true }), null);
  }
  for (const next of ["https://example.com", "//example.com", "/forum.html", "forum.html", ""]) {
    assert.equal(forumReturn(`?next=${encodeURIComponent(next)}`, { status: "approved" }), null);
  }
});

import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

test("forum UI does not query rooms before approval and clears discussions on sign-out", async () => {
  const source = readFileSync(new URL("../js/forum-community.js", import.meta.url), "utf8").replace(/^import .*;\n/gm, "");
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, { hidden: false, value: "", textContent: "", children: [],
      classList: { toggle() {}, add() {} }, addEventListener() {},
      replaceChildren(...children) { this.children = children; }, append(child) { this.children.push(child); },
      querySelector() { return { classList: { add() {} } }; }
    });
    return elements.get(id);
  };
  let authChanged, status = "pending", roomsRead = 0;
  runInNewContext(source, {
    auth: {}, db: {}, STARTER_ROOMS: [{ id: "start-here" }], forumEntry,
    document: { getElementById: element, querySelectorAll: () => [], createElement: () => element(Symbol()) },
    onAuthStateChanged: (_auth, handler) => { authChanged = handler; },
    doc: (_db, collection, id) => ({ collection, id }),
    getDoc: async ref => {
      if (ref.collection === "users") return { exists: () => true, data: () => ({ status, role: "teacher" }) };
      if (ref.collection === "forumRooms") roomsRead++;
      return { exists: () => false };
    }
  });
  await authChanged(null);
  await authChanged({ uid: "pending" });
  assert.equal(roomsRead, 0);
  assert.equal(element("forumContent").hidden, true);
  assert.match(element("entryMessage").textContent, /pending approval/);
  status = "approved";
  await authChanged({ uid: "approved" });
  assert.equal(roomsRead, 1);
  assert.equal(element("forumContent").hidden, false);
  element("topics").append("previous discussion");
  await authChanged(null);
  assert.equal(element("topics").children.length, 0);
  assert.equal(element("forumContent").hidden, true);
});
