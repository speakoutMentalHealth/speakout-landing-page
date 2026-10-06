import assert from "node:assert/strict";
import { createHash, createSign, randomBytes } from "node:crypto";
import { mkdir, readFile, stat } from "node:fs/promises";
import { chromium } from "playwright";

const projectId = "speakout-portal-staging";
const apiKey = "AIzaSyAfe0T3E__vQBxZKQHpoiABrSXOfXkh7FA";
const baseUrl = process.env.KPA_PILOT_BASE_URL || "http://127.0.0.1:5000";
const workerBase = "https://speakout-platform-api-staging.speakout-platform-api.workers.dev";
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_FILE;
const cloudinaryPath = process.env.CLOUDINARY_CREDENTIALS_FILE;

if (!serviceAccountPath || !cloudinaryPath) {
  throw new Error("Staging Firebase and Cloudinary credential files are required.");
}

const serviceAccount = JSON.parse(await readFile(serviceAccountPath, "utf8"));
const cloudinary = JSON.parse(await readFile(cloudinaryPath, "utf8"));
assert.equal(serviceAccount.project_id, projectId);

const suffix = `${Date.now()}-${randomBytes(3).toString("hex")}`;
const schoolId = `kpa-browser-pilot-${suffix}`;
const schoolCode = `KPA-UAT-${randomBytes(3).toString("hex").toUpperCase()}`;
const password = `KpaPilot-${randomBytes(18).toString("base64url")}!9a`;
const authUrl = operation => `https://identitytoolkit.googleapis.com/v1/accounts:${operation}?key=${apiKey}`;
const firestoreBase = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
const artifactsDir = "artifacts/kpa-results-browser-pilot";
const cleanupPaths = [];
const authUsers = [];

let adminToken = "";
let resultId = "";
let resultFile = null;

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
    scope: "https://www.googleapis.com/auth/datastore",
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
  assert.equal(response.ok, true, "service account OAuth exchange failed");
  return body.access_token;
}

function encode(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
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

async function firestore(path, { method = "GET", data, token = adminToken } = {}) {
  const response = await fetch(`${firestoreBase}/${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: data ? JSON.stringify({ fields: fields(data) }) : undefined
  });
  const body = await response.json().catch(() => ({}));
  return { response, body, data: decodedFields(body.fields) };
}

async function signup(label) {
  const response = await fetch(authUrl("signUp"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: `kpa-pilot-${label}-${suffix}@example.test`,
      password,
      returnSecureToken: true
    })
  });
  const body = await response.json();
  assert.equal(response.ok, true, `${label} staging signup failed`);
  authUsers.push(body);
  return body;
}

async function seed(path, data) {
  const created = await firestore(path, { method: "PATCH", data });
  assert.equal(created.response.ok, true, `failed to seed ${path}`);
  cleanupPaths.push(path);
}

async function configureStagingBrowser(context) {
  await context.route("**/js/firebase-config.js", async route => {
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

async function login(page, user, expectedPage) {
  await page.goto(`${baseUrl}/auth.html#login`, { waitUntil: "domcontentloaded" });
  await page.locator("#loginEmail").fill(user.email);
  await page.locator("#loginPassword").fill(password);
  await page.locator("#loginForm button[type='submit']").click();

  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      const pathname = new URL(page.url()).pathname;
      if (pathname.endsWith(expectedPage)) {
        await page.waitForLoadState("domcontentloaded").catch(() => null);
        return;
      }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }

  throw new Error(`Login did not reach ${expectedPage}. Current URL: ${page.url()}`);
}

async function deleteAuditLogsForResult() {
  if (!resultId) return;
  const response = await fetch(`${firestoreBase}/academicResultAuditLogs?pageSize=200`, {
    headers: { authorization: `Bearer ${adminToken}` }
  }).catch(() => null);
  if (!response?.ok) return;
  const body = await response.json().catch(() => ({}));
  for (const document of body.documents || []) {
    const data = decodedFields(document.fields);
    if (data.resultId !== resultId) continue;
    const relative = document.name.split("/documents/")[1];
    if (relative) await firestore(relative, { method: "DELETE" }).catch(() => null);
  }
}

async function removeCloudinaryResult() {
  if (!resultFile?.filePublicId) return;
  const timestamp = Math.floor(Date.now() / 1000);
  const resourceType = resultFile.fileResourceType || "image";
  const signature = createHash("sha1")
    .update(
      `public_id=${resultFile.filePublicId}&timestamp=${timestamp}&type=authenticated${cloudinary.apiSecret}`
    )
    .digest("hex");
  const form = new URLSearchParams({
    public_id: resultFile.filePublicId,
    timestamp: String(timestamp),
    type: "authenticated",
    api_key: cloudinary.apiKey,
    signature
  });
  await fetch(
    `https://api.cloudinary.com/v1_1/${cloudinary.cloudName}/${resourceType}/destroy`,
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form
    }
  ).catch(() => null);
}

await mkdir(artifactsDir, { recursive: true });
adminToken = await serviceAccessToken();

let browser = null;

try {
  const [student, schoolAdmin, parent] = await Promise.all([
    signup("student"),
    signup("school-admin"),
    signup("parent")
  ]);

  const parentLinkId = createHash("sha256")
    .update(`${parent.localId}:${student.localId}`)
    .digest("hex");

  await seed(`schools/${schoolId}`, {
    schoolName: "Keffi Premier Academy — Results Pilot",
    schoolCode,
    schoolType: "secondary",
    city: "Keffi",
    state: "Nasarawa",
    country: "Nigeria",
    status: "active"
  });

  await seed(`users/${student.localId}`, {
    uid: student.localId,
    email: student.email,
    fullName: "KPA Test Student",
    firstName: "KPA Test",
    lastName: "Student",
    studentId: `KPA-UAT-STU-${randomBytes(2).toString("hex").toUpperCase()}`,
    classLevel: "SS2",
    role: "student",
    status: "approved",
    approved: true,
    schoolId,
    schoolCode,
    schoolName: "Keffi Premier Academy — Results Pilot"
  });

  await seed(`users/${schoolAdmin.localId}`, {
    uid: schoolAdmin.localId,
    email: schoolAdmin.email,
    fullName: "KPA Test School Admin",
    role: "school_admin",
    status: "approved",
    approved: true,
    schoolId,
    schoolCode,
    schoolName: "Keffi Premier Academy — Results Pilot"
  });

  await seed(`users/${parent.localId}`, {
    uid: parent.localId,
    email: parent.email,
    fullName: "KPA Test Parent",
    role: "parent",
    status: "approved",
    approved: true,
    schoolId,
    schoolCode,
    schoolName: "Keffi Premier Academy — Results Pilot"
  });

  await seed(`parentStudentLinks/${parentLinkId}`, {
    parentId: parent.localId,
    parentName: "KPA Test Parent",
    parentEmail: parent.email,
    studentId: student.localId,
    studentName: "KPA Test Student",
    studentCode: "KPA-UAT",
    studentClass: "SS2",
    relationship: "Guardian",
    schoolId,
    schoolCode,
    status: "approved",
    approvalRequired: true,
    approvedAt: new Date().toISOString(),
    reviewedAt: new Date().toISOString(),
    reviewedBy: schoolAdmin.localId,
    reviewSource: "school",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  browser = await chromium.launch({ headless: true });

  const schoolContext = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    acceptDownloads: true
  });
  await configureStagingBrowser(schoolContext);
  const schoolPage = await schoolContext.newPage();

  await login(schoolPage, schoolAdmin, "school-dashboard.html");
  await schoolPage.goto(`${baseUrl}/school-results.html`, { waitUntil: "domcontentloaded" });

  await schoolPage.waitForFunction(
    studentId =>
      [...document.querySelectorAll("#studentId option")].some(option => option.value === studentId),
    student.localId,
    { timeout: 30000 }
  );

  assert.equal(await schoolPage.locator("#policyAccessMode").inputValue(), "fee_and_pin");
  assert.equal(await schoolPage.locator("#publishNow").isDisabled(), true);
  await schoolPage.locator("#parentReleaseMessage").fill("Contact the school office if a cleared result remains locked.");
  await schoolPage.locator("#policyForm button[type='submit']").click();
  await schoolPage.locator("#statusBox").getByText("Result-release policy saved.").waitFor({ timeout: 20000 });

  await schoolPage.locator("#studentId").selectOption(student.localId);
  await schoolPage.locator("#academicSession").fill("2026/2027");
  await schoolPage.locator("#academicPeriod").fill("First Term");
  await schoolPage.locator("#title").fill("KPA Browser Pilot — First Term Result");

  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64"
  );

  await schoolPage.locator("#resultFile").setInputFiles({
    name: "kpa-first-term-result.png",
    mimeType: "image/png",
    buffer: png
  });

  await schoolPage.locator("#uploadForm button[type='submit']").click();
  await schoolPage.locator("#statusBox").getByText("Result uploaded securely.").waitFor({ timeout: 30000 });

  const resultCard = schoolPage.locator(".result-card").first();
  await resultCard.waitFor({ timeout: 30000 });
  resultId = await resultCard.getAttribute("data-id");
  assert.ok(resultId, "result card did not expose its result identifier");
  cleanupPaths.push(`academicResults/${resultId}`);

  await resultCard.locator("[data-action='fees']").click();
  await schoolPage.locator("#statusBox").getByText("Fee clearance confirmed.").waitFor({ timeout: 20000 });

  await resultCard.locator("[data-action='pin']").click();
  const pinBox = schoolPage.locator("#latestPin");
  await pinBox.waitFor({ timeout: 20000 });
  const pin = (await pinBox.textContent())?.trim() || "";
  assert.match(pin, /^\d{8}$/u, "school UI did not return an 8-digit result PIN");

  await resultCard.locator("[data-action='publish']").click();
  await schoolPage.locator("#statusBox").getByText("Result published.").waitFor({ timeout: 20000 });
  await resultCard.getByText("published", { exact: true }).waitFor({ timeout: 20000 });

  await schoolPage.locator("#pinNotice").evaluate(node => {
    node.style.display = "none";
  });
  await schoolPage.screenshot({
    path: `${artifactsDir}/school-result-release.png`,
    fullPage: true
  });

  const stored = await firestore(`academicResults/${resultId}`);
  assert.equal(stored.response.ok, true, "browser-uploaded result metadata is missing");
  resultFile = stored.data;
  assert.equal(resultFile.status, "published");
  assert.equal(resultFile.feeClearanceStatus, "cleared");
  assert.equal(resultFile.pinActive, true);

  await schoolContext.close();

  const parentContext = await browser.newContext({
    viewport: { width: 1280, height: 1000 },
    acceptDownloads: true
  });
  await configureStagingBrowser(parentContext);
  const parentPage = await parentContext.newPage();

  await login(parentPage, parent, "parent-dashboard.html");
  await parentPage.goto(`${baseUrl}/parent-results.html?studentId=${encodeURIComponent(student.localId)}`, {
    waitUntil: "domcontentloaded"
  });

  const parentCard = parentPage.locator(`.card[data-id="${resultId}"]`);
  await parentCard.waitFor({ timeout: 30000 });
  await parentCard.locator("[data-pin]").fill(pin);
  await parentCard.locator("[data-action='unlock']").click();
  await parentPage.locator("#statusBox").getByText("Result unlocked successfully.").waitFor({ timeout: 20000 });

  const unlockedCard = parentPage.locator(`.card[data-id="${resultId}"]`);
  const downloadButton = unlockedCard.locator("[data-action='download']");
  await downloadButton.waitFor({ timeout: 20000 });

  const downloadPromise = parentPage.waitForEvent("download");
  await downloadButton.click();
  const download = await downloadPromise;
  const downloadPath = `${artifactsDir}/parent-downloaded-result.png`;
  await download.saveAs(downloadPath);
  const downloaded = await stat(downloadPath);
  assert.ok(downloaded.size > 0, "parent browser download was empty");

  await parentPage.screenshot({
    path: `${artifactsDir}/parent-result-unlocked.png`,
    fullPage: true
  });

  const unlockId = createHash("sha256")
    .update(`${resultId}|${parent.localId}`)
    .digest("hex");
  cleanupPaths.push(
    `academicResultUnlocks/${unlockId}`,
    `academicResultPinAttempts/${unlockId}`
  );

  await parentContext.close();

  console.log(JSON.stringify({
    ok: true,
    pilot: "Keffi Premier Academy — Results Pilot",
    browserLogin: true,
    schoolResultUpload: true,
    feeClearance: true,
    pinGeneration: true,
    publication: true,
    parentUnlock: true,
    protectedDownload: true,
    screenshots: [
      `${artifactsDir}/school-result-release.png`,
      `${artifactsDir}/parent-result-unlocked.png`
    ]
  }));
} finally {
  if (browser) await browser.close().catch(() => null);

  await deleteAuditLogsForResult().catch(() => null);
  await removeCloudinaryResult().catch(() => null);

  for (const path of [...cleanupPaths].reverse()) {
    await firestore(path, { method: "DELETE" }).catch(() => null);
  }

  for (const user of authUsers) {
    await fetch(authUrl("delete"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idToken: user.idToken })
    }).catch(() => null);
  }
}
