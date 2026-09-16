import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("production frontend targets the deployed production learning API", () => {
  const config = read("js/platform-config.js");
  const workerConfig = JSON.parse(read("workers/platform-api/wrangler.production.jsonc"));
  assert.match(config, /speakout-platform-api\.speakout-platform-api\.workers\.dev/u);
  assert.equal(workerConfig.vars.FIREBASE_PROJECT_ID, "speaakout-portal");
  assert.deepEqual(workerConfig.secrets.required.sort(), ["FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY", "RESEND_API_KEY"]);
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

test("certificate issuance and printing never substitute an email for the learner name", () => {
  const worker = read("workers/platform-api/src/index.js");
  const certificate = read("certificate-view.html");
  assert.match(worker, /function humanName\(profile = \{\}\)/u);
  assert.match(worker, /recipientName: humanName\(user\.profile\)/u);
  assert.doesNotMatch(worker, /recipientName: user\.profile\.fullName \|\| user\.email/u);
  assert.match(certificate, /async function resolveRecipient\(record\)/u);
  assert.match(certificate, /getDoc\(doc\(db,"users",ownerId\)\)/u);
  assert.match(certificate, /!looksLikeEmail\(value\)/u);
  assert.match(certificate, /renderCertificate\([\s\S]*resolvedRecipient/u);
});

test("course player has mobile module navigation and visual lesson scaffolding", () => {
  const player = read("course-player.html");
  assert.match(player, /id="mobileModuleButton"[^>]+aria-controls="courseSidebar"/u);
  assert.match(player, /class="course-menu-backdrop"/u);
  assert.match(player, /function openCourseMenu\(\)/u);
  assert.match(player, /event\.key==="Escape"/u);
  assert.match(player, /l\.coverUrl\|\|course\.coverUrl/u);
  assert.match(player, /id="lessonSnapshot"/u);
  assert.match(player, /id="reflectionCard"/u);
  assert.match(player, /About \$\{readMinutes\} min/u);
  assert.match(player, /prefers-reduced-motion:reduce/u);
});

test("course player keeps lesson text and controls inside narrow phone viewports", () => {
  const player = read("course-player.html");
  assert.match(player, /\.layout\{[^}]*grid-template-columns:360px minmax\(0,1fr\)/u);
  assert.match(player, /@media\(max-width:900px\)\{[\s\S]*?\.layout\{grid-template-columns:minmax\(0,1fr\)/u);
  assert.match(player, /\.sidebar,\.content\{min-width:0/u);
  assert.match(player, /\.lesson-content\{[^}]*overflow-wrap:anywhere/u);
  assert.match(player, /\.slide-image h2\{[^}]*overflow-wrap:anywhere/u);
  assert.match(player, /\.lesson-snapshot\{[^}]*grid-template-columns:auto minmax\(0,1fr\)/u);
  assert.match(player, /\.btn-row\{display:grid!important;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/u);
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
