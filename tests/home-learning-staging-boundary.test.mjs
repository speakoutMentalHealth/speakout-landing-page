import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { test } from "node:test";

const config = readFileSync(new URL("../js/firebase-config.js", import.meta.url), "utf8");
const reviewer = readFileSync(new URL("../js/home-learning/reviewer.js", import.meta.url), "utf8");
const rules = readFileSync(new URL("../firebase/firestore.rules", import.meta.url), "utf8");

test("production and staging Firebase project IDs remain distinct", () => {
  assert.match(config, /projectId:\s*"speaakout-portal"/);
  assert.match(config, /projectId:\s*"speakout-portal-staging"/);
  assert.match(config, /isStagingHost\s*\?\s*stagingFirebaseConfig\s*:\s*productionFirebaseConfig/);
});

test("private reviewer is restricted to explicitly listed staging hosts", () => {
  assert.match(reviewer, /new Set\(\["speakout-portal-staging\.web\.app",\s*"speakout-portal-staging\.firebaseapp\.com"\]\)/);
  assert.match(reviewer, /if \(!hosts\.has\(location\.hostname\)\)/);
  assert.match(reviewer, /if \(!profile\.exists\(\) \|\| profile\.data\(\)\.status !== "approved" \|\| profile\.data\(\)\.role !== "teacher"\)/);
});

test("editorial decisions cannot be written through client rules", () => {
  const match = rules.match(/match \/homeLearningEditorialApprovals\/\{approvalId\} \{([\s\S]*?)\n\s*\}/);
  assert.ok(match, "Expected explicit editorial approval match");
  assert.match(match[1], /allow create, update, delete:\s*if false;/);
  assert.match(rules, /"homeLearningEditorialApprovals"/);
  assert.match(rules, /!isHomeLearningReviewCollection\(collection\)/);
});


test("assigned draft resource links stay on local HTML pages", () => {
  assert.ok(reviewer.includes("typeof item.resource_url === \"string\""));
  assert.match(reviewer, /link\.href = draft\.resource_url/);
  assert.match(reviewer, /link\.rel = "noopener noreferrer"/);
});
test("reviewer UI checks auth generation before rendering or submitting", () => {
  assert.match(reviewer, /const generation = \+\+authGeneration/);
  assert.match(reviewer, /generation !== authGeneration \|\| auth\.currentUser\?\.uid !== user\.uid/);
});

test("reviewer does not initialize Firebase on non-staging hosts", () => {
  assert.doesNotMatch(reviewer, /^import\s*\{\s*auth\s*,\s*db\s*\}\s*from\s*["']\.\.\/firebase-config\.js["']/m);
  const gate = reviewer.indexOf("if (!hosts.has(location.hostname))");
  const dynamicImport = reviewer.indexOf('await import("../firebase-config.js")');
  assert.ok(gate >= 0 && dynamicImport > gate);
  assert.match(reviewer, /app\.options\.projectId !== "speakout-portal-staging"/);
});

test("reviewer warns that draft links are not immutable lesson snapshots", () => {
  assert.match(reviewer, /not an immutable, verified version/);
  assert.match(reviewer, /Confirm the assigned source revision/);
});
test("reviewer checks auth after profile and submission awaits", () => {
  assert.match(reviewer, /await getDoc\(doc\(db, "users", user\.uid\)\);\s*if \(generation !== authGeneration/);
  assert.match(reviewer, /await setDoc\(doc\(db, "homeLearningReviewSubmissions", row\.id\), \{[\s\S]*?\}\);\s*if \(generation !== authGeneration/);
  assert.match(reviewer, /Submission could not be confirmed\. Reload and check/);
});

test("ambiguous review writes are read back before retry is allowed", () => {
  assert.match(reviewer, /A network error can occur after Firestore has committed the write/);
  assert.match(reviewer, /const saved = await getDoc\(doc\(db, "homeLearningReviewSubmissions", row\.id\)\)/);
  assert.match(reviewer, /if \(saved\.exists\(\)\)/);
  assert.match(reviewer, /Submission status is unknown\. Reload to check before attempting again/);
  assert.match(reviewer, /button\.disabled = true;/);
});

test("Auth and Firestore SDK modules load only inside staging gate", () => {
  assert.doesNotMatch(reviewer, /^import\s+.*firebase-(?:auth|firestore)\.js/m);
  const gate = reviewer.indexOf("if (!hosts.has(location.hostname))");
  const authImport = reviewer.indexOf('import("https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js")');
  const storeImport = reviewer.indexOf('import("https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js")');
  assert.ok(gate >= 0 && authImport > gate && storeImport > gate);
});
