import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = path => readFileSync(new URL(path, root), "utf8");

test("unified access gateway exposes login, member join and school registration", () => {
  const page = read("auth.html");
  assert.match(page, />Sign In</u);
  assert.match(page, />Join SpeakOut</u);
  assert.match(page, />Register a School</u);
  assert.match(page, /id="loginForm"/u);
  assert.match(page, /id="registerForm"/u);
  assert.match(page, /id="schoolRegisterForm"/u);
  assert.match(page, /id="registrationNumber"/u);
  assert.match(page, /Student Registration \/ Matric Number/u);
  assert.match(page, /Staff ID \/ Employee Number/u);
  assert.match(page, /Relationship to Student\(s\)/u);
  assert.doesNotMatch(page, /<option value="school_admin">/u);
});

test("school-linked signup validates the institution and uses secure onboarding APIs", () => {
  const auth = read("js/auth.js");
  const client = read("js/platform-api.js");
  assert.match(auth, /onboardingApi\.resolveSchool/u);
  assert.match(auth, /onboardingApi\.joinSchool/u);
  assert.match(auth, /onboardingApi\.registerSchool/u);
  assert.match(auth, /onboardingApi\.activateSchoolAdmin/u);
  assert.match(client, /\/v1\/public\/schools\/resolve-code/u);
  assert.match(client, /\/v1\/public\/schools\/register/u);
  assert.match(client, /\/v1\/onboarding\/school-user/u);
  assert.match(client, /\/v1\/onboarding\/school-admin/u);
});

test("platform API enforces school verification and one-time school admin activation", () => {
  const worker = read("workers/platform-api/src/index.js");
  assert.match(worker, /schoolStudentRegistrations/u);
  assert.match(worker, /schoolStaffRegistrations/u);
  assert.match(worker, /registration-number-and-school-admin/u);
  assert.match(worker, /staff-id-and-school-admin/u);
  assert.match(worker, /school-admin-and-parent-child-link/u);
  assert.match(worker, /schoolVerificationStatus:\s*"pending"/u);
  assert.match(worker, /schoolVerificationStatus:\s*verificationStatus/u);
  assert.match(worker, /schoolAdminInvites/u);
  assert.match(worker, /status:\s*"used"/u);
  assert.match(worker, /\/v1\/admin\/schools\/status/u);
});

test("school administrators can review member verification details before approval", () => {
  const students = read("school-students.html");
  const teachers = read("school-teachers.html");
  const parents = read("school-parents.html");
  const schools = read("admin-schools.html");
  assert.match(students, /Registration \/ Student ID/u);
  assert.match(students, /Reg \/ Matric:/u);
  assert.match(students, /user\.department/u);
  assert.match(teachers, /Staff ID/u);
  assert.match(teachers, /user\.staffId/u);
  assert.match(parents, /Relationship/u);
  assert.match(parents, /user\.relationship/u);
  assert.match(schools, /adminApi\.updateSchoolStatus/u);
  assert.match(schools, /Primary Administrator/u);
});

test("school-linked teachers and parents remain pending until school approval", () => {
  const auth = read("js/auth.js");
  const worker = read("workers/platform-api/src/index.js");
  assert.match(auth, /role==="teacher"&&!staffId/u);
  assert.match(auth, /role==="parent"&&!parentRelationship/u);
  assert.match(worker, /status:\s*"pending_school_approval"/u);
  assert.match(worker, /approved:\s*false/u);
  assert.match(worker, /role === "teacher" \? "staff-id-and-school-admin"/u);
  assert.match(worker, /"school-admin-and-parent-child-link"/u);
});

test("legacy school registration route points to the unified gateway", () => {
  const page = read("school-register.html");
  assert.match(page, /auth\.html#school/u);
});

test("school registration and administrator activation remain on the gated school panel", () => {
  const page = read("auth.html");
  const auth = read("js/auth.js");
  const tabs = read("js/auth-access.js");
  const legacy = read("school-register.html");
  assert.match(page, /id="schoolRegisterForm"/u);
  assert.match(page, /id="schoolAdminActivateForm"/u);
  assert.match(page, /id="schoolAdminActivation"/u);
  assert.match(tabs, /location\.hash === "#school"/u);
  assert.match(auth, /onboardingApi\.registerSchool/u);
  assert.match(auth, /onboardingApi\.activateSchoolAdmin/u);
  assert.match(auth, /new URLSearchParams\(location\.search\)/u);
  assert.match(auth, /schoolInvite/u);
  assert.match(legacy, /target\.hash = "school"/u);
});

test("student teacher and parent dashboards retain shared role gates and separate loaders", () => {
  for (const [role, filename, loader] of [
    ["student", "student-dashboard", "loadStats"],
    ["teacher", "teacher-dashboard", "loadDashboardData"],
    ["parent", "parent-dashboard", "loadChildren"]
  ]) {
    const page = read(`${filename}.html`);
    const module = read(`js/learner/${filename}.js`);
    assert.match(page, new RegExp(`js/learner/${filename}\\.js`, "u"));
    assert.match(module, /requireRoles\(/u);
    assert.match(module, new RegExp(`\\["${role}"\\]`, "u"));
    assert.match(module, new RegExp(`await ${loader}\\(`, "u"));
    assert.match(module, /Dashboard data could not be loaded/u);
  }
});

test("school admin invitations enforce expiry, email binding, approval and one-time use", () => {
  const worker = read("workers/platform-api/src/index.js");
  const start = worker.indexOf("async function activateSchoolAdmin(");
  const end = worker.indexOf("\\nasync function route(", start);
  assert.ok(start >= 0 && end > start, "activation handler must exist");
  const activation = worker.slice(start, end);
  assert.match(activation, /verifiedIdentity\(request, env\)/u);
  assert.match(activation, /normalized\(invite\.status\) !== "active"/u);
  assert.match(activation, /new Date\(invite\.expiresAt\)\.getTime\(\) < Date\.now\(\)/u);
  assert.match(activation, /normalized\(invite\.email\) !== identity\.email/u);
  assert.match(activation, /\["approved", "active"\]\.includes\(normalized\(school\.status\)\)/u);
  assert.match(activation, /const existing = await getDocument\(env, `users\/\$\{identity\.uid\}`\)/u);
  assert.match(activation, /await runTransaction\(env, async tx =>/u);
  assert.match(activation, /normalized\(currentInvite\.status\) !== "active"/u);
  assert.match(activation, /status: "used"/u);
  assert.match(activation, /schoolId: school\.id/u);
});
