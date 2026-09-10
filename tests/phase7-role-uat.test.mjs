import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("trusted API exposes bounded role-scoped learning summaries", () => {
  const worker = read("workers/platform-api/src/index.js");
  const client = read("js/platform-api.js");

  assert.match(worker, /if \(path === "\/v1\/roles\/overview"\)/u);
  assert.match(worker, /async function roleOverview/u);
  assert.match(worker, /function sameSchool/u);
  assert.match(worker, /queryDocumentsByValues/u);
  assert.match(worker, /start \+= 30/u);
  assert.match(worker, /const publicRoleProgress/u);
  assert.match(worker, /const publicRoleCertificate/u);
  assert.doesNotMatch(worker, /publicRoleProgress[\s\S]{0,500}(?:answers|correctAnswer)/u);
  assert.match(client, /overview: subjectId => platformRequest\("\/v1\/roles\/overview"/u);
});

test("approved boolean and approved status are accepted consistently by the API", () => {
  const worker = read("workers/platform-api/src/index.js");
  assert.match(worker, /profile\.approved !== true && normalized\(profile\.status\) !== "approved"/u);
});

test("teacher roster is functional and uses the secure role API", () => {
  const page = read("teacher-students.html");
  const controller = read("js/teacher-students.js");

  assert.match(page, /src="js\/teacher-students\.js"/u);
  assert.doesNotMatch(page, /placeholder loaded|Coming next|will appear here after/u);
  assert.match(controller, /roleApi\.overview\(\)/u);
  assert.match(controller, /Authorized student roster loaded/u);
  assert.match(controller, /escapeHtml/u);
});

test("parent and school dashboards do not query protected learner records directly", () => {
  const child = read("child-progress.html");
  const parent = read("parent-dashboard.html");
  const school = read("school-dashboard.html");

  assert.match(child, /roleApi\.overview\(targetStudentId\)/u);
  assert.doesNotMatch(child, /collection\(\s*db,\s*"(?:userProgress|certificates)"/u);
  assert.match(parent, /const overview = await roleApi\.overview\(\)/u);
  assert.equal((parent.match(/collection\(db,"userProgress"\)/gu) || []).length, 1);
  assert.match(parent, /const dashboard = await learningApi\.dashboard\(\)/u);
  assert.doesNotMatch(parent, /collection\(db,"certificates"\)/u);
  assert.ok((school.match(/const overview = await roleApi\.overview\(\)/gu) || []).length >= 2);
  assert.doesNotMatch(school, /collection\(db,"(?:userProgress|certificates)"\)/u);
});

test("school user approval is authorized and transacted by the Worker", () => {
  const worker = read("workers/platform-api/src/index.js");
  const client = read("js/platform-api.js");

  assert.match(worker, /if \(path === "\/v1\/roles\/school\/users\/status"\)/u);
  assert.match(worker, /You can update only users in your school/u);
  assert.match(worker, /\["student", "teacher", "parent"\]\.includes/u);
  assert.match(worker, /reviewedBy: user\.uid/u);
  assert.match(client, /updateSchoolUserStatus/u);
  for (const file of ["school-users.html", "school-students.html", "school-teachers.html", "school-parents.html"]) {
    const page = read(file);
    assert.match(page, /roleApi\.updateSchoolUserStatus\(button\.dataset\.id,button\.dataset\.status\)/u, file);
    assert.doesNotMatch(page, /await updateDoc\(\s*doc\(\s*db,\s*"users",\s*button\.dataset\.id/u, file);
  }
});
