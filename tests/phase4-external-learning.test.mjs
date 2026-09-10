import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("external-course catalog launches through the tracked details flow", () => {
  const catalog = read("speakhub.html");
  const details = read("course-details.html");
  assert.match(catalog, /if\(isExternalCourse\(i\)\)return `course-details\.html\?id=/u);
  assert.match(details, /url\.protocol==="https:"/u);
  assert.match(details, /Start on \$\{escapeHtml\(provider\)\}/u);
  assert.match(details, /external-learning-submit\.html\?courseId=/u);
});

test("proof submission is authenticated, transactional, and never written by the browser", () => {
  const page = read("external-learning-submit.html");
  const client = read("js/platform-api.js");
  const worker = read("workers/platform-api/src/index.js");
  assert.match(page, /externalLearningApi\.submit\(file/u);
  assert.doesNotMatch(page, /setDoc\(doc\(db,"externalLearningRecords"/u);
  assert.match(client, /\/v1\/external-learning\/submit/u);
  assert.match(worker, /if \(path === "\/v1\/external-learning\/submit"\)/u);
  assert.match(worker, /This submission is already awaiting review or has been approved/u);
  assert.match(worker, /tx\.set\(`externalLearningRecords\/\$\{recordId\}`/u);
  assert.match(worker, /removePrivateEvidence\(env, uploaded\)/u);
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
