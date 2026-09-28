import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = path => readFileSync(new URL(path, root), "utf8");

test("programmes expose explicit parent visibility without exposing private student work", () => {
  const page = read("programmes.html");
  const controller = read("js/programmes/programmes.js");
  const worker = read("workers/platform-api/src/index.js");
  const rules = read("firebase/firestore.rules");

  assert.match(page,/id="parentVisibility"/u);
  assert.match(page,/Parent view: progress only/u);
  assert.match(page,/Parent view: progress \+ facilitator feedback/u);
  assert.match(page,/Parent view: hide this programme/u);
  assert.match(controller,/parentVisibility:\$\("parentVisibility"\)\.value \|\| "progress"/u);
  assert.match(controller,/data-parent-visibility-id/u);
  assert.match(rules,/"parentVisibility"/u);

  assert.match(worker,/function parentProgrammeOverview/u);
  assert.match(worker,/normalizedParentVisibility/u);
  assert.match(worker,/progress_feedback/u);
  assert.match(worker,/parentVisibility/u);

  const publicSubmission = worker.slice(
    worker.indexOf("const publicParentSubmission"),
    worker.indexOf("async function parentProgrammeOverview")
  );
  assert.doesNotMatch(publicSubmission,/responseText/u);
  assert.doesNotMatch(publicSubmission,/evidenceUrl/u);
  assert.doesNotMatch(publicSubmission,/evidencePublicId/u);
});

test("approved parents receive read-only programme summaries in child progress", () => {
  const child = read("child-progress.html");
  const parentDashboard = read("js/learner/parent-dashboard.js");

  assert.match(child,/secureOverview\?\.parentProgrammes/u);
  assert.match(child,/School Programmes/u);
  assert.match(child,/Assignments &amp; Feedback/u);
  assert.match(child,/Private student responses, evidence files and sensitive wellbeing disclosures are not shown here/u);
  assert.match(child,/submission\?\.feedback/u);
  assert.doesNotMatch(child,/collection\(/u);
  assert.doesNotMatch(child,/getDocs\(/u);

  assert.match(parentDashboard,/overview\.parentProgrammes/u);
  assert.match(parentDashboard,/school programme/u);
  assert.match(parentDashboard,/programme task/u);
});

test("parent-child linking is mediated by the secure API and can be verified by school or student", () => {
  const worker = read("workers/platform-api/src/index.js");
  const client = read("js/platform-api.js");
  const parentPage = read("parent-child-link.html");
  const studentPage = read("student-link-requests.html");
  const schoolParents = read("school-parents.html");

  assert.match(worker,/\/v1\/roles\/parent-links\/find-student/u);
  assert.match(worker,/\/v1\/roles\/parent-links\/request/u);
  assert.match(worker,/\/v1\/roles\/parent-links\/status/u);
  assert.match(worker,/Both the parent and student accounts must be school-approved/u);
  assert.match(worker,/reviewSource/u);
  assert.match(worker,/same verified school/u);

  assert.match(client,/findStudentForParentLink/u);
  assert.match(client,/requestParentStudentLink/u);
  assert.match(client,/updateParentStudentLink/u);

  assert.match(parentPage,/roleApi\.findStudentForParentLink/u);
  assert.match(parentPage,/roleApi\.requestParentStudentLink/u);
  assert.match(parentPage,/roleApi\.updateParentStudentLink/u);
  assert.doesNotMatch(parentPage,/addDoc\(\s*collection\(\s*db,\s*"parentStudentLinks"/u);
  assert.doesNotMatch(parentPage,/updateDoc\(\s*doc\(\s*db,\s*"parentStudentLinks"/u);

  assert.match(studentPage,/roleApi\.updateParentStudentLink/u);
  assert.doesNotMatch(studentPage,/updateDoc\(doc\(db,"parentStudentLinks"/u);

  assert.match(schoolParents,/data-link-id/u);
  assert.match(schoolParents,/roleApi\.updateParentStudentLink/u);
  assert.match(schoolParents,/where\(\s*"schoolId"/u);
});