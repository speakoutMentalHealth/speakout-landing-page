import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

const PROJECT_ID = "demo-speakout-rules";
const rules = readFileSync(new URL("../firebase/firestore.rules", import.meta.url), "utf8");
let testEnv;

const profile = (uid, role, schoolId = "school-a") => ({
  uid,
  email: `${uid}@example.test`,
  fullName: uid,
  role,
  schoolId,
  status: "approved",
  approved: true
});

async function seed(path, value) {
  await testEnv.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), path), value);
  });
}

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules }
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

after(async () => {
  await testEnv.cleanup();
});

test("registration permits only a pending non-admin profile", async () => {
  const db = testEnv.authenticatedContext("new-user").firestore();
  await assertSucceeds(setDoc(doc(db, "users/new-user"), {
    uid: "new-user",
    email: "new@example.test",
    role: "student",
    status: "pending",
    approved: false
  }));
  const attackerDb = testEnv.authenticatedContext("attacker").firestore();
  await assertFails(setDoc(doc(attackerDb, "users/attacker"), {
    uid: "attacker",
    email: "attacker@example.test",
    role: "admin",
    status: "pending",
    approved: false
  }));
});

test("an approved learner may edit profile fields but cannot self-promote", async () => {
  await seed("users/student-a", profile("student-a", "student"));
  const db = testEnv.authenticatedContext("student-a").firestore();
  await assertSucceeds(updateDoc(doc(db, "users/student-a"), { bio: "Updated safely" }));
  await assertFails(updateDoc(doc(db, "users/student-a"), { role: "admin" }));
  await assertFails(updateDoc(doc(db, "users/student-a"), { status: "approved", schoolId: "school-b" }));
});

test("answer keys and authoritative credential writes are denied to learners", async () => {
  await seed("users/student-a", profile("student-a", "student"));
  await seed("courseAssessments/course-a__final", { questions: [{ answer: 0 }] });
  await seed("userProgress/student-a_course-a", { userId: "student-a", courseId: "course-a" });
  await seed("publicCertificateVerifications/ABC123", { recipientName: "Learner", status: "active" });
  const db = testEnv.authenticatedContext("student-a").firestore();
  await assertFails(getDoc(doc(db, "courseAssessments/course-a__final")));
  await assertSucceeds(getDoc(doc(db, "userProgress/student-a_course-a")));
  await assertFails(updateDoc(doc(db, "userProgress/student-a_course-a"), { status: "completed" }));
  await assertFails(setDoc(doc(db, "certificates/fake"), { userId: "student-a", status: "active" }));
  await assertSucceeds(getDoc(doc(db, "publicCertificateVerifications/ABC123")));
});

test("reading position is self-writable but cannot masquerade as course progress", async () => {
  await seed("users/student-a", profile("student-a", "student"));
  await seed("users/student-b", profile("student-b", "student"));
  const db = testEnv.authenticatedContext("student-a").firestore();
  await assertSucceeds(setDoc(doc(db, "readingProgress/student-a_book-a"), {
    userId: "student-a",
    type: "book",
    itemId: "book-a",
    page: 2
  }));
  await assertFails(setDoc(doc(db, "readingProgress/student-b_book-a"), {
    userId: "student-b",
    type: "book",
    itemId: "book-a",
    page: 99
  }));
  await assertFails(setDoc(doc(db, "readingProgress/student-a_course-a"), {
    userId: "student-a",
    type: "course",
    percent: 100
  }));
});

test("external evidence requires private Cloudinary metadata and cannot self-approve", async () => {
  await seed("users/student-a", profile("student-a", "student"));
  const db = testEnv.authenticatedContext("student-a").firestore();
  const valid = {
    userId: "student-a",
    courseId: "course-a",
    status: "pending_review",
    verificationStatus: "pending",
    evidenceAssetId: "immutable-asset-id",
    evidencePublicId: "speakout/private-evidence/student-a/11111111-1111-4111-8111-111111111111",
    evidenceVersion: 1700000000,
    evidenceFormat: "png",
    evidenceResourceType: "image"
  };
  await assertSucceeds(setDoc(doc(db, "externalLearningRecords/submission-a"), valid));
  await assertFails(setDoc(doc(db, "externalLearningRecords/submission-b"), {
    ...valid,
    status: "approved"
  }));
  await assertFails(setDoc(doc(db, "externalLearningRecords/submission-c"), {
    ...valid,
    proofData: "data:image/png;base64,secret"
  }));
});

test("parent/student links cannot cross school tenancy", async () => {
  await seed("users/parent-a", profile("parent-a", "parent", "school-a"));
  await seed("users/student-a", profile("student-a", "student", "school-a"));
  await seed("users/student-b", profile("student-b", "student", "school-b"));
  const db = testEnv.authenticatedContext("parent-a").firestore();
  await assertSucceeds(setDoc(doc(db, "parentStudentLinks/link-a"), {
    parentId: "parent-a",
    studentId: "student-a",
    schoolId: "school-a",
    status: "pending"
  }));
  await assertFails(setDoc(doc(db, "parentStudentLinks/link-b"), {
    parentId: "parent-a",
    studentId: "student-b",
    schoolId: "school-b",
    status: "pending"
  }));
});

test("admin access does not weaken public verification privacy", async () => {
  await seed("users/admin-a", profile("admin-a", "admin"));
  const adminDb = testEnv.authenticatedContext("admin-a").firestore();
  await assertSucceeds(setDoc(doc(adminDb, "certificates/cert-a"), {
    userId: "student-a",
    verificationCode: "SAFE123",
    finalScore: 90
  }));
  await assertSucceeds(setDoc(doc(adminDb, "publicCertificateVerifications/SAFE123"), {
    recipientName: "Learner",
    awardTitle: "Course",
    status: "active"
  }));
  const publicDb = testEnv.unauthenticatedContext().firestore();
  const projection = await assertSucceeds(getDoc(doc(publicDb, "publicCertificateVerifications/SAFE123")));
  assert.equal(projection.data().finalScore, undefined);
  await assertFails(getDoc(doc(publicDb, "certificates/cert-a")));
});
