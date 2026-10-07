import assert from "node:assert/strict";
import { createHash, createSign, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const projectId = "speakout-portal-staging";
const apiKey = "AIzaSyAfe0T3E__vQBxZKQHpoiABrSXOfXkh7FA";
const baseUrl = process.env.SCHOOL_MANAGEMENT_BASE_URL || "http://127.0.0.1:5000";
const workerBase = "https://speakout-platform-api-staging.speakout-platform-api.workers.dev";
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_FILE;
const artifactsDir = "artifacts/school-management-browser";

if (!serviceAccountPath) throw new Error("FIREBASE_SERVICE_ACCOUNT_FILE is required.");

const serviceAccount = JSON.parse(await readFile(serviceAccountPath, "utf8"));
assert.equal(serviceAccount.project_id, projectId);

const suffix = `${Date.now()}-${randomBytes(3).toString("hex")}`;
const password = `Stage-${randomBytes(18).toString("base64url")}!9a`;
const schoolAId = `school-a-${suffix}`;
const schoolBId = `school-b-${suffix}`;
const schoolACode = `A-${randomBytes(3).toString("hex").toUpperCase()}`;
const schoolBCode = `B-${randomBytes(3).toString("hex").toUpperCase()}`;
const programmeName = `School A Future Skills Club ${suffix}`;
const assignmentTitle = `Offline Reflection Project ${suffix}`;
const studentAIdCode = `A-STU-${randomBytes(3).toString("hex").toUpperCase()}`;
const studentBIdCode = `B-STU-${randomBytes(3).toString("hex").toUpperCase()}`;
const authUrl = operation => `https://identitytoolkit.googleapis.com/v1/accounts:${operation}?key=${apiKey}`;
const firestoreBase = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
const cleanupPaths = new Set();
const authUsers = [];
let adminToken = "";
let programmeId = "";
let parentLinkId = "";

function base64Url(value) {
  return Buffer.from(value).toString("base64url");
}

async function serviceAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: "https://oauth2.googleapis.com/token",
    scope: "https://www.googleapis.com/auth/datastore",
    iat: now,
    exp: now + 3500
  }));
  const unsigned = `${header}.${payload}`;
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
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === "string") return { stringValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key,item]) => [key,encode(item)])) } };
}

function decode(value) {
  if (!value) return null;
  for (const [type,item] of Object.entries(value)) {
    if (type === "nullValue") return null;
    if (type === "integerValue" || type === "doubleValue") return Number(item);
    if (type === "stringValue" || type === "timestampValue" || type === "booleanValue") return item;
    if (type === "arrayValue") return (item.values || []).map(decode);
    if (type === "mapValue") return Object.fromEntries(Object.entries(item.fields || {}).map(([key,field]) => [key,decode(field)]));
  }
  return null;
}

const fields = object => Object.fromEntries(Object.entries(object).map(([key,value]) => [key,encode(value)]));
const decodedFields = object => Object.fromEntries(Object.entries(object || {}).map(([key,value]) => [key,decode(value)]));

async function firestore(path, { method = "GET", data, token = adminToken } = {}) {
  const response = await fetch(`${firestoreBase}/${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: data ? JSON.stringify({ fields: fields(data) }) : undefined
  });
  const body = await response.json().catch(() => ({}));
  return { response, body, data: decodedFields(body.fields) };
}

async function listCollection(name) {
  const response = await fetch(`${firestoreBase}/${name}?pageSize=300`, {
    headers: { authorization: `Bearer ${adminToken}` }
  });
  if (!response.ok) return [];
  const body = await response.json().catch(() => ({}));
  return (body.documents || []).map(document => ({
    path: document.name.split("/documents/")[1],
    id: document.name.split("/").pop(),
    ...decodedFields(document.fields)
  }));
}

async function seed(path, data) {
  const result = await firestore(path, { method: "PATCH", data });
  assert.equal(result.response.ok, true, `failed to seed ${path}`);
  cleanupPaths.add(path);
}

async function signup(label) {
  const response = await fetch(authUrl("signUp"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: `school-uat-${label}-${suffix}@example.test`,
      password,
      returnSecureToken: true
    })
  });
  const body = await response.json();
  assert.equal(response.ok, true, `${label} staging signup failed`);
  authUsers.push(body);
  return body;
}

async function worker(path, user, data = {}) {
  const response = await fetch(`${workerBase}${path}`, {
    method: "POST",
    headers: { authorization: `Bearer ${user.idToken}`, "content-type": "application/json" },
    body: JSON.stringify(data)
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
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

async function waitForPath(page, expectedPage, timeout = 30000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      if (new URL(page.url()).pathname.endsWith(expectedPage)) {
        await page.waitForLoadState("domcontentloaded").catch(() => null);
        return;
      }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`Login did not reach ${expectedPage}. Current URL: ${page.url()}`);
}

async function login(browser, user, expectedPage) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await configureStagingBrowser(context);
  const page = await context.newPage();
  await page.goto(`${baseUrl}/auth.html#login`, { waitUntil: "domcontentloaded" });
  await page.locator("#loginEmail").fill(user.email);
  await page.locator("#loginPassword").fill(password);
  await page.locator("#loginForm button[type='submit']").click();
  await waitForPath(page, expectedPage);
  return { context, page };
}

async function teacherCreatesProgramme(browser, teacher) {
  const { context, page } = await login(browser, teacher, "teacher-dashboard.html");
  try {
    await page.goto(`${baseUrl}/programmes.html`, { waitUntil: "domcontentloaded" });
    await page.locator("#programmeForm").waitFor({ timeout: 30000 });
    await page.locator("#programmeName").fill(programmeName);
    await page.locator("#programmeType").selectOption("club");
    await page.locator("#category").fill("ICT and Future Skills");
    await page.locator("#programmeSource").selectOption("new_school");
    await page.locator("#description").fill("A staging programme used to verify real school programme operations.");
    await page.locator("#objectives").fill("Build digital confidence and teamwork.");
    await page.locator("#expectedOutcomes").fill("Students complete a facilitator-led activity and project.");
    await page.locator("#scheduleDay").fill("Friday");
    await page.locator("#scheduleTime").fill("13:00");
    await page.locator("#frequency").fill("Weekly");
    await page.locator("#venue").fill("ICT Room");
    await page.locator("#membershipMode").selectOption("teacher_add");
    await page.locator("#parentVisibility").selectOption("progress_feedback");
    await page.locator("#programmeForm button[type='submit']").click();
    await page.locator("#statusBox").getByText("Programme submitted for school approval.", { exact: true }).waitFor({ timeout: 30000 });

    const card = page.locator(".program-item").filter({ has: page.getByRole("heading", { name: programmeName, exact: true }) });
    await card.waitFor({ timeout: 30000 });
    const href = await card.locator("a[href^='programme-workspace.html']").getAttribute("href");
    assert.ok(href, "teacher-created programme did not expose a workspace link");
    programmeId = new URL(href, baseUrl + "/").searchParams.get("id") || "";
    assert.ok(programmeId, "programme id could not be resolved from workspace link");
    cleanupPaths.add(`programmes/${programmeId}`);
  } finally {
    await context.close();
  }
}

async function schoolAdminApprovesAndAssigns(browser, schoolAdmin, facilitator, student) {
  const { context, page } = await login(browser, schoolAdmin, "school-dashboard.html");
  try {
    await page.goto(`${baseUrl}/programmes.html`, { waitUntil: "domcontentloaded" });
    const card = page.locator(".program-item").filter({ has: page.getByRole("heading", { name: programmeName, exact: true }) });
    await card.waitFor({ timeout: 30000 });
    await card.locator('[data-next-status="active"]').click();
    await page.locator("#statusBox").getByText("Programme status updated.", { exact: true }).waitFor({ timeout: 30000 });

    await page.goto(`${baseUrl}/programme-workspace.html?id=${encodeURIComponent(programmeId)}`, { waitUntil: "domcontentloaded" });
    await page.locator("#programmeTitle").getByText(programmeName, { exact: true }).waitFor({ timeout: 30000 });

    await page.waitForFunction(
      uid => [...document.querySelectorAll("#facilitatorSelect option")].some(option => option.value === uid),
      facilitator.localId,
      { timeout: 30000 }
    );
    await page.locator("#facilitatorSelect").selectOption(facilitator.localId);
    await page.locator("#facilitatorForm button[type='submit']").click();
    await page.locator("#statusBox").getByText("Facilitator added.", { exact: true }).waitFor({ timeout: 30000 });

    await page.waitForFunction(
      uid => [...document.querySelectorAll("#studentSelect option")].some(option => option.value === uid),
      student.localId,
      { timeout: 30000 }
    );
    await page.locator("#studentSelect").selectOption(student.localId);
    await page.locator("#memberForm button[type='submit']").click();
    await page.locator("#statusBox").getByText("Student added to programme.", { exact: true }).waitFor({ timeout: 30000 });
  } finally {
    await context.close();
  }
}

async function facilitatorRunsProgramme(browser, facilitator, student) {
  const { context, page } = await login(browser, facilitator, "teacher-dashboard.html");
  try {
    await page.goto(`${baseUrl}/programme-workspace.html?id=${encodeURIComponent(programmeId)}`, { waitUntil: "domcontentloaded" });
    await page.locator("#programmeTitle").getByText(programmeName, { exact: true }).waitFor({ timeout: 30000 });
    await page.locator("#sessionForm").waitFor({ timeout: 30000 });

    await page.locator("#sessionDate").fill("2026-10-07");
    await page.locator("#sessionTopic").fill("Digital confidence and opportunity");
    await page.locator("#learningObjective").fill("Identify practical ways technology can expand learning.");
    await page.locator("#activitySummary").fill("Projected lesson, discussion and practical reflection completed.");
    await page.locator("#sessionChallenges").fill("Intermittent connectivity simulated.");
    await page.locator("#sessionNextSteps").fill("Continue with offline project work.");

    const attendance = page.locator(`input[name="attendanceStudent"][value="${student.localId}"]`);
    await attendance.waitFor({ timeout: 30000 });
    await attendance.check();
    await page.locator("#sessionForm button[type='submit']").click();
    await page.locator("#statusBox").getByText("Session report and attendance saved.", { exact: true }).waitFor({ timeout: 30000 });

    await page.locator("#assignmentTitle").fill(assignmentTitle);
    await page.locator("#assignmentDueDate").fill("2026-10-14");
    await page.locator("#assignmentInstructions").fill("Write or present three ways technology can support learning in your community.");
    await page.locator("#assignmentForm button[type='submit']").click();
    await page.locator("#statusBox").getByText("Assignment published.", { exact: true }).waitFor({ timeout: 30000 });

    await page.waitForFunction(
      () => [...document.querySelectorAll("#onBehalfAssignment option")].some(option => option.value),
      null,
      { timeout: 30000 }
    );
    const assignmentId = await page.locator("#onBehalfAssignment option").evaluateAll(options => options.map(o => o.value).find(Boolean) || "");
    assert.ok(assignmentId, "facilitator workspace did not expose the created assignment");
    await page.locator("#onBehalfAssignment").selectOption(assignmentId);
    await page.locator("#onBehalfStudent").selectOption(student.localId);
    await page.locator("#onBehalfMethod").selectOption("paper");
    await page.locator("#onBehalfResponse").fill("Student completed the reflection on paper during the offline classroom session.");
    await page.locator("#onBehalfForm button[type='submit']").click();
    await page.locator("#statusBox").getByText("Student work recorded by facilitator.", { exact: true }).waitFor({ timeout: 30000 });
  } finally {
    await context.close();
  }
}

async function parentRequestsLink(browser, parent, student) {
  const secureLookup = await worker("/v1/roles/parent-links/find-student", parent, { search: studentAIdCode });
  assert.equal(secureLookup.response.ok, true, "Parent could not securely find the approved child in the same school");
  assert.equal(secureLookup.body.student?.id, student.localId);

  parentLinkId = createHash("sha256").update(`${parent.localId}:${student.localId}`).digest("hex");
  cleanupPaths.add(`parentStudentLinks/${parentLinkId}`);

  const { context, page } = await login(browser, parent, "parent-dashboard.html");
  try {
    await page.goto(`${baseUrl}/parent-child-link.html`, { waitUntil: "domcontentloaded" });
    await page.locator("#statusBox").getByText("Parent account loaded.", { exact: true }).waitFor({ timeout: 30000 });
    await page.locator("#studentSearch").fill(studentAIdCode);
    await page.locator("#findForm button[type='submit']").click();
    const send = page.locator("#sendRequestBtn");
    await send.waitFor({ timeout: 30000 });
    await send.click();

    await page.waitForFunction(
      () => document.querySelector("#pendingLinks")?.textContent?.trim() === "1",
      null,
      { timeout: 30000 }
    );
    await page.locator("#requestRows").getByText(studentAIdCode, { exact: true }).waitFor({ timeout: 30000 });
  } finally {
    await context.close();
  }

  const link = await firestore(`parentStudentLinks/${parentLinkId}`);
  assert.equal(link.response.ok, true, "Parent link record was not created");
  assert.equal(link.data.status, "pending");
  assert.equal(link.data.parentId, parent.localId);
  assert.equal(link.data.studentId, student.localId);
}

async function parentVerifiesProgress(browser, parent, student) {
  const { context, page } = await login(browser, parent, "parent-dashboard.html");
  try {
    await page.goto(`${baseUrl}/child-progress.html?studentId=${encodeURIComponent(student.localId)}`, { waitUntil: "domcontentloaded" });
    await page.locator("#programmeBox").getByText(programmeName, { exact: true }).waitFor({ timeout: 30000 });
    await page.locator("#programmeAssignmentBox").getByText(assignmentTitle, { exact: true }).waitFor({ timeout: 30000 });
    assert.equal(await page.locator("#programmeCount").textContent(), "1");
    await page.screenshot({ path: `${artifactsDir}/parent-child-programme-progress.png`, fullPage: true });
  } finally {
    await context.close();
  }
}

async function cleanupProgrammeData() {
  const collections = [
    "programmeSubmissions",
    "programmeAttendance",
    "programmeAssignments",
    "programmeSessions",
    "programmeMemberships",
    "programmes",
    "parentStudentLinks",
    "adminAuditLogs"
  ];
  for (const name of collections) {
    const docs = await listCollection(name);
    for (const item of docs) {
      const belongs =
        item.schoolId === schoolAId ||
        item.schoolId === schoolBId ||
        item.programmeId === programmeId ||
        item.id === parentLinkId ||
        (name === "adminAuditLogs" && item.schoolId === schoolAId);
      if (belongs) cleanupPaths.add(item.path);
    }
  }
}

await mkdir(artifactsDir, { recursive: true });
adminToken = await serviceAccessToken();

let browser = null;

try {
  const [
    schoolAdminA,
    teacherCreator,
    teacherFacilitator,
    studentA,
    parentA,
    schoolAdminB,
    studentB,
    superAdmin
  ] = await Promise.all([
    signup("school-admin-a"),
    signup("teacher-creator-a"),
    signup("teacher-facilitator-a"),
    signup("student-a"),
    signup("parent-a"),
    signup("school-admin-b"),
    signup("student-b"),
    signup("super-admin")
  ]);

  await seed(`schools/${schoolAId}`, {
    schoolName: "Staging School A",
    schoolCode: schoolACode,
    schoolType: "secondary",
    city: "Keffi",
    state: "Nasarawa",
    country: "Nigeria",
    status: "active"
  });
  await seed(`schools/${schoolBId}`, {
    schoolName: "Staging School B",
    schoolCode: schoolBCode,
    schoolType: "secondary",
    city: "Lafia",
    state: "Nasarawa",
    country: "Nigeria",
    status: "active"
  });

  const profile = (user, fullName, role, schoolId, schoolCode, status = "approved", approved = true, extra = {}) => ({
    uid: user.localId,
    email: user.email,
    fullName,
    firstName: fullName.split(" ")[0],
    lastName: fullName.split(" ").slice(1).join(" "),
    role,
    status,
    approved,
    schoolId,
    schoolCode,
    schoolName: schoolId === schoolAId ? "Staging School A" : schoolId === schoolBId ? "Staging School B" : "",
    ...extra
  });

  await seed(`users/${schoolAdminA.localId}`, profile(schoolAdminA, "School Admin A", "school_admin", schoolAId, schoolACode));
  await seed(`users/${teacherCreator.localId}`, profile(teacherCreator, "Teacher Creator A", "teacher", schoolAId, schoolACode));
  await seed(`users/${teacherFacilitator.localId}`, profile(
    teacherFacilitator, "Teacher Facilitator A", "teacher", schoolAId, schoolACode,
    "pending_school_approval", false
  ));
  await seed(`users/${studentA.localId}`, profile(
    studentA, "Student A", "student", schoolAId, schoolACode,
    "pending_school_approval", false,
    { studentId: studentAIdCode, registrationNumber: `REG-A-${suffix}`, classLevel: "SS2" }
  ));
  await seed(`users/${parentA.localId}`, profile(parentA, "Parent A", "parent", schoolAId, schoolACode));
  await seed(`users/${schoolAdminB.localId}`, profile(schoolAdminB, "School Admin B", "school_admin", schoolBId, schoolBCode));
  await seed(`users/${studentB.localId}`, profile(
    studentB, "Student B", "student", schoolBId, schoolBCode,
    "approved", true,
    { studentId: studentBIdCode, registrationNumber: `REG-B-${suffix}`, classLevel: "SS2" }
  ));
  await seed(`users/${superAdmin.localId}`, profile(superAdmin, "SpeakOut Super Admin", "super_admin", "", ""));

  const crossSchoolApproval = await worker("/v1/roles/school/users/status", schoolAdminB, {
    userId: studentA.localId,
    status: "approved"
  });
  assert.equal(crossSchoolApproval.response.status, 403, "School B admin could approve a School A learner");

  for (const userId of [teacherFacilitator.localId, studentA.localId]) {
    const approval = await worker("/v1/roles/school/users/status", schoolAdminA, {
      userId,
      status: "approved"
    });
    assert.equal(approval.response.ok, true, "School A admin could not approve its own school member");
  }

  browser = await chromium.launch({ headless: true });

  await teacherCreatesProgramme(browser, teacherCreator);
  await schoolAdminApprovesAndAssigns(browser, schoolAdminA, teacherFacilitator, studentA);
  await facilitatorRunsProgramme(browser, teacherFacilitator, studentA);

  await parentRequestsLink(browser, parentA, studentA);
  const approveLink = await worker("/v1/roles/parent-links/status", schoolAdminA, {
    linkId: parentLinkId,
    status: "approved"
  });
  assert.equal(approveLink.response.ok, true, "School A admin could not approve the parent-child link");

  const foreignLinkChange = await worker("/v1/roles/parent-links/status", schoolAdminB, {
    linkId: parentLinkId,
    status: "rejected"
  });
  assert.equal(foreignLinkChange.response.status, 403, "School B admin could manage School A parent-child link");

  const parentOverview = await worker("/v1/roles/overview", parentA, { subjectId: studentA.localId });
  assert.equal(parentOverview.response.ok, true, "Approved parent could not load linked child overview");
  assert.equal(parentOverview.body.subjects?.some(item => item.id === studentA.localId), true);
  assert.equal(parentOverview.body.subjects?.some(item => item.id === studentB.localId), false);
  assert.equal(parentOverview.body.parentProgrammes?.programmes?.some(item => item.id === programmeId), true);

  const foreignStudentSearch = await worker("/v1/roles/parent-links/find-student", parentA, { search: studentBIdCode });
  assert.equal(foreignStudentSearch.response.status, 404, "Parent A could discover a student in School B");

  await parentVerifiesProgress(browser, parentA, studentA);

  const schoolBOverview = await worker("/v1/roles/overview", schoolAdminB, {});
  assert.equal(schoolBOverview.response.ok, true);
  assert.equal(schoolBOverview.body.subjects?.some(item => item.id === studentA.localId), false);
  assert.equal(schoolBOverview.body.subjects?.some(item => item.id === studentB.localId), true);

  const directProgrammeRead = await firestore(`programmes/${programmeId}`, {
    token: schoolAdminB.idToken
  });
  assert.equal(directProgrammeRead.response.status, 403, "School B could directly read School A programme data");

  const supportStart = await worker("/v1/admin/support/school/start", superAdmin, { schoolId: schoolAId });
  assert.equal(supportStart.response.ok, true, "Super Admin could not start explicit School A support mode");
  if (supportStart.body.auditId) cleanupPaths.add(`adminAuditLogs/${supportStart.body.auditId}`);

  const supportedOverview = await worker("/v1/roles/overview", superAdmin, { __supportSchoolId: schoolAId });
  assert.equal(supportedOverview.response.ok, true, "Super Admin support context could not load school overview");
  assert.equal(supportedOverview.body.role, "school_admin");
  assert.equal(supportedOverview.body.subjects?.some(item => item.id === studentA.localId), true);
  assert.equal(supportedOverview.body.subjects?.some(item => item.id === studentB.localId), false);

  const supportEnd = await worker("/v1/admin/support/school/end", superAdmin, { schoolId: schoolAId });
  assert.equal(supportEnd.response.ok, true, "Super Admin could not end support mode");
  if (supportEnd.body.auditId) cleanupPaths.add(`adminAuditLogs/${supportEnd.body.auditId}`);

  const summary = {
    ok: true,
    schoolAdminOwnUserApproval: true,
    crossSchoolUserApprovalDenied: true,
    teacherProgrammeProposal: true,
    schoolProgrammeApproval: true,
    facilitatorAssignment: true,
    studentMembership: true,
    facilitatorSessionAndAttendance: true,
    facilitatorAssignmentCreation: true,
    offlineWorkRecordedOnBehalf: true,
    parentLinkRequestAndSchoolApproval: true,
    parentProgrammeVisibility: true,
    crossSchoolParentLinkDenied: true,
    crossSchoolProgrammeReadDenied: true,
    schoolBOverviewIsolated: true,
    superAdminExplicitSupportMode: true,
    superAdminSupportScopedToSchoolA: true,
    programmeId,
    screenshots: [`${artifactsDir}/parent-child-programme-progress.png`]
  };

  await writeFile(`${artifactsDir}/summary.json`, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
} finally {
  if (browser) await browser.close().catch(() => null);

  await cleanupProgrammeData().catch(() => null);

  for (const path of [...cleanupPaths].reverse()) {
    await firestore(path, { method: "DELETE" }).catch(() => null);
  }

  for (const user of authUsers) {
    if (!user.idToken) continue;
    await fetch(authUrl("delete"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idToken: user.idToken })
    }).catch(() => null);
  }
}
