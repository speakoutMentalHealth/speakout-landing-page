import { before, beforeEach, after, test } from "node:test";
import { readFileSync } from "node:fs";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, setDoc, getDoc, updateDoc, writeBatch, serverTimestamp } from "firebase/firestore";

const projectId = "demo-speakout-rules";
const rules = readFileSync(new URL("../firebase/firestore.rules", import.meta.url), "utf8");
let env;
const profile = (uid, role, status = "approved") => ({
  uid, email: uid + "@example.test", role, status, approved: status === "approved"
});
async function seed(path, data) {
  await env.withSecurityRulesDisabled(async ctx => setDoc(doc(ctx.firestore(), path), data));
}
before(async () => {
  env = await initializeTestEnvironment({ projectId, firestore: { rules } });
});
beforeEach(async () => {
  await env.clearFirestore();
  await seed("users/admin-a", profile("admin-a", "admin"));
  await seed("users/learner-a", profile("learner-a", "student"));
  await seed("users/teacher-a", profile("teacher-a", "teacher"));
  await seed("users/pending-admin", profile("pending-admin", "admin", "pending"));
});
after(async () => env.cleanup());

function createRoomBatch(db, roomId, actorUid = "admin-a") {
  const batch = writeBatch(db);
  const roomRef = doc(db, "forumRooms", roomId);
  const auditRef = doc(db, "forumRoomAudits", roomId + "-audit-creation");
  batch.set(roomRef, {
    title: "School Leaders", description: "Professional networking",
    visibility: "private", status: "locked", published: false,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    updatedBy: actorUid, version: 1, auditId: auditRef.id
  });
  batch.set(auditRef, {
    roomId, actorUid, previousVisibility: "none", nextVisibility: "private",
    previousStatus: "none", nextStatus: "locked", previousPublished: false, nextPublished: false, revision: 1,
    reason: "Initial room setup", changedAt: serverTimestamp()
  });
  return batch;
}
test("only approved admins may create rooms; audit record required", async () => {
  const admin = env.authenticatedContext("admin-a").firestore();
  await assertSucceeds(createRoomBatch(admin, "school-leaders").commit());
  await assertSucceeds(getDoc(doc(admin, "forumRooms/school-leaders")));
  const learner = env.authenticatedContext("learner-a").firestore();
  await assertFails(getDoc(doc(learner, "forumRooms/school-leaders")));
  await assertFails(setDoc(doc(learner, "forumRooms/learner-room"), {
    title: "Learner Room", description: "", visibility: "public", status: "open", published: false
  }));
  const pending = env.authenticatedContext("pending-admin").firestore();
  await assertFails(getDoc(doc(pending, "forumRooms/school-leaders")));
  const guest = env.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(guest, "forumRooms/school-leaders")));
});
test("an admin cannot bypass paired audit or publish any room", async () => {
  const db = env.authenticatedContext("admin-a").firestore();
  await assertFails(setDoc(doc(db, "forumRooms/bare-room"), {
    title: "Unsafe room", description: "", visibility: "public", status: "open",
    published: false, version: 1, auditId: "some-placeholder-event",
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(), updatedBy: "admin-a"
  }));
  await assertSucceeds(createRoomBatch(db, "private-room").commit());
  await assertFails(updateDoc(doc(db, "forumRooms/private-room"), {
    status: "open", version: 2, updatedAt: serverTimestamp(),
    auditId: "missing-audit-event"
  }));
  const bad = writeBatch(db);
  bad.update(doc(db, "forumRooms/private-room"), {
    visibility: "public", published: true, version: 2,
    auditId: "private-room-audit-publish", updatedAt: serverTimestamp()
  });
  bad.set(doc(db, "forumRoomAudits/private-room-audit-publish"), {
    roomId: "private-room", actorUid: "admin-a",
    previousVisibility: "private", nextVisibility: "public",
    previousStatus: "locked", nextStatus: "locked", previousPublished: false, nextPublished: true,
    revision: 2, reason: "Unsafe public change", changedAt: serverTimestamp()
  });
  await assertFails(bad.commit());
});
test("admin may lock/reopen without changing visibility, only with immutable paired audits", async () => {
  const db = env.authenticatedContext("admin-a").firestore();
  await assertSucceeds(createRoomBatch(db, "mentor-room").commit());
  const batch = writeBatch(db);
  const roomRef = doc(db, "forumRooms/mentor-room");
  const auditRef = doc(db, "forumRoomAudits/mentor-room-audit-reopen");
  batch.update(roomRef, {
    status: "open", visibility: "private", version: 2,
    updatedAt: serverTimestamp(), updatedBy: "admin-a", auditId: auditRef.id
  });
  batch.set(auditRef, {
    roomId: "mentor-room", actorUid: "admin-a",
    previousVisibility: "private", nextVisibility: "private",
    previousStatus: "locked", nextStatus: "open", previousPublished: false, nextPublished: false,
    revision: 2, reason: "Approved temporary reopening",
    changedAt: serverTimestamp()
  });
  await assertSucceeds(batch.commit());
  await assertFails(updateDoc(auditRef, { reason: "Rewritten record" }));
  await assertFails(setDoc(doc(db, "forumTopics/topic-a"), { roomId: "mentor-room" }));
  await assertFails(setDoc(doc(db, "forumRoomMembers/member-a"), { roomId: "mentor-room" }));
  const teacher = env.authenticatedContext("teacher-a").firestore();
  await assertFails(getDoc(doc(teacher, "forumRooms/mentor-room")));
});

test("AI eligibility and token records cannot be accessed directly even by Super Admin", async()=>{await seed("users/super-ai",profile("super-ai","super_admin"));for(const name of ["mindcheckAdultAccess","mindcheckAIConsents","mindcheckAccessAudits","mindcheckTokenLimits"]){await seed(name+"/adult-ai",{subject:"adult-ai",status:"active"});for(const uid of ["super-ai","admin-a","learner-a"]){const db=env.authenticatedContext(uid).firestore();await assertFails(getDoc(doc(db,name,"adult-ai")));await assertFails(setDoc(doc(db,name,"adult-ai"),{status:"active"}));}}});
