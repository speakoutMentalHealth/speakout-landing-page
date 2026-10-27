import { after, before, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, setDoc, getDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp } from "firebase/firestore";
const projectId = "demo-speakout-rules";
const rules = readFileSync(new URL("../firebase/firestore.rules", import.meta.url), "utf8");
let env;
const profile = (uid, role = "volunteer", status = "approved") => ({
  uid, email: uid + "@example.test", status, role, approved: status === "approved"
});
const grant = (uid, extras = {}) => ({
  uid, active: true, adultVerified: true, memberRole: "member",
  privateRoomIds: [], moderatedRoomIds: [], ...extras
});
const room = (visibility, status = "open", published = true) => ({
  title: "Forum Room", description: "Learning discussion", visibility,
  status, published, createdAt: new Date(), updatedAt: new Date(),
  updatedBy: "admin-one", version: 1, auditId: "initial-admin-audit-ref"
});
async function seed(path, value) {
  return env.withSecurityRulesDisabled(async ctx => setDoc(doc(ctx.firestore(), path), value));
}
const ctx = uid => env.authenticatedContext(uid).firestore();
before(async () => { env = await initializeTestEnvironment({ projectId, firestore: { rules } }); });
beforeEach(async () => {
  await env.clearFirestore();
  await seed("users/admin-one", profile("admin-one", "admin"));
  await seed("users/adult-one", profile("adult-one"));
  await seed("users/adult-two", profile("adult-two"));
  await seed("users/teen-one", profile("teen-one", "student"));
  await seed("users/pending-one", profile("pending-one", "volunteer", "pending"));
  await seed("users/moderator-one", profile("moderator-one"));
  await seed("forumAccessGrants/adult-one", grant("adult-one", { privateRoomIds: ["staff-room"] }));
  await seed("forumAccessGrants/adult-two", grant("adult-two"));
  await seed("forumAccessGrants/teen-one", grant("teen-one"));
  await seed("forumAccessGrants/pending-one", grant("pending-one"));
  await seed("forumAccessGrants/moderator-one", grant("moderator-one", { memberRole: "moderator", moderatedRoomIds: ["staff-room"] }));
  await seed("forumReleaseControls/pilot", {
    enabled: true, mode: "private_pilot",
    roomIds: ["staff-room"],
    expiresAt: new Date(Date.now() + 60 * 60 * 1000)
  });
  await seed("forumRooms/public-room", room("public"));
  await seed("forumRooms/staff-room", room("private"));
  await seed("forumRooms/members-room", room("members_only"));
  await seed("forumRooms/locked-room", room("public", "locked"));
  await seed("forumRooms/unpublished-room", room("public", "open", false));
});
after(async () => env.cleanup());

test("public room is browsable, private/member/locked rooms are isolated", async () => {
  const guest = env.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(guest, "forumRooms/public-room")));
  await assertFails(getDoc(doc(guest, "forumRooms/staff-room")));
  await assertFails(getDoc(doc(guest, "forumRooms/members-room")));
  await assertFails(getDoc(doc(guest, "forumRooms/locked-room")));
  await assertFails(getDoc(doc(guest, "forumRooms/unpublished-room")));
  await assertSucceeds(getDoc(doc(ctx("adult-one"), "forumRooms/staff-room")));
  await assertFails(getDoc(doc(ctx("adult-two"), "forumRooms/staff-room")));
  await assertFails(getDoc(doc(ctx("adult-two"), "forumRooms/members-room")));
  await assertFails(getDoc(doc(ctx("teen-one"), "forumRooms/members-room")));
  await assertFails(getDoc(doc(ctx("pending-one"), "forumRooms/members-room")));
  await assertSucceeds(getDoc(doc(ctx("moderator-one"), "forumRooms/staff-room")));
  await assertSucceeds(getDoc(doc(ctx("admin-one"), "forumRooms/unpublished-room")));
});

test("no member can publish rooms or elevate own private membership", async () => {
  await assertFails(updateDoc(doc(ctx("adult-one"), "forumRooms/staff-room"), { visibility: "public" }));
  await assertFails(updateDoc(doc(ctx("adult-one"), "forumAccessGrants/adult-one"), { memberRole: "moderator" }));
  await assertFails(setDoc(doc(ctx("adult-two"), "forumAccessGrants/adult-two"), grant("adult-two", { privateRoomIds: ["staff-room"] })));
  await assertFails(deleteDoc(doc(ctx("admin-one"), "forumAccessGrants/adult-one")));
});

test("admin can only give audited access to an approved non-student adult", async () => {
  await seed("users/adult-three", profile("adult-three"));
  const db = ctx("admin-one");
  const batch = writeBatch(db);
  const grantRef = doc(db, "forumAccessGrants/adult-three");
  const auditRef = doc(db, "forumGrantAudits/access-adult-three-0001");
  batch.set(grantRef, {
    uid: "adult-three", active: true, adultVerified: true, memberRole: "member",
    privateRoomIds: ["staff-room"], moderatedRoomIds: [],
    createdAt: serverTimestamp(), reviewedAt: serverTimestamp(),
    reviewedBy: "admin-one", version: 1, auditId: auditRef.id,
    reason: "Adult eligibility verified"
  });
  batch.set(auditRef, {
    uid: "adult-three", actorUid: "admin-one",
    previousActive: false, nextActive: true, version: 1,
    changedAt: serverTimestamp(), reason: "Adult eligibility verified"
  });
  await assertSucceeds(batch.commit());
  await assertSucceeds(getDoc(doc(ctx("adult-three"), "forumRooms/staff-room")));
  await assertFails(updateDoc(grantRef, { active: false, version: 2 }));
  await assertFails(updateDoc(doc(db, "forumRoomAudits/initial-admin-audit-ref"), { reason: "tampered" }));
  const bad = writeBatch(db);
  bad.set(doc(db, "forumAccessGrants/unverified-teen"), {
    uid: "unverified-teen", active: true, adultVerified: true, memberRole: "member",
    privateRoomIds: [], moderatedRoomIds: [],
    createdAt: serverTimestamp(), reviewedAt: serverTimestamp(), reviewedBy: "admin-one",
    version: 1, auditId: "unverified-teen-audit", reason: "No real adult verification"
  });
  bad.set(doc(db, "forumGrantAudits/unverified-teen-audit"), {
    uid: "unverified-teen", actorUid: "admin-one", previousActive: false,
    nextActive: true, version: 1, changedAt: serverTimestamp(), reason: "No verification"
  });
  await assertFails(bad.commit());
});

test("member topics are pending human review; no self-approval, no student posting", async () => {
  const adult = ctx("adult-one");
  const topicRef = doc(adult, "forumTopics/adult-discussion-a");
  const newTopic = {
    roomId: "staff-room", title: "Planning an ICT club", body: "How can facilitators get started?",
    authorUid: "adult-one", moderationStatus: "pending", moderationAuditId: "none",
    createdAt: serverTimestamp(), updatedAt: serverTimestamp()
  };
  await assertSucceeds(setDoc(topicRef, newTopic));
  await assertFails(getDoc(topicRef));
  await assertFails(getDoc(doc(ctx("adult-two"), "forumTopics/adult-discussion-a")));
  await assertFails(setDoc(doc(ctx("adult-two"), "forumTopics/outsider-topic"), { ...newTopic, authorUid: "adult-two" }));
  await assertFails(setDoc(doc(ctx("teen-one"), "forumTopics/teen-topic"), { ...newTopic, authorUid: "teen-one", roomId: "public-room" }));
  await assertFails(updateDoc(topicRef, { moderationStatus: "approved" }));
  await assertFails(setDoc(doc(adult, "forumTopics/forged-approve"), { ...newTopic, moderationStatus: "approved" }));
  await assertFails(setDoc(doc(adult, "forumTopics/locked-topic"), { ...newTopic, roomId: "locked-room" }));
  await assertFails(setDoc(doc(adult, "forumTopics/unpublished-topic"), { ...newTopic, roomId: "unpublished-room" }));
});

test("moderator review requires assigned room plus paired audit and redacts unapproved content", async () => {
  await seed("forumTopics/topic-private", {
    roomId: "staff-room", title: "Mentorship programme", body: "What topics should we cover?",
    authorUid: "adult-one", moderationStatus: "pending", moderationAuditId: "none",
    createdAt: new Date(), updatedAt: new Date()
  });
  const mod = ctx("moderator-one");
  await assertSucceeds(getDoc(doc(mod, "forumTopics/topic-private")));
  const batch = writeBatch(mod);
  const topicRef = doc(mod, "forumTopics/topic-private");
  const auditRef = doc(mod, "forumModerationAudits/topic-private-approval-0001");
  batch.update(topicRef, {
    moderationStatus: "approved", moderationAuditId: auditRef.id, updatedAt: serverTimestamp()
  });
  batch.set(auditRef, {
    kind: "topic", itemId: "topic-private", roomId: "staff-room",
    actorUid: "moderator-one", previousStatus: "pending", nextStatus: "approved",
    changedAt: serverTimestamp(), reason: "Approved for helpful discussion"
  });
  await assertSucceeds(batch.commit());
  await assertSucceeds(getDoc(doc(ctx("adult-one"), "forumTopics/topic-private")));
  await assertFails(getDoc(doc(ctx("adult-two"), "forumTopics/topic-private")));
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), "forumTopics/topic-private")));
  await assertFails(updateDoc(topicRef, { body: "Hidden content" }));
});

test("approved participants may report content, but cannot edit or delete reports", async () => {
  await seed("forumTopics/published-topic", {
    roomId: "staff-room", title: "Welcome message", body: "Be respectful and follow community rules.",
    authorUid: "admin-one", moderationStatus: "approved", moderationAuditId: "none",
    createdAt: new Date(), updatedAt: new Date()
  });
  const user = ctx("adult-one");
  await assertSucceeds(setDoc(doc(user, "forumReports/adult-one__topic__published-topic"), {
    roomId: "staff-room", targetType: "topic", targetId: "published-topic",
    reporterUid: "adult-one", reason: "spam", createdAt: serverTimestamp()
  }));
  await assertFails(updateDoc(doc(ctx("adult-one"), "forumReports/adult-one__topic__published-topic"), { reason: "other" }));
  await assertFails(setDoc(doc(ctx("teen-one"), "forumReports/teen-one__topic__published-topic"), {
    roomId: "staff-room", targetType: "topic", targetId: "published-topic",
    reporterUid: "teen-one", reason: "spam", createdAt: serverTimestamp()
  }));
});
