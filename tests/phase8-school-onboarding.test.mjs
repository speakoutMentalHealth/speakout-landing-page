import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = file => readFileSync(path.join(root, file), "utf8");

test("unified access gateway exposes login, member join and school registration", () => {
  const html = read("auth.html");
  assert.match(html, /data-access-mode="login"/u);
  assert.match(html, /data-access-mode="join"/u);
  assert.match(html, /data-access-mode="school"/u);
  assert.match(html, /id="schoolRegisterForm"/u);
  assert.match(html, /id="studentRegNumber"/u);
  assert.doesNotMatch(html, /<option value="school_admin">School Administrator<\/option>/u);
});

test("school-linked signup verifies a public directory code and captures student identity", () => {
  const auth = read("js/auth.js");
  assert.match(auth, /schoolDirectory/u);
  assert.match(auth, /pending_school_approval/u);
  assert.match(auth, /studentRegNumber/u);
  assert.match(auth, /studentSchoolClaims/u);
  assert.match(auth, /schoolVerificationStatus/u);
  assert.match(auth, /URLSearchParams/u);
});

test("school registration creates a pending institution and pending primary admin", () => {
  const auth = read("js/auth.js");
  assert.match(auth, /role:\s*"school_admin"/u);
  assert.match(auth, /status:\s*"pending"/u);
  assert.match(auth, /doc\(db, "schools", userId\)/u);
  assert.match(auth, /accountSource:\s*"school-registration"/u);
});

test("school approval activates the administrator and publishes a minimal school directory record", () => {
  const admin = read("admin-schools.html");
  assert.match(admin, /schoolDirectory/u);
  assert.match(admin, /schoolVerificationStatus:"approved"/u);
  assert.match(admin, /approved:true/u);
  assert.match(admin, /uniqueSchoolCode/u);
});

test("Firestore rules permit only constrained pending school applications and verified school-linked users", () => {
  const rules = read("firebase/firestore.rules");
  assert.match(rules, /function validSchoolLinkedApplicant\(\)/u);
  assert.match(rules, /match \/schoolDirectory\/\{schoolCode\}/u);
  assert.match(rules, /match \/studentSchoolClaims\/\{claimId\}/u);
  assert.match(rules, /request\.auth\.uid == schoolId/u);
  assert.match(rules, /request\.resource\.data\.status == "pending_school_approval"/u);
});

test("legacy registration and nested auth routes converge on the unified gateway", () => {
  const schoolRegister = read("school-register.html");
  const nestedAuth = read("auth/auth.html");
  assert.match(schoolRegister, /auth\.html\?mode=school#access/u);
  assert.match(nestedAuth, /\.\.\/auth\.html/u);
});

test("production deploy includes Firestore rules before hosting", () => {
  const workflow = read(".github/workflows/deploy-firebase-hosting.yml");
  assert.match(workflow, /Deploy Firestore security rules/u);
  assert.match(workflow, /firebase-tools@latest deploy --only firestore:rules/u);
});
