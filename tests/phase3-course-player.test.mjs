import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("production Worker configuration is ready while the frontend remains fail-closed before deployment", () => {
  const config = read("js/platform-config.js");
  const workerConfig = JSON.parse(read("workers/platform-api/wrangler.production.jsonc"));
  assert.doesNotMatch(config, /speakout-platform-api\.speakout-platform-api\.workers\.dev/u);
  assert.match(config, /:\s*"";/u);
  assert.equal(workerConfig.vars.FIREBASE_PROJECT_ID, "speaakout-portal");
  assert.match(workerConfig.vars.ALLOWED_ORIGINS, /https:\/\/speakoutmentalhealth\.org/u);
  assert.equal(workerConfig.observability.enabled, true);
  assert.ok(workerConfig.compatibility_flags.includes("nodejs_compat"));
});

test("opening the player enrolls once and all learning writes require enrollment", () => {
  const player = read("course-player.html");
  const client = read("js/platform-api.js");
  const worker = read("workers/platform-api/src/index.js");
  assert.match(player, /learningApi\.enroll\(courseId\)/u);
  assert.match(client, /\/v1\/learning\/enroll/u);
  assert.match(worker, /if \(path === "\/v1\/learning\/enroll"\)/u);
  assert.ok((worker.match(/requireEnrollment\(ctx\)/gu) || []).length >= 3);
  assert.match(worker, /created: false/u);
});

test("lesson order, server grading, and atomic certificate issuance remain enforced", () => {
  const worker = read("workers/platform-api/src/index.js");
  assert.match(worker, /Complete the previous lesson first\./u);
  assert.match(worker, /answers\.length !== questions\.length/u);
  assert.match(worker, /const key = answerIndex\(question\)/u);
  assert.match(worker, /tx\.set\(`certificates\/\$\{id\}`/u);
  assert.match(worker, /tx\.set\(`publicCertificateVerifications\/\$\{verificationCode\}`/u);
  assert.doesNotMatch(read("course-player.html"), /q\.answer|correctAnswer/u);
});

test("learner dashboards use the authenticated API instead of incompatible Firestore queries", () => {
  const worker = read("workers/platform-api/src/index.js");
  assert.match(worker, /\/v1\/learning\/dashboard/u);
  for (const file of ["my-courses.html", "progress.html", "certificates.html"]) {
    const page = read(file);
    assert.match(page, /learningApi\.dashboard\(\)/u, file);
    assert.doesNotMatch(page, /SO\.getMine\("(?:userProgress|certificates)"/u, file);
  }
  assert.match(read("my-courses.html"), /No enrolled courses found/u);
});

test("secure assessment migration is never deployed as a browser utility", () => {
  const firebase = JSON.parse(read("firebase.json"));
  const githubPages = read("_config.yml");
  assert.ok(firebase.hosting.ignore.includes("firestore-seed/*.mjs"));
  assert.match(githubPages, /firestore-seed\/migrate-course-assessments\.mjs/u);
});
