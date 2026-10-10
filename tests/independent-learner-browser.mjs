import { runCleanup } from "./staging-cleanup.mjs";
import { observeCatalogue, profileDiagnostic } from "./staging-diagnostics.mjs";
import assert from "node:assert/strict";
import { createSign, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const projectId = "speakout-portal-staging";
const apiKey = "AIzaSyAfe0T3E__vQBxZKQHpoiABrSXOfXkh7FA";
const baseUrl = process.env.INDEPENDENT_LEARNER_BASE_URL || "http://127.0.0.1:5000";
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_FILE;
const artifactsDir = "artifacts/independent-learner-browser";

if (!serviceAccountPath) {
  throw new Error("FIREBASE_SERVICE_ACCOUNT_FILE is required.");
}

const serviceAccount = JSON.parse(await readFile(serviceAccountPath, "utf8"));
assert.equal(serviceAccount.project_id, projectId);

const suffix = `${Date.now()}-${randomBytes(3).toString("hex")}`;
const email = `independent-learner-${suffix}@example.test`;
const password = `Stage-${randomBytes(18).toString("base64url")}!9a`;
const recoveredPassword = `Reset-${randomBytes(18).toString("base64url")}!9a`;
const firstName = "Independent";
const lastName = "Learner";
const fullName = `${firstName} ${lastName}`;
const courseId = `independent-browser-${suffix}`;
const courseTitle = `Independent Learner Browser Course ${suffix}`;
const authUrl = operation => `https://identitytoolkit.googleapis.com/v1/accounts:${operation}?key=${apiKey}`;
const adminAuthUrl = operation => `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:${operation}`;
const firestoreBase = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
const cleanupPaths = [];
let userSession = null;
let adminToken = "";
let verificationCode = "";

async function deleteAuthFixture(localId) {
  const headers = { authorization: `Bearer ${adminToken}`, "content-type": "application/json" };
  const lookup = await fetch(adminAuthUrl("lookup"), {
    method: "POST", headers, body: JSON.stringify({ localId: [localId] })
  });
  const found = await lookup.json();
  if (lookup.status === 404 || found.error?.message === "USER_NOT_FOUND") return { ok: true };
  if (!lookup.ok) {
    const value = found.error?.status || found.error?.message || "";
    const category = /^[A-Z_]+$/.test(value) ? value : "UNKNOWN";
    throw new Error(`Staging Auth fixture lookup HTTP ${lookup.status}: ${category}`);
  }
  if (!found.users?.length) return { ok: true };
  assert.equal(found.users.length, 1);
  assert.match(found.users[0].email || "", /^independent-learner-[0-9]+-[a-f0-9]+@example\.test$/);
  const response = await fetch(adminAuthUrl("delete"), {
    method: "POST", headers, body: JSON.stringify({ localId })
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const code = /^[A-Z_]+$/.test(body.error?.message || "") ? body.error.message : "UNKNOWN";
    throw new Error(`Staging Auth cleanup HTTP ${response.status}: ${code}`);
  }
  return response;
}

function base64Url(value) {
  return Buffer.from(value).toString("base64url");
}

async function serviceAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const encodedHeader = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const encodedPayload = base64Url(JSON.stringify({
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: "https://oauth2.googleapis.com/token",
    scope: "https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/identitytoolkit",
    iat: now,
    exp: now + 3500
  }));
  const unsigned = `${encodedHeader}.${encodedPayload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  const assertion = `${unsigned}.${signer.sign(serviceAccount.private_key).toString("base64url")}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion
    })
  });
  const body = await response.json();
  assert.equal(response.ok, true, "service-account OAuth exchange failed");
  return body.access_token;
}

function encode(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }
  if (typeof value === "string") return { stringValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } };
  return {
    mapValue: {
      fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encode(item)]))
    }
  };
}

function decode(value) {
  if (!value) return null;
  for (const [type, item] of Object.entries(value)) {
    if (type === "nullValue") return null;
    if (type === "integerValue" || type === "doubleValue") return Number(item);
    if (type === "stringValue" || type === "timestampValue" || type === "booleanValue") return item;
    if (type === "arrayValue") return (item.values || []).map(decode);
    if (type === "mapValue") {
      return Object.fromEntries(Object.entries(item.fields || {}).map(([key, field]) => [key, decode(field)]));
    }
  }
  return null;
}

const fields = object =>
  Object.fromEntries(Object.entries(object).map(([key, value]) => [key, encode(value)]));

const decodedFields = object =>
  Object.fromEntries(Object.entries(object || {}).map(([key, value]) => [key, decode(value)]));

async function firestore(path, { method = "GET", data, signal } = {}) {
  const response = await fetch(`${firestoreBase}/${path}`, {
    method,
    signal,
    headers: {
      authorization: `Bearer ${adminToken}`,
      "content-type": "application/json"
    },
    body: data ? JSON.stringify({ fields: fields(data) }) : undefined
  });
  const body = await response.json().catch(() => ({}));
  return { response, body, data: decodedFields(body.fields) };
}

async function patchFields(path, data) {
  const params = new URLSearchParams();
  for (const field of Object.keys(data)) params.append("updateMask.fieldPaths", field);
  const response = await fetch(`${firestoreBase}/${path}?${params.toString()}`, {
    method: "PATCH",
    headers: {
      authorization: `Bearer ${adminToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ fields: fields(data) })
  });
  const body = await response.json().catch(() => ({}));
  return { response, body, data: decodedFields(body.fields) };
}

async function signInRest(accountPassword = password) {
  const response = await fetch(authUrl("signInWithPassword"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: accountPassword, returnSecureToken: true })
  });
  const body = await response.json();
  assert.equal(response.ok, true, "registered independent learner could not sign in through Firebase Auth");
  return body;
}

async function configureStagingBrowser(context) {
  await context.route("**/firebase-config.js", async route => {
    const response = await route.fetch();
    let body = await response.text();
    body = body.replace(
      ".includes(location.hostname);",
      '.includes(location.hostname) || ["127.0.0.1","localhost"].includes(location.hostname);'
    );
    await route.fulfill({ response, body });
  });

  await context.route("**/js/platform-config.js", async route => {
    const response = await route.fetch();
    let body = await response.text();
    body = body.replace(
      '"speakout-portal-staging.firebaseapp.com"\n]);',
      '"speakout-portal-staging.firebaseapp.com",\n  "127.0.0.1",\n  "localhost"\n]);'
    );
    await route.fulfill({ response, body });
  });
}

async function waitForPath(page, path, timeout = 30000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      if (new URL(page.url()).pathname.endsWith(path)) {
        await page.waitForLoadState("domcontentloaded").catch(() => null);
        return;
      }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`Expected browser path ${path}; current URL: ${page.url()}`);
}

function longLessonContent() {
  const sentence = "Learning builds confidence through practice reflection curiosity problem solving communication digital responsibility resilience and consistent effort.";
  return `<p>${Array.from({ length: 650 }, () => sentence).join(" ")}</p>`;
}

async function seedCourse() {
  const course = {
    title: courseTitle,
    status: "active",
    category: "digital-skills",
    courseType: "internal",
    accessType: "free",
    audience: ["student"],
    level: "beginner",
    duration: "Self-paced",
    provider: "SpeakHub Academy",
    featured: false,
    certificateEligible: true,
    shortDescription: "A temporary staging course used to verify the complete independent learner browser journey.",
    description: "This staging-only course validates registration, discovery, guided learning, progress persistence, assessment, certification and verification.",
    outcomes: [
      "Complete a guided lesson",
      "Pass a module assessment",
      "Pass a final assessment",
      "Receive a verifiable completion certificate"
    ],
    prerequisites: ["An approved SpeakOut learner account"],
    certificate: { available: true, issuer: "SpeakHub Academy", type: "completion" },
    modules: [
      {
        title: "Independent Learning Foundations",
        description: "A staging module for the independent learner acceptance journey.",
        lessons: [
          {
            id: "lesson-1",
            title: "Independent Learning Lesson",
            duration: "10 min",
            content: longLessonContent()
          }
        ],
        quiz: {
          id: `${courseId}__module__0`,
          title: "Module Check",
          passMark: 70,
          questionCount: 1
        }
      }
    ],
    finalAssessment: {
      id: `${courseId}__final`,
      title: "Final Check",
      passMark: 70,
      questionCount: 1
    }
  };

  for (const [path, data] of [
    [`courses/${courseId}`, course],
    [`courseAssessments/${courseId}__module__0`, {
      id: `${courseId}__module__0`,
      courseId,
      type: "module",
      moduleIndex: 0,
      title: "Module Check",
      passMark: 70,
      questions: [{ question: "Which option confirms the staging lesson was completed?", options: ["Completed", "Not completed"], answer: 0 }]
    }],
    [`courseAssessments/${courseId}__final`, {
      id: `${courseId}__final`,
      courseId,
      type: "final",
      title: "Final Check",
      passMark: 70,
      questions: [{ question: "Which option completes the independent learner acceptance course?", options: ["Finish", "Stop"], answer: 0 }]
    }]
  ]) {
    const created = await firestore(path, { method: "PATCH", data });
    assert.equal(created.response.ok, true, `failed to seed ${path}`);
    cleanupPaths.push(path);
  }
}

async function browserRegister(page) {
  await page.goto(`${baseUrl}/auth.html#join`, { waitUntil: "domcontentloaded" });
  await page.locator('[data-tab-target="joinPanel"]').click();
  await page.locator("#firstName").fill(firstName);
  await page.locator("#lastName").fill(lastName);
  await page.locator("#email").fill(email);
  await page.locator("#role").selectOption("student");
  await page.locator("#location").fill("Independent learner");
  await page.locator("#password").fill(password);
  await page.locator("#confirmPassword").fill(password);
  await page.locator("#terms").check();
  await page.locator("#registerForm button[type='submit']").click();
  await page.locator("#regMsg").getByText(
    "Account created successfully. Your application is now pending approval.",
    { exact: true }
  ).waitFor({ timeout: 30000 });
}

async function browserLogin(page, accountPassword = password) {
  await page.goto(`${baseUrl}/auth.html#login`, { waitUntil: "domcontentloaded" });
  await page.locator('[data-tab-target="loginPanel"]').click();
  await page.locator("#loginEmail").fill(email);
  await page.locator("#loginPassword").fill(accountPassword);
  await page.locator("#loginForm button[type='submit']").click();
  await waitForPath(page, "student-dashboard.html");
}

async function searchCatalogue(page) {
  const evidence = observeCatalogue(page, new URL(baseUrl).origin);
  try {
    await page.goto(`${baseUrl}/speakhub.html`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelector("#searchInput")?.disabled === false, undefined, { timeout: 30000 });
    await page.locator("#searchInput").fill(courseTitle);
  } catch (error) {
    const diagnostic = { operation: "catalogue-unlock", ...await evidence.capture() };
    try {
      diagnostic.serverProfile = profileDiagnostic(await firestore(`users/${userSession.localId}`, { signal: AbortSignal.timeout(10000) }));
    } catch {
      diagnostic.serverProfile = { lookupFailed: true };
    }
    await writeFile(`${artifactsDir}/catalogue-unlock-failure.json`, JSON.stringify(diagnostic, null, 2));
    throw error;
  } finally {
    evidence.dispose();
  }
}

async function completeCourse(page) {
  await searchCatalogue(page);

  const card = page.locator("#courseGrid .card").filter({ has: page.getByRole("heading", { name: courseTitle, exact: true }) });
  await card.waitFor({ timeout: 30000 });
  const startHref = await card.locator("a.btn.primary").getAttribute("href");
  assert.ok(startHref, "SpeakHub course card did not expose a start-course link");
  const expectedStartHref = "course-player.html?id=" + encodeURIComponent(courseId);
  assert.equal(startHref, expectedStartHref, "SpeakHub generated the wrong internal-course route");
  await page.goto(new URL(startHref, baseUrl + "/").toString(), { waitUntil: "domcontentloaded" });

  await waitForPath(page, "course-player.html");
  await page.locator("#continueLearningButton").waitFor({ timeout: 30000 });
  await page.locator("#overviewProgressBadge").getByText("0%", { exact: true }).waitFor({ timeout: 30000 });
  await page.locator("#continueLearningButton").click();

  await page.locator("#lessonTitle").getByText("Independent Learning Lesson", { exact: true }).waitFor({ timeout: 30000 });
  await page.locator("#completeButton").click();
  await page.locator("#submitAssessmentBtn").waitFor({ timeout: 30000 });

  // Leave the course after lesson completion and reopen it to prove persisted progress.
  await searchCatalogue(page);
  const reopenedCard = page.locator("#courseGrid .card").filter({ has: page.getByRole("heading", { name: courseTitle, exact: true }) });
  await reopenedCard.waitFor({ timeout: 30000 });
  await reopenedCard.locator(".progress-text").getByText("50% complete", { exact: true }).waitFor({ timeout: 30000 });
  const reopenHref = await reopenedCard.locator("a.btn.primary").getAttribute("href");
  assert.ok(reopenHref, "reopened SpeakHub card lost its course link");
  await page.goto(new URL(reopenHref, baseUrl + "/").toString(), { waitUntil: "domcontentloaded" });

  await page.locator("#continueLearningButton").waitFor({ timeout: 30000 });
  await page.locator("#overviewProgressBadge").getByText("50%", { exact: true }).waitFor({ timeout: 30000 });
  await page.locator("#continueLearningButton").click();
  const moduleQuizButton = page.locator("#moduleMenu .assessment-item").filter({ hasText: "Module Check" });
  await moduleQuizButton.waitFor({ timeout: 30000 });
  assert.equal(await moduleQuizButton.isDisabled(), false, "persisted lesson completion did not unlock the module quiz");
  await moduleQuizButton.click();

  await page.locator('input[name="q-0"][value="0"]').check();
  await page.locator("#submitAssessmentBtn").click();
  await page.locator("#quizResult").getByText("Passed successfully.", { exact: false }).waitFor({ timeout: 30000 });
  await page.locator("#openFinalBtn").click();

  await page.locator("#lessonTitle").getByText("Final Check", { exact: true }).waitFor({ timeout: 30000 });
  await page.locator('input[name="q-0"][value="0"]').check();
  await page.locator("#submitAssessmentBtn").click();
  await page.locator("#lessonTitle").getByText("Course Completed", { exact: true }).waitFor({ timeout: 30000 });
  await page.locator("#assessmentArea .completion-card").getByText(
    `Congratulations, ${fullName}`,
    { exact: true }
  ).waitFor({ timeout: 30000 });


}

async function verifyCertificatePublicly(browser) {
  const certificateId = `${userSession.localId}_${courseId}`;
  const certificate = await firestore(`certificates/${certificateId}`);
  assert.equal(certificate.response.ok, true, "issued certificate record was not found");
  verificationCode = certificate.data.verificationCode || "";
  assert.ok(verificationCode, "issued certificate did not contain a verification code");

  cleanupPaths.push(
    `userProgress/${certificateId}`,
    `certificates/${certificateId}`,
    `publicCertificateVerifications/${verificationCode}`
  );

  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await configureStagingBrowser(context);
  const page = await context.newPage();
  try {
    await page.goto(`${baseUrl}/verify-certificate.html?code=${encodeURIComponent(verificationCode)}`, {
      waitUntil: "domcontentloaded"
    });
    const verificationCard = page.locator("#result .card");
    await verificationCard.getByText("Valid Certificate", { exact: true }).waitFor({ timeout: 30000 });
    await verificationCard.getByText("Name: " + fullName, { exact: true }).waitFor({ timeout: 30000 });
    await verificationCard.getByText("Award: " + courseTitle, { exact: true }).waitFor({ timeout: 30000 });
    await page.screenshot({ path: `${artifactsDir}/public-certificate-verification.png`, fullPage: true });
  } finally {
    await context.close();
  }
}

async function logoutAndRecover(page) {
  await page.goto(`${baseUrl}/student-dashboard.html`, { waitUntil: "domcontentloaded" });
  await page.locator("#logoutBtn").waitFor({ timeout: 30000 });
  await page.locator("#logoutBtn").click();
  await waitForPath(page, "auth.html");
  await page.locator("#loginMsg").getByText("You have been logged out successfully.", { exact: true }).waitFor({ timeout: 30000 });

  await page.locator("#loginEmail").fill(email);
  await page.locator("#forgotPasswordLink").click();
  await page.locator("#loginMsg").getByText(
    "If an account exists for that email, password reset instructions have been sent.",
    { exact: true }
  ).waitFor({ timeout: 30000 });

  // Obtain a real, single-use staging link without sending another email.
  // Neither the link, reset code nor generated passwords may enter artifacts/logs.
  const linkResponse = await fetch(adminAuthUrl("sendOobCode"), {
    method: "POST",
    headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
    body: JSON.stringify({ requestType: "PASSWORD_RESET", email, returnOobLink: true })
  });
  const linkBody = await linkResponse.json();
  if (!linkResponse.ok) {
    const value = linkBody.error?.status || linkBody.error?.message || "";
    const category = /^[A-Z_]+$/.test(value) ? value : "UNKNOWN";
    throw new Error(`Staging recovery link generation HTTP ${linkResponse.status}: ${category}`);
  }
  assert.equal(typeof linkBody.oobLink, "string", "Staging recovery link missing");
  const resetLink = new URL(linkBody.oobLink);
  assert.equal(resetLink.origin, `https://${projectId}.firebaseapp.com`, "Unexpected recovery-link origin");
  assert.equal(resetLink.searchParams.get("mode"), "resetPassword");
  const code = resetLink.searchParams.get("oobCode");
  assert.ok(code, "Recovery code missing");
  // Errors from navigation can contain the secret-bearing URL: sanitize them.
  let phase = "open form";
  try {
    await page.goto(resetLink.href, { waitUntil: "domcontentloaded" });
    phase = "enter new password";
    await page.locator('input[type="password"]').fill(recoveredPassword);
    phase = "save new password";
    await page.getByRole("button", { name: /^save$/i }).click();
    phase = "confirm completion";
    await page.getByText(/Your password has been reset|Password changed|You can now sign in with your new password/i).first().waitFor({ timeout: 30000 });
  } catch {
    throw new Error(`Hosted staging password-reset form did not complete at phase: ${phase}. Reset credentials are withheld from logs.`);
  }
  userSession = await signInRest(recoveredPassword);
  const oldLogin = await fetch(authUrl("signInWithPassword"), {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  });
  assert.equal(oldLogin.status, 400, "Old password still worked after recovery");
  const replay = await fetch(authUrl("resetPassword"), {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ oobCode: code, newPassword: password })
  });
  assert.equal(replay.status, 400, "Consumed reset code was accepted again");
  await browserLogin(page, recoveredPassword);
  await page.locator("#logoutBtn").waitFor({ timeout: 30000 });
  await page.screenshot({ path: `${artifactsDir}/recovered-learner-dashboard.png`, fullPage: true });
}

await mkdir(artifactsDir, { recursive: true });
adminToken = await serviceAccessToken();
// Remove the single disposable Auth fixture left by the initial failed recovery run.
await deleteAuthFixture("DZMBfUKjn1PDpcvkjGR5y7smxvE2");
await seedCourse();

let browser = null;
let learnerContext = null;
let journeyFailure = null;

try {
  browser = await chromium.launch({ headless: true });
  learnerContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await configureStagingBrowser(learnerContext);
  const page = await learnerContext.newPage();

  await browserRegister(page);

  userSession = await signInRest();
  const profile = await firestore(`users/${userSession.localId}`);
  assert.equal(profile.response.ok, true, "independent learner profile was not created");
  assert.equal(profile.data.status, "pending");
  assert.equal(profile.data.approved, false);
  assert.equal(profile.data.schoolId || "", "");
  assert.equal(profile.data.schoolCode || "", "");
  assert.equal(profile.data.role, "student");

  const approval = await patchFields(`users/${userSession.localId}`, {
    status: "approved",
    approved: true
  });
  assert.equal(approval.response.ok, true, "trusted staging approval failed");
  cleanupPaths.push(`users/${userSession.localId}`);

  await browserLogin(page);
  await page.screenshot({ path: `${artifactsDir}/independent-learner-dashboard.png`, fullPage: true });

  await completeCourse(page);
  await page.screenshot({ path: `${artifactsDir}/course-completed.png`, fullPage: true });

  await verifyCertificatePublicly(browser);
  await logoutAndRecover(page);

  const summary = {
    ok: true,
    registration: true,
    independentProfileWithoutSchool: true,
    trustedApproval: true,
    login: true,
    courseDiscovery: true,
    courseOpen: true,
    lessonCompletion: true,
    progressPersistence: true,
    moduleAssessment: true,
    finalAssessment: true,
    certificateIssued: true,
    publicCertificateVerification: true,
    logout: true,
    passwordRecoveryRequest: true,
    hostedPasswordReset: true,
    oldPasswordDenied: true,
    consumedResetCodeDenied: true,
    recoveredBrowserLogin: true,
    recoveryEmailDeliveryVerified: false,
    courseId,
    verificationCode,
    screenshots: [
      `${artifactsDir}/independent-learner-dashboard.png`,
      `${artifactsDir}/course-completed.png`,
      `${artifactsDir}/public-certificate-verification.png`,
      `${artifactsDir}/recovered-learner-dashboard.png`
    ]
  };

  await writeFile(`${artifactsDir}/summary.json`, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
} catch (error) {
  journeyFailure = error;
} finally {
  if (learnerContext) await learnerContext.close().catch(() => null);
  if (browser) await browser.close().catch(() => null);
  const tasks = [];
  for (const path of [...cleanupPaths].reverse()) tasks.push({ label: path, run: () => firestore(path, { method: "DELETE" }) });
  for (const user of [userSession]) {
    if (!user?.localId) continue;
    tasks.push({ label: `Auth user ${user.localId}`, run: () => deleteAuthFixture(user.localId) });
  }
  try { await runCleanup(tasks, artifactsDir); } catch (cleanupFailure) {
    if (journeyFailure) throw new AggregateError([journeyFailure, cleanupFailure], "Learner journey and cleanup failed");
    throw cleanupFailure;
  }
}
if (journeyFailure) throw journeyFailure;
