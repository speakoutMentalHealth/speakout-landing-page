import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("ordinary profile updates cannot change protected authorization fields", () => {
  const rules = read("firebase/firestore.rules");
  const editableBlock = rules.match(/function onlyEditableProfileFieldsChanged\(\)[\s\S]*?\n    \}/u)?.[0] || "";
  for (const protectedField of ["role", "status", "approved", "schoolId", "schoolCode", "email"]) {
    assert.equal(editableBlock.includes(`"${protectedField}"`), false, `${protectedField} must remain protected`);
  }
  assert.match(rules, /request\.auth\.uid == userId &&\s*onlyEditableProfileFieldsChanged\(\)/u);
});

test("new browser accounts must be pending and non-admin", () => {
  const rules = read("firebase/firestore.rules");
  assert.match(rules, /request\.resource\.data\.status == "pending"/u);
  assert.match(rules, /request\.resource\.data\.approved == false/u);
  assert.doesNotMatch(rules.match(/function isPublicRole[\s\S]*?\n    \}/u)?.[0] || "", /"admin"|"super_admin"/u);
});

test("authoritative progress and certificates reject learner writes", () => {
  const rules = read("firebase/firestore.rules");
  const progress = rules.match(/match \/userProgress[\s\S]*?match \/readingProgress/u)?.[0] || "";
  const certificates = rules.match(/match \/certificates[\s\S]*?match \/publicCertificateVerifications/u)?.[0] || "";
  assert.match(progress, /allow write: if isSuperAdmin\(\)/u);
  assert.match(certificates, /allow create, update, delete: if isSuperAdmin\(\)/u);
});

test("primary course player contains no browser-side grading or certificate writes", () => {
  const player = read("course-player.html");
  assert.doesNotMatch(player, /q\.answer|correctAnswer/u);
  assert.doesNotMatch(player, /setDoc\(doc\(db,"(?:userProgress|certificates)"/u);
  assert.match(player, /learningApi\.submitAssessment/u);
  assert.match(player, /learningApi\.completeLesson/u);
});

test("Firebase deployment config does not deploy Cloud Functions", () => {
  const config = JSON.parse(read("firebase.json"));
  assert.equal("functions" in config, false);
  assert.equal(config.hosting.public, ".");
  assert.ok(config.hosting.ignore.includes("functions/**"));
  assert.ok(config.hosting.ignore.includes("workers/**"));
});
