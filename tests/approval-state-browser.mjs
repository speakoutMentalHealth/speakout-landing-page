import { runCleanup } from "./staging-cleanup.mjs";
import assert from "node:assert/strict";
import { createSign, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const projectId = "speakout-portal-staging";
const apiKey = "AIzaSyAfe0T3E__vQBxZKQHpoiABrSXOfXkh7FA";
const baseUrl = process.env.APPROVAL_BROWSER_BASE_URL || "http://127.0.0.1:5000";
const workerBase = "https://speakout-platform-api-staging.speakout-platform-api.workers.dev";
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_FILE;
const artifactsDir = "artifacts/approval-state-browser";

if (!serviceAccountPath) {
  throw new Error("FIREBASE_SERVICE_ACCOUNT_FILE is required.");
}

const serviceAccount = JSON.parse(await readFile(serviceAccountPath, "utf8"));
assert.equal(serviceAccount.project_id, projectId);

const suffix = `${Date.now()}-${randomBytes(3).toString("hex")}`;
const password = `Stage-${randomBytes(18).toString("base64url")}!9a`;
const authUrl = operation => `https://identitytoolkit.googleapis.com/v1/accounts:${operation}?key=${apiKey}`;
const firestoreBase = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
const cleanupPaths = [];
const authUsers = [];
const results = [];

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
  assert.equal(response.ok, true, "service-account OAuth exchange failed");
  return body.access_token;
}

function encode(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value)
    ? { integerValue: String(value) }
    : { doubleValue: value };
  if (typeof value === "string") return { stringValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } };
  return {
    mapValue: {
      fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encode(item)]))
    }
  };
}

const fields = object =>
  Object.fromEntries(Object.entries(object).map(([key, value]) => [key, encode(value)]));

let adminToken = "";

async function firestore(path, { method = "GET", data } = {}) {
  const response = await fetch(`${firestoreBase}/${path}`, {
    method,
    headers: {
      authorization: `Bearer ${adminToken}`,
      "content-type": "application/json"
    },
    body: data ? JSON.stringify({ fields: fields(data) }) : undefined
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

async function signup(label) {
  const response = await fetch(authUrl("signUp"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: `approval-${label}-${suffix}@example.test`,
      password,
      returnSecureToken: true
    })
  });
  const body = await response.json();
  assert.equal(response.ok, true, `${label} staging signup failed`);
  authUsers.push(body);
  return body;
}

async function seedProfile(user, { label, role, status, approved }) {
  const path = `users/${user.localId}`;
  const created = await firestore(path, {
    method: "PATCH",
    data: {
      uid: user.localId,
      email: user.email,
      fullName: `Approval Browser ${label}`,
      role,
      status,
      approved,
      source: "approval-state-browser-acceptance"
    }
  });
  assert.equal(created.response.ok, true, `failed to seed ${label}`);
  cleanupPaths.push(path);
}

async function workerApprovalProbe(user, role) {
  const path = role === "student" ? "/v1/learning/dashboard" : "/v1/roles/overview";
  const response = await fetch(`${workerBase}${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${user.idToken}`,
      "content-type": "application/json"
    },
    body: "{}"
  });
  return response;
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

async function browserLogin(browser, testCase) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await configureStagingBrowser(context);
  const page = await context.newPage();

  try {
    await page.goto(`${baseUrl}/auth.html#login`, { waitUntil: "domcontentloaded" });
    await page.locator("#loginEmail").fill(testCase.user.email);
    await page.locator("#loginPassword").fill(password);
    await page.locator("#loginForm button[type='submit']").click();

    if (testCase.allowed) {
      const deadline = Date.now() + 30000;
      let reached = false;
      while (Date.now() < deadline) {
        try {
          const pathname = new URL(page.url()).pathname;
          if (pathname.endsWith(testCase.expectedPage)) {
            reached = true;
            await page.waitForLoadState("domcontentloaded").catch(() => null);
            break;
          }
        } catch {}
        await new Promise(resolve => setTimeout(resolve, 250));
      }
      assert.equal(
        reached,
        true,
        `${testCase.label} did not reach ${testCase.expectedPage}. Current URL: ${page.url()}`
      );
      await new Promise(resolve => setTimeout(resolve, 700));
      assert.equal(
        new URL(page.url()).pathname.endsWith(testCase.expectedPage),
        true,
        `${testCase.label} was redirected away from its approved dashboard`
      );
    } else {
      const expectedMessage = testCase.status === "suspended"
        ? "Your account is suspended. Please contact SpeakOut for assistance."
        : testCase.status === "rejected"
          ? "Your account is not approved. Please contact SpeakOut if you believe this is an error."
          : "Your account is pending approval.";
      await page.locator("#loginMsg").getByText(expectedMessage, { exact: true }).waitFor({ timeout: 30000 });
      assert.equal(
        new URL(page.url()).pathname.endsWith("auth.html"),
        true,
        `${testCase.label} unexpectedly left the auth screen`
      );

      const signedOut = await page.evaluate(async () => {
        const { auth } = await import("./firebase-config.js");
        await new Promise(resolve => setTimeout(resolve, 300));
        return auth.currentUser === null;
      });
      assert.equal(signedOut, true, `${testCase.label} remained authenticated after denial`);
    }

    results.push({
      label: testCase.label,
      role: testCase.role,
      status: testCase.status,
      legacyApproved: testCase.legacyApproved,
      browserAllowed: testCase.allowed
    });
  } finally {
    await context.close();
  }
}

await mkdir(artifactsDir, { recursive: true });
adminToken = await serviceAccessToken();
let browser = null;

try {
  const definitions = [
    { label: "student-approved", role: "student", status: "approved", legacyApproved: false, allowed: true, expectedPage: "student-dashboard.html" },
    { label: "student-pending", role: "student", status: "pending", legacyApproved: true, allowed: false },
    { label: "student-rejected", role: "student", status: "rejected", legacyApproved: true, allowed: false },
    { label: "student-suspended", role: "student", status: "suspended", legacyApproved: true, allowed: false },
    { label: "super-admin-approved", role: "super_admin", status: "approved", legacyApproved: false, allowed: true, expectedPage: "admin-dashboard.html" },
    { label: "super-admin-pending", role: "super_admin", status: "pending", legacyApproved: true, allowed: false },
    { label: "super-admin-rejected", role: "super_admin", status: "rejected", legacyApproved: true, allowed: false },
    { label: "super-admin-suspended", role: "super_admin", status: "suspended", legacyApproved: true, allowed: false }
  ];

  const cases = [];
  for (const definition of definitions) {
    const user = await signup(definition.label);
    await seedProfile(user, {
      label: definition.label,
      role: definition.role,
      status: definition.status,
      approved: definition.legacyApproved
    });
    cases.push({ ...definition, user });
  }

  for (const testCase of cases) {
    const apiResponse = await workerApprovalProbe(testCase.user, testCase.role);
    if (testCase.allowed) {
      assert.equal(apiResponse.ok, true, `${testCase.label} was denied by the staging Platform API`);
    } else {
      assert.equal(apiResponse.status, 403, `${testCase.label} bypassed Platform API approval enforcement`);
    }
  }

  browser = await chromium.launch({ headless: true });
  for (const testCase of cases) {
    await browserLogin(browser, testCase);
  }

  const summary = {
    ok: true,
    projectId,
    checked: results.length,
    canonicalApprovedWithLegacyFalseAllowed: true,
    staleLegacyTrueDeniedForNonApprovedStatuses: true,
    privilegedRoleBypassDenied: true,
    results
  };
  await writeFile(`${artifactsDir}/summary.json`, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
} finally {
  if (browser) await browser.close().catch(() => null);
  const tasks = [];
  for (const path of [...cleanupPaths].reverse()) tasks.push({ label: path, run: () => firestore(path, { method: "DELETE" }) });
  for (const user of authUsers) {
    if (!user?.idToken) continue;
    tasks.push({ label: `Auth user ${user.localId}`, run: () => fetch(authUrl("delete"), {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idToken: user.idToken })
    }) });
  }
  await runCleanup(tasks, artifactsDir);
}
