import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = path => readFileSync(new URL(path, root), "utf8");

test("super admin support mode is visible, school-scoped and reversible", () => {
  const guard = read("launch-role-guard.js");
  const platform = read("js/platform-api.js");
  const schools = read("admin-schools.html");

  assert.match(guard,/speakoutSupportSchoolId/u);
  assert.match(guard,/Super Admin Support Mode/u);
  assert.match(guard,/Exit Support Mode/u);
  assert.match(guard,/actualRole:"super_admin"/u);
  assert.match(guard,/supportMode:true/u);
  assert.match(guard,/linksByRole\.school_admin/u);
  assert.match(guard,/clearSupportContext/u);

  assert.match(platform,/__supportSchoolId/u);
  assert.match(platform,/__supportSchoolCode/u);
  assert.match(platform,/startSchoolSupport/u);
  assert.match(platform,/endSchoolSupport/u);

  assert.match(schools,/data-support/u);
  assert.match(schools,/Open School Portal/u);
  assert.match(schools,/adminApi\.startSchoolSupport/u);
  assert.match(schools,/localStorage\.setItem\(\s*"speakoutSupportSchoolId"/u);
});

test("super admin is a backend root role while support context preserves school tenancy", () => {
  const worker = read("workers/platform-api/src/index.js");

  assert.match(worker,/function isSuperAdminUser/u);
  assert.match(worker,/if \(isSuperAdminUser\(user\)\) return;/u);
  assert.match(worker,/async function applySuperAdminSchoolContext/u);
  assert.match(worker,/supportRole: "school_admin"/u);
  assert.match(worker,/profile: \{/u);
  assert.match(worker,/schoolId: school\.id/u);
  assert.match(worker,/const role = clean\(user\.supportRole\) \|\| normalized\(user\.profile\.role\)/u);
  assert.match(worker,/\/v1\/admin\/support\/school\/start/u);
  assert.match(worker,/\/v1\/admin\/support\/school\/end/u);
  assert.match(worker,/adminAuditLogs/u);
  assert.match(worker,/school_support_started/u);
  assert.match(worker,/school_support_ended/u);
});

test("super admin can inspect school-admin account metadata but never passwords", () => {
  const schools = read("admin-schools.html");

  assert.match(schools,/Login Email/u);
  assert.match(schools,/School Admin User ID/u);
  assert.match(schools,/Account Access Status/u);
  assert.match(schools,/School Verification/u);
  assert.match(schools,/Last Account Activity/u);
  assert.match(schools,/sendPasswordResetEmail/u);
  assert.match(schools,/passwords are never viewable/u);
  assert.doesNotMatch(schools,/detail\("Password",adminAccount\?\.password/u);
});

test("super admin remains privileged in centralized client role protection", () => {
  const guard = read("launch-role-guard.js");

  assert.match(guard,/role === "super_admin"/u);
  assert.match(guard,/!allowed\.includes\(role\) &&\s*!privileged/u);
});