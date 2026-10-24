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
  assert.match(reviewer, /\^\[a-z0-9-\]\+\\\.html\$/);
  assert.match(reviewer, /link\.href = draft\.resource_url/);
  assert.match(reviewer, /link\.rel = "noopener noreferrer"/);
});
test("reviewer UI checks auth generation before rendering or submitting", () => {
  assert.match(reviewer, /const generation = \+\+authGeneration/);
  assert.match(reviewer, /generation !== authGeneration \|\| auth\.currentUser\?\.uid !== user\.uid/);
});
