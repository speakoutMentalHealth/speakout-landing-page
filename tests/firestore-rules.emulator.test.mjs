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

const otmApplication = (id = "SOM-20260916-ABCDEF12") => ({
  applicationId: id,
  organizationName: "Example Community School",
  organizationType: "School",
  country: "Nigeria",
  state: "Nasarawa",
  city: "Keffi",
  contactName: "Programme Contact",
  contactRole: "Coordinator",
  email: "coordinator@example.test",
  phone: "+2348000000000",
  program: "School Wellness",
  audience: "Students",
  ageRange: "13-17",
  expectedReach: 120,
  reason: "We want structured mental health education and practical wellbeing support for our students.",
  needs: "Students would benefit from stigma reduction, wellbeing skills, early support awareness and referral information.",
  venue: "School hall",
  logistics: "available",
  funding: "require_sponsorship",
  clubInterest: "maybe",
  partnershipInterest: "yes",
  declaration: true,
  status: "new",
  source: "on-the-move-web",
  createdAt: new Date(),
  updatedAt: new Date()
});

const sponsorEnquiry = (id = "SOMS-20260916-1234ABCD") => ({
  enquiryId: id,
  contactName: "Sponsor Contact",
  organizationName: "Example Foundation",
  contactRole: "Partnership Lead",
  email: "partner@example.test",
  phone: "+2348000000001",
  country: "Nigeria",
  scope: "Sponsor a school",
  message: "We would like to discuss supporting responsible delivery of a SpeakOut On The Move school programme.",
  declaration: true,
  status: "new",
  source: "on-the-move-sponsor-web",
  createdAt: new Date(),
  updatedAt: new Date()
});

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

test("external evidence writes are restricted to the trusted API", async () => {
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
  await assertFails(setDoc(doc(db, "externalLearningRecords/submission-a"), valid));
  await assertFails(setDoc(doc(db, "externalLearningRecords/submission-b"), { ...valid, status: "approved" }));
  await assertFails(setDoc(doc(db, "externalLearningRecords/submission-c"), { ...valid, proofData: "data:image/png;base64,secret" }));
});

test("parent/student links cannot cross school tenancy", async () => {
  await seed("users/parent-a", profile("parent-a", "parent", "school-a"));
  await seed("users/student-a", profile("student-a", "student", "school-a"));
  await seed("users/student-b", profile("student-b", "student", "school-b"));
  const db = testEnv.authenticatedContext("parent-a").firestore();
  await assertSucceeds(setDoc(doc(db, "parentStudentLinks/link-a"), {
    parentId: "parent-a", studentId: "student-a", schoolId: "school-a", status: "pending"
  }));
  await assertFails(setDoc(doc(db, "parentStudentLinks/link-b"), {
    parentId: "parent-a", studentId: "student-b", schoolId: "school-b", status: "pending"
  }));
});

test("admin access does not weaken public verification privacy", async () => {
  await seed("users/admin-a", profile("admin-a", "admin"));
  const adminDb = testEnv.authenticatedContext("admin-a").firestore();
  await assertSucceeds(setDoc(doc(adminDb, "certificates/cert-a"), {
    userId: "student-a", verificationCode: "SAFE123", finalScore: 90
  }));
  await assertSucceeds(setDoc(doc(adminDb, "publicCertificateVerifications/SAFE123"), {
    recipientName: "Learner", awardTitle: "Course", status: "active"
  }));
  const publicDb = testEnv.unauthenticatedContext().firestore();
  const projection = await assertSucceeds(getDoc(doc(publicDb, "publicCertificateVerifications/SAFE123")));
  assert.equal(projection.data().finalScore, undefined);
  await assertFails(getDoc(doc(publicDb, "certificates/cert-a")));
});

test("anonymous visitor may submit a valid On The Move application but cannot read or change it", async () => {
  const db = testEnv.unauthenticatedContext().firestore();
  const id = "SOM-20260916-ABCDEF12";
  await assertSucceeds(setDoc(doc(db, `onTheMoveApplications/${id}`), otmApplication(id)));
  await assertFails(getDoc(doc(db, `onTheMoveApplications/${id}`)));
  await assertFails(updateDoc(doc(db, `onTheMoveApplications/${id}`), { status: "approved" }));
});

test("On The Move public create validation rejects forged status, identifier and unexpected fields", async () => {
  const db = testEnv.unauthenticatedContext().firestore();
  await assertFails(setDoc(doc(db, "onTheMoveApplications/SOM-20260916-BAD00001"), {
    ...otmApplication("SOM-20260916-BAD00001"), status: "approved"
  }));
  await assertFails(setDoc(doc(db, "onTheMoveApplications/guessable-id"), {
    ...otmApplication("guessable-id")
  }));
  await assertFails(setDoc(doc(db, "onTheMoveApplications/SOM-20260916-BAD00002"), {
    ...otmApplication("SOM-20260916-BAD00002"), privateHealthDisclosure: "sensitive"
  }));
});

test("ordinary approved portal users cannot read or manage On The Move applications", async () => {
  await seed("users/student-a", profile("student-a", "student"));
  const id = "SOM-20260916-ABCDEF12";
  await seed(`onTheMoveApplications/${id}`, otmApplication(id));
  const db = testEnv.authenticatedContext("student-a").firestore();
  await assertFails(getDoc(doc(db, `onTheMoveApplications/${id}`)));
  await assertFails(updateDoc(doc(db, `onTheMoveApplications/${id}`), { status: "screening" }));
});

test("approved admin can read and manage On The Move applications", async () => {
  await seed("users/admin-a", profile("admin-a", "admin"));
  const id = "SOM-20260916-ABCDEF12";
  await seed(`onTheMoveApplications/${id}`, otmApplication(id));
  const db = testEnv.authenticatedContext("admin-a").firestore();
  await assertSucceeds(getDoc(doc(db, `onTheMoveApplications/${id}`)));
  await assertSucceeds(updateDoc(doc(db, `onTheMoveApplications/${id}`), {
    status: "screening",
    assignedTo: "Programme Team",
    internalNotes: "Initial institutional review started."
  }));
  await assertFails(updateDoc(doc(db, `onTheMoveApplications/${id}`), {
    communicationHistory: [{ subject: "Forged send", deliveryStatus: "accepted" }]
  }));
  await assertFails(updateDoc(doc(db, `onTheMoveApplications/${id}`), { lastCommunicationAt: new Date() }));
});

test("anonymous sponsor enquiry is write-only and cannot choose an internal status", async () => {
  const db = testEnv.unauthenticatedContext().firestore();
  const id = "SOMS-20260916-1234ABCD";
  await assertSucceeds(setDoc(doc(db, `onTheMoveSponsorEnquiries/${id}`), sponsorEnquiry(id)));
  await assertFails(getDoc(doc(db, `onTheMoveSponsorEnquiries/${id}`)));
  await assertFails(setDoc(doc(db, "onTheMoveSponsorEnquiries/SOMS-20260916-BAD00001"), {
    ...sponsorEnquiry("SOMS-20260916-BAD00001"), status: "approved"
  }));
});

test("approved admin can review sponsor enquiries while ordinary users cannot", async () => {
  await seed("users/admin-a", profile("admin-a", "admin"));
  await seed("users/student-a", profile("student-a", "student"));
  const id = "SOMS-20260916-1234ABCD";
  await seed(`onTheMoveSponsorEnquiries/${id}`, sponsorEnquiry(id));
  const adminDb = testEnv.authenticatedContext("admin-a").firestore();
  const studentDb = testEnv.authenticatedContext("student-a").firestore();
  await assertSucceeds(getDoc(doc(adminDb, `onTheMoveSponsorEnquiries/${id}`)));
  await assertSucceeds(updateDoc(doc(adminDb, `onTheMoveSponsorEnquiries/${id}`), { status: "contacted" }));
  await assertFails(updateDoc(doc(adminDb, `onTheMoveSponsorEnquiries/${id}`), {
    communicationHistory: [{ subject: "Forged send", deliveryStatus: "accepted" }]
  }));
  await assertFails(getDoc(doc(studentDb, `onTheMoveSponsorEnquiries/${id}`)));
});


test("TV curator data is restricted to approved administrators", async () => {
  await seed("users/admin-a", profile("admin-a", "admin"));
  await seed("users/student-a", profile("student-a", "student"));
  await seed("tvCuratorSources/source-a", { channelId: "UCexample", status: "active" });
  await seed("tvCuratorCandidates/candidate-a", { videoId: "video-a", status: "pending" });

  const adminDb = testEnv.authenticatedContext("admin-a").firestore();
  await assertSucceeds(getDoc(doc(adminDb, "tvCuratorSources/source-a")));
  await assertSucceeds(getDoc(doc(adminDb, "tvCuratorCandidates/candidate-a")));

  const studentDb = testEnv.authenticatedContext("student-a").firestore();
  await assertFails(getDoc(doc(studentDb, "tvCuratorSources/source-a")));
  await assertFails(getDoc(doc(studentDb, "tvCuratorCandidates/candidate-a")));
  await assertFails(setDoc(doc(studentDb, "tvCuratorSources/source-b"), { channelId: "UCother", status: "active" }));
  await assertFails(updateDoc(doc(studentDb, "tvCuratorCandidates/candidate-a"), { status: "drafted" }));
});
