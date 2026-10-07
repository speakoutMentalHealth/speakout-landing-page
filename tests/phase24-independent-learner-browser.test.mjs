import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("independent learner browser acceptance script parses", () => {
  const path = new URL("../tests/independent-learner-browser.mjs", import.meta.url).pathname;
  execFileSync(process.execPath, ["--check", path]);
});

test("independent learner acceptance covers the full V1 browser path", () => {
  const source = read("tests/independent-learner-browser.mjs");
  for (const marker of [
    "browserRegister",
    "trusted staging approval",
    "browserLogin",
    "courseDiscovery",
    "progressPersistence",
    "moduleAssessment",
    "finalAssessment",
    "publicCertificateVerification",
    "logoutAndRecover"
  ]) {
    assert.match(source, new RegExp(marker));
  }
  const workflow = read(".github/workflows/independent-learner-browser.yml");
  assert.match(workflow, /Run independent learner browser journey/u);
  assert.match(workflow, /Deploy branch Firestore rules to staging/u);
  assert.match(workflow, /Deploy branch Worker to staging/u);
});


test("independent learner dashboard does not self-write protected student identity", () => {
  const source = read("js/learner/student-dashboard.js");
  const start = source.indexOf("async function ensureStudentId");
  const end = source.indexOf("function renderProfile", start);
  assert.ok(start >= 0 && end > start);
  const block = source.slice(start, end);
  assert.doesNotMatch(block, /setDoc\(/u);
  assert.match(block, /independentLearnerId\(user\.uid\)/u);
  assert.match(block, /p\.schoolId \|\| p\.schoolCode/u);

  const page = read("student-dashboard.html");
  assert.match(page, /<span>Learner ID<\/span>/u);
});
