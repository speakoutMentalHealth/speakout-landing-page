import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("production frontend targets the deployed production learning API", () => {
  const config = read("js/platform-config.js");
  const workerConfig = JSON.parse(read("workers/platform-api/wrangler.production.jsonc"));
  assert.match(config, /speakout-platform-api\.speakout-platform-api\.workers\.dev/u);
  assert.equal(workerConfig.vars.FIREBASE_PROJECT_ID, "speaakout-portal");
  assert.deepEqual(workerConfig.secrets.required.sort(), ["FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY", "RESEND_API_KEY"].sort());
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
  assert.match(player, /heroVisual\?\.src\|\|l\.coverUrl\|\|""/u);
  assert.match(player, /id="lessonSnapshot"/u);
  assert.match(player, /id="reflectionCard"/u);
  assert.match(player, /About \$\{readMinutes\} min/u);
  assert.match(player, /prefers-reduced-motion:reduce/u);
});

test("course player supports accessible lazy-loaded lesson illustrations", () => {
  const player = read("course-player.html");
  const builder = read("firestore-seed/build-priority-courses.mjs");
  assert.match(player, /Array\.isArray\(l\.visuals\)/u);
  assert.match(player, /class="lesson-visual-card"/u);
  assert.match(player, /loading="lazy" decoding="async"/u);
  assert.match(player, /alt="\$\{esc\(v\.alt/u);
  assert.match(builder, /const visualManifest = \{/u);
  assert.match(builder, /mental-health-awareness\/module-1-understanding\.svg/u);
  assert.match(builder, /const visuals = \[\];/u);
});

test("mental health student course maps a unique visual to every lesson", () => {
  const builder = read("firestore-seed/build-priority-courses.mjs");
  const lessonFiles = [...builder.matchAll(/file: "lesson-[^"]+\.svg"/gu)].map(match => match[0]);
  assert.equal(lessonFiles.length, 18);
  assert.equal(new Set(lessonFiles).size, 18);
  assert.match(builder, /visualManifest\[targetId\]\?\.lessons\?\.\[index\]\?\.\[lessonIndex\]/u);
  assert.match(builder, /lessonVisual\.alt/u);
  assert.match(builder, /lessonVisual\.caption/u);
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

test("rich internal course publishing keeps answer keys behind the secure Worker", () => {
  const admin = read("admin-courses.html");
  const client = read("js/platform-api.js");
  const worker = read("workers/platform-api/src/index.js");
  const start = admin.indexOf("async function installRichInternalCourses");
  const end = admin.indexOf("function startRealtime", start);
  const installer = admin.slice(start, end);

  assert.match(admin, /import \{ adminApi \} from "\.\/js\/platform-api\.js"/u);
  assert.match(installer, /adminApi\.publishRichCourse\(course\)/u);
  assert.doesNotMatch(installer, /writeBatch\(|setDoc\(/u);
  assert.match(client, /publishRichCourse: course => platformRequest\("\/v1\/admin\/courses\/publish-rich"/u);
  assert.match(worker, /if \(path === "\/v1\/admin\/courses\/publish-rich"\)/u);
  assert.match(worker, /assertNoEmbeddedAssessmentKeys\(course\)/u);
  assert.match(worker, /Secure assessment missing for module/u);
  assert.match(worker, /Secure final assessment is missing/u);
  assert.match(worker, /assessmentSecurityVersion: 2/u);
  assert.match(worker, /crypto\.getRandomValues/u);
});

test("secure assessment migration is never deployed as a browser utility", () => {
  const firebase = JSON.parse(read("firebase.json"));
  const githubPages = read("_config.yml");
  assert.ok(firebase.hosting.ignore.includes("firestore-seed/*.mjs"));
  assert.match(githubPages, /firestore-seed\/migrate-course-assessments\.mjs/u);
});


test("premium course player adds course landing, visual module cards and readable lesson workspace", () => {
  const player = read("course-player.html");
  const premium = read("css/course-player-premium.css");

  assert.match(player, /id="courseOverview"/u);
  assert.match(player, /id="continueLearningButton"/u);
  assert.match(player, /id="saveCourseButton"/u);
  assert.match(player, /id="moduleCardGrid"/u);
  assert.match(player, /id="backToCourseButton"/u);
  assert.match(player, /id="lessonEyebrow"/u);
  assert.match(player, /id="lessonMeta"/u);
  assert.match(player, /function renderCourseModuleCards\(\)/u);
  assert.match(player, /mental-health-awareness\/module-1-understanding\.svg/u);
  assert.match(player, /mental-health-awareness\/module-6-plan\.svg/u);
  assert.match(player, /Reflection & activity/u);
  assert.match(player, /heroVisual=lessonVisuals\.at\(-1\)/u);

  assert.match(premium, /\.course-module-grid\{display:grid;grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/u);
  assert.match(premium, /\.lesson-content\{[\s\S]*?font-size:1\.125rem!important;line-height:1\.78!important/u);
  assert.match(premium, /@media\(max-width:680px\)[\s\S]*?\.course-module-grid\{grid-template-columns:1fr\}/u);
  assert.match(premium, /\.mobile-course-tools\{[\s\S]*?display:flex!important/u);

  assert.match(player, /learningApi\.submitAssessment/u);
  assert.doesNotMatch(player, /q\.answer|correctAnswer/u);
});


test("course player QA keeps module artwork meaningful and assessment transitions clean", () => {
  const player = read("course-player.html");

  assert.match(player, /mentalHealthModuleVisuals=\[[\s\S]*Student learning how thoughts, feelings, behaviours and relationships connect\./u);
  assert.match(player, /function moduleVisualAlt\(module,index\)/u);
  assert.match(player, /alt="\$\{esc\(visualAlt\)\}"/u);
  assert.match(player, /action\.setAttribute\("aria-label"/u);
  assert.match(player, /item\.setAttribute\("aria-current","step"\)/u);
  assert.match(player, /continueLearningButton\.textContent=finalAssessmentPassed\?"View Completion/u);
  assert.match(player, /assessmentArea\.className="";/u);
  assert.match(player, /metadata\?\.title\|\|"Assessment preview"/u);
});


test("premium course player provides themed visual treatment for every internal course", () => {
  const player = read("course-player.html");
  const premium = read("css/course-player-premium.css");
  const pack = JSON.parse(read("firestore-seed/priority-courses.json"));
  const internal = pack.filter(course => course.courseType === "internal");

  assert.equal(internal.length, 6);
  assert.equal(internal.every(course => course.modules.length === 6 && course.lessonCount === 18), true);
  assert.match(player, /function courseTheme\(\)/u);
  assert.match(player, /module-card-art-fallback theme-\$\{courseTheme\(\)\}/u);
  assert.match(player, /cover-art theme-\$\{courseTheme\(\)\}/u);
  assert.match(player, /document\.body\.dataset\.courseCategory=courseTheme\(\)/u);
  assert.doesNotMatch(player, /l\.coverUrl\|\|course\.coverUrl\|\|course\.image\|\|course\.thumbnail/u);
  for (const theme of ["mental","leadership","digital","teacher","family","school"]) {
    assert.match(premium, new RegExp(`\\.theme-${theme}\\{`, "u"), theme);
  }
});
