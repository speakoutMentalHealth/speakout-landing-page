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
