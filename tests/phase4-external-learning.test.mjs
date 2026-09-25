import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("external-course catalog launches through the tracked details flow", () => {
  const catalog = read("speakhub.html");
  const details = read("course-details.html");
  const myCourses = read("my-courses.html");

  assert.match(catalog, /course-details\.html\?id=\$\{id\}/u);
  assert.match(details, /function safeExternalUrl\(value\)/u);
  assert.match(details, /url\.protocol==="https:"/u);
  assert.match(details, /externalLearningApi\.start\(course\.id\)/u);
  assert.match(details, /Start on \$\{provider\}/u);
  assert.match(details, /external-learning-submit\.html\?courseId=/u);
  assert.match(details, /This is an external-provider pathway/u);
  assert.match(myCourses, /isExternalCourse\(c\)\?[^:]+course-details\.html\?id=/u);
  assert.doesNotMatch(myCourses, /courseHref=c=>[^\n]*externalUrl/u);
});

test("proof submission is authenticated, transactional, and never written by the browser", () => {
  const page = read("external-learning-submit.html");
  const client = read("js/platform-api.js");
  const worker = read("workers/platform-api/src/index.js");
  assert.match(page, /externalLearningApi\.submit\(file/u);
  assert.doesNotMatch(page, /setDoc\(doc\(db,"externalLearningRecords"/u);
  assert.match(client, /\/v1\/external-learning\/submit/u);
  assert.match(worker, /if \(path === "\/v1\/external-learning\/submit"\)/u);
  assert.match(worker, /\["started", "rejected", "resubmission_required"\]/u);
  assert.match(worker, /This submission is already awaiting review or has been approved/u);
  assert.match(page, /protected evidence storage/u);
  assert.doesNotMatch(page, /stored in Firestore/u);
  assert.match(worker, /tx\.set\(`externalLearningRecords\/\$\{recordId\}`/u);
  assert.match(worker, /removePrivateEvidence\(env, uploaded\)/u);
});


test("verified external catalogue is trusted server-side for tracking and submission", async () => {
  const { VERIFIED_EXTERNAL_COURSES, VERIFIED_EXTERNAL_COURSE_BY_ID } =
    await import("../workers/platform-api/src/verified-external-courses.js");
  const worker = read("workers/platform-api/src/index.js");
  const submission = read("external-learning-submit.html");

  assert.equal(VERIFIED_EXTERNAL_COURSES.length, 39);
  assert.equal(new Set(VERIFIED_EXTERNAL_COURSES.map(course => course.id)).size, 39);
  assert.equal(VERIFIED_EXTERNAL_COURSES.every(course =>
    course.provider &&
    ["active", "published"].includes(String(course.status || "").toLowerCase()) &&
    /^https:\/\//u.test(course.externalUrl || "")
  ), true);
  assert.equal(VERIFIED_EXTERNAL_COURSE_BY_ID.size, 39);

  assert.match(worker, /VERIFIED_EXTERNAL_COURSE_BY_ID/u);
  assert.match(worker, /async function externalCourseForTracking\(/u);
  assert.match(worker, /const course = await externalCourseForTracking\(env, requestedCourseId\)/u);
  assert.match(submission, /PHASE2_VERIFIED_COURSES\.find\(item=>item\.id===courseId\)/u);
  assert.match(submission, /isPublicCourse\(course\)/u);
});

test("external course starts are authenticated idempotent and server-authoritative", () => {
  const client = read("js/platform-api.js");
  const worker = read("workers/platform-api/src/index.js");
  const rules = read("firebase/firestore.rules");
  const block = rules.match(/match \/externalLearningRecords[\s\S]*?match \/contributors/u)?.[0] || "";

  assert.match(client, /start: courseId => platformRequest\("\/v1\/external-learning\/start", \{ courseId \}\)/u);
  assert.match(worker, /if \(path === "\/v1\/external-learning\/start"\)/u);
  assert.match(worker, /status: "started"/u);
  assert.match(worker, /verificationStatus: "not_submitted"/u);
  assert.match(worker, /if \(existing\) return \{ ok: true, created: false/u);
  assert.match(worker, /filter\(record => normalized\(record\.status\) !== "started"\)/u);
  assert.match(block, /allow create, update, delete: if isSuperAdmin\(\)/u);
  assert.doesNotMatch(block, /request\.resource\.data\.status == "started"/u);
});

test("learning dashboard returns external pathway state without evidence metadata", () => {
  const worker = read("workers/platform-api/src/index.js");
  const myCourses = read("my-courses.html");
  const student = read("student-dashboard.html");
  const teacher = read("teacher-dashboard.html");
  const parent = read("parent-dashboard.html");

  assert.match(worker, /progressPage, certificatesPage, externalPage\] = await Promise\.all/u);
  assert.match(worker, /externalLearning: externalPage\.documents\.map\(publicExternalLearningRecord\)/u);
  const sanitizer = worker.match(/function publicExternalLearningRecord[\s\S]*?\n\}/u)?.[0] || "";
  assert.match(sanitizer, /courseId/u);
  assert.doesNotMatch(sanitizer, /evidencePublicId|evidenceAssetId|proofData|proofUrl/u);

  assert.match(myCourses, /dashboard\.externalLearning/u);
  assert.match(myCourses, /PHASE2_VERIFIED_COURSES/u);
  assert.match(student, /dashboard\.externalLearning/u);
  assert.match(teacher, /dashboard\.externalLearning/u);
  assert.match(parent, /dashboard\.externalLearning/u);
});

test("production evidence is private R2 data streamed only through the admin API", () => {
  const config = JSON.parse(read("workers/platform-api/wrangler.production.jsonc"));
  const worker = read("workers/platform-api/src/index.js");
  assert.deepEqual(config.r2_buckets, [{ binding: "EVIDENCE_BUCKET", bucket_name: "speakout-private-evidence" }]);
  assert.match(worker, /EVIDENCE_BUCKET\.put\(publicId, file\.stream\(\)/u);
  assert.match(worker, /customMetadata: \{ ownerId: user\.uid, assetId, format \}/u);
  assert.match(worker, /return new Response\(object\.body/u);
  assert.match(worker, /Evidence ownership validation failed/u);
  assert.doesNotMatch(worker, /return\s+\{[^}]*signedUrl/u);
});

test("admins review through one API queue and approval issues a verifiable certificate atomically", () => {
  const page = read("admin-external-certificates.html");
  const client = read("js/platform-api.js");
  const worker = read("workers/platform-api/src/index.js");
  assert.match(page, /adminApi\.listExternalLearning\(\)/u);
  assert.doesNotMatch(page, /onSnapshot\(/u);
  assert.match(client, /\/v1\/admin\/external-learning\/list/u);
  assert.match(worker, /queryAllDocuments\(env, "externalLearningRecords"\)/u);
  assert.match(worker, /const externalCertificateId = decision === "approved"/u);
  assert.match(worker, /certificateId: externalCertificateId/u);
  assert.match(worker, /tx\.set\(`certificates\/\$\{id\}`/u);
  assert.match(worker, /tx\.set\(`publicCertificateVerifications\/\$\{verificationCode\}`/u);
  assert.match(worker, /achievementType: "externally-completed course verified by SpeakOut"/u);
});

test("learner Firestore writes cannot bypass the trusted external-learning API", () => {
  const rules = read("firebase/firestore.rules");
  const block = rules.match(/match \/externalLearningRecords[\s\S]*?match \/contributors/u)?.[0] || "";
  assert.match(block, /allow create, update, delete: if isSuperAdmin\(\)/u);
  assert.doesNotMatch(block, /request\.resource\.data\.status == "pending_review"/u);
});
