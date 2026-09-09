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

test("privileged Worker writes use Firestore transactions", () => {
  const worker = read("workers/platform-api/src/index.js");
  assert.doesNotMatch(worker, /method:\s*["']PATCH["']/u);
  assert.doesNotMatch(worker, /setDocument/u);
  assert.match(worker, /documents:beginTransaction/u);
  assert.match(worker, /documents:commit/u);
  assert.match(worker, /firestoreStatus !== "ABORTED"/u);
  assert.match(worker, /name: `\$\{databaseName\(env\)\}\/documents\/\$\{path\}`/u);
  assert.ok((worker.match(/return runTransaction\(/gu) || []).length >= 4);
});

test("protected evidence is authenticated and proxied without exposing a signed URL", () => {
  const worker = read("workers/platform-api/src/index.js");
  const client = read("js/platform-api.js");
  assert.match(worker, /type=authenticated/u);
  assert.match(worker, /\$\{resourceType\}\/authenticated\/s--\$\{signature\}--/u);
  assert.match(worker, /cache-control": "private, no-store/u);
  assert.doesNotMatch(worker, /return\s+\{[^}]*signedUrl/u);
  assert.match(client, /\/v1\/admin\/media\/evidence/u);
  assert.match(client, /return response\.blob\(\)/u);
  const reviewPage = read("admin-external-certificates.html");
  assert.doesNotMatch(reviewPage, /src="\$\{item\.proofData\}"/u);
  assert.match(reviewPage, /Legacy evidence is blocked from direct display/u);
});

test("staging Worker declares every required secret", () => {
  const config = JSON.parse(read("workers/platform-api/wrangler.staging.jsonc"));
  assert.deepEqual(config.secrets.required.sort(), [
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
    "CLOUDINARY_CLOUD_NAME",
    "FIREBASE_CLIENT_EMAIL",
    "FIREBASE_PRIVATE_KEY"
  ]);
  assert.equal(config.vars.FIREBASE_PROJECT_ID, "speakout-portal-staging");
});

test("homepage CMS writes use the whitelisted admin Worker API", () => {
  const worker = read("workers/platform-api/src/index.js");
  const client = read("js/platform-api.js");
  const controller = read("js/admin-cms-ui.js");
  const pages = [
    "admin-impact.html",
    "admin-media.html",
    "admin-partners.html",
    "admin-podcast.html",
    "admin-reports.html",
    "admin-videos.html"
  ];
  for (const collectionName of [
    "homepageStats",
    "homepageMedia",
    "homepagePartners",
    "homepagePodcasts",
    "homepageReports",
    "homepageVideos"
  ]) assert.match(worker, new RegExp(`${collectionName}: \\[`, "u"));
  assert.match(worker, /Object\.hasOwn\(CMS_COLLECTION_FIELDS, collectionName\)/u);
  assert.match(worker, /\/v1\/admin\/content\/upsert/u);
  assert.match(worker, /\/v1\/admin\/content\/status/u);
  assert.match(worker, /\/v1\/admin\/content\/delete/u);
  assert.match(worker, /delete: path => writes\.push\(documentDelete\(env, path\)\)/u);
  assert.match(client, /upsertContent:/u);
  assert.match(client, /setContentStatus:/u);
  assert.match(client, /deleteContent:/u);
  assert.match(controller, /adminApi\.upsertContent\(collectionName, editingId, payload\)/u);
  assert.match(controller, /adminApi\.setContentStatus\(collectionName, button\.dataset\.hide, "hidden"\)/u);
  assert.match(controller, /adminApi\.deleteContent\(collectionName, button\.dataset\.del\)/u);
  for (const file of pages) {
    const page = read(file);
    assert.match(page, /import \{ createAdminCmsController \} from "\.\/js\/admin-cms-ui\.js"/u, file);
    assert.match(page, /createAdminCmsController\(\{ collectionName:/u, file);
    assert.doesNotMatch(page, /\b(?:addDoc|updateDoc|deleteDoc|serverTimestamp)\b/u, file);
  }
});

test("homepage CMS provides accessible responsive editing feedback", () => {
  const controller = read("js/admin-cms-ui.js");
  const styles = read("css/admin-cms.css");
  assert.match(controller, /setAttribute\("aria-live", "polite"\)/u);
  assert.match(controller, /recordCount/u);
  assert.match(controller, /Cancel edit/u);
  assert.match(controller, /aria-label="Edit/u);
  assert.match(controller, /This cannot be undone/u);
  assert.match(controller, /setAttribute\("aria-busy"/u);
  assert.match(styles, /@media\(max-width:900px\)/u);
  assert.match(styles, /\.table thead\{display:none\}/u);
  for (const file of ["admin-impact.html", "admin-media.html", "admin-partners.html", "admin-podcast.html", "admin-reports.html", "admin-videos.html"]) {
    assert.match(read(file), /css\/admin-cms\.css/u, file);
  }
});
