import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("unapproved accounts can resolve only their own profile state before safe sign-out", () => {
  const rules = read("firebase/firestore.rules");
  assert.match(rules, /allow read: if \(isSignedIn\(\) && request\.auth\.uid == userId\)/u);
  assert.match(rules, /\(isApproved\(\) &&/u);
  assert.match(rules, /allow update: if isSuperAdmin\(\) \|\|/u);
});

test("login distinguishes denied canonical states and signs them out", () => {
  const auth = read("js/auth.js");
  assert.match(auth, /status==="suspended"/u);
  assert.match(auth, /status==="rejected"/u);
  assert.match(auth, /Your account is pending approval\./u);
  assert.match(auth, /await signOut\(auth\);/u);
  assert.match(auth, /isApprovedProfile\(profile\)/u);
});

test("approval browser workflow remains a release-quality staging gate", () => {
  const workflow = read(".github/workflows/approval-state-browser.yml");
  assert.match(workflow, /Deploy branch Firestore rules to staging/u);
  assert.match(workflow, /Deploy branch Worker to staging/u);
  assert.match(workflow, /Run approval-state browser matrix/u);
  const browser = read("tests/approval-state-browser.mjs");
  assert.match(browser, /student-pending/u);
  assert.match(browser, /student-rejected/u);
  assert.match(browser, /student-suspended/u);
  assert.match(browser, /super-admin-pending/u);
  assert.match(browser, /super-admin-rejected/u);
  assert.match(browser, /super-admin-suspended/u);
});
