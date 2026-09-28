import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = path => readFileSync(new URL(path, root), "utf8");

test("school programme engine is role-linked and not hard-coded to one club", () => {
  const nav = read("launch-role-guard.js");
  const programmes = read("programmes.html");
  const workspace = read("programme-workspace.html");
  const listingJs = read("js/programmes/programmes.js");
  const workspaceJs = read("js/programmes/programme-workspace.js");

  assert.match(nav,/"Programs",\s*"programmes\.html"/u);
  assert.match(programmes,/Programme type/u);
  assert.match(programmes,/Existing school programme/u);
  assert.match(programmes,/New school programme/u);
  assert.match(programmes,/SpeakOut-supported programme/u);
  assert.match(listingJs,/pending_approval/u);
  assert.match(listingJs,/membershipMode/u);
  assert.match(workspace,/Record a session/u);
  assert.match(workspace,/Create assignment \/ project/u);
  assert.match(workspace,/Record work on behalf of a student/u);
  assert.match(workspaceJs,/submittedOnBehalf:true/u);
  assert.match(workspaceJs,/programmeAttendance/u);
  assert.match(workspaceJs,/programmeAssignments/u);
  assert.match(workspaceJs,/programmeSubmissions/u);
  assert.doesNotMatch(programmes,/STEM Club/u);
  assert.doesNotMatch(programmes,/Mental Health Club/u);
});

test("facilitator stays on the existing teacher role", () => {
  const auth = read("auth.html");
  const nestedAuth = read("auth/auth.html");
  const register = read("register.html");
  const teacherDashboard = read("teacher-dashboard.html");

  assert.match(auth,/<option value="teacher">Teacher \/ Facilitator<\/option>/u);
  assert.match(nestedAuth,/<option value="teacher">Teacher \/ Facilitator<\/option>/u);
  assert.match(register,/<option value="teacher">Teacher \/ Facilitator<\/option>/u);
  assert.match(teacherDashboard,/Teacher \/ Facilitator Dashboard/u);
  assert.match(teacherDashboard,/href="programmes\.html"/u);
});

test("programme security collections are school-scoped and cascade with school deletion", () => {
  const rules = read("firebase/firestore.rules");
  const worker = read("workers/platform-api/src/index.js");

  for (const collection of [
    "programmes",
    "programmeMemberships",
    "programmeSessions",
    "programmeAttendance",
    "programmeAssignments",
    "programmeSubmissions"
  ]) {
    assert.ok(rules.includes("match /" + collection + "/"), "missing rules for " + collection);
    assert.ok(worker.includes('"' + collection + '"'), "missing deletion cascade for " + collection);
  }

  assert.match(rules,/isProgrammeFacilitator/u);
  assert.match(rules,/isProgrammeMember/u);
  assert.match(rules,/studentBelongsToProgrammeSchool/u);
  assert.match(rules,/assignmentBelongsToProgramme/u);
  assert.match(rules,/sessionBelongsToProgramme/u);
});

test("shared school computers default to session-only authentication with idle logout", () => {
  const authPage = read("auth.html");
  const nestedAuthPage = read("auth/auth.html");
  const auth = read("js/auth.js");
  const guard = read("launch-role-guard.js");

  assert.match(authPage,/id="privateDevice"/u);
  assert.match(nestedAuthPage,/id="privateDevice"/u);
  assert.match(authPage,/shared computers/u);
  assert.match(auth,/browserSessionPersistence/u);
  assert.match(auth,/browserLocalPersistence/u);
  assert.match(auth,/privateDevice/u);
  assert.match(auth,/speakoutDeviceMode/u);
  assert.match(guard,/SHARED_DEVICE_IDLE_MS/u);
  assert.match(guard,/30 \* 60 \* 1000/u);
  assert.match(guard,/sessionExpired=1/u);
  assert.match(guard,/setPersistence\(auth,browserSessionPersistence\)/u);
});

test("school admin has programme reporting and no fixed club placeholder", () => {
  const dashboard = read("school-dashboard.html");
  const nav = read("launch-role-guard.js");
  const report = read("school-programme-report.html");
  const reportJs = read("js/programmes/school-programme-report.js");

  assert.match(dashboard,/href="school-programme-report\.html"/u);
  assert.match(dashboard,/href="programmes\.html"/u);
  assert.doesNotMatch(dashboard,/>Mental Health Club<\/h3>/u);
  assert.match(nav,/"Reports",\s*"school-programme-report\.html"/u);
  assert.match(report,/Programme performance/u);
  assert.match(report,/Export CSV/u);
  assert.match(report,/Needs attention/u);
  assert.match(reportJs,/programmeSessions/u);
  assert.match(reportJs,/programmeMemberships/u);
  assert.match(reportJs,/programmeAssignments/u);
  assert.match(reportJs,/programmeSubmissions/u);
  assert.match(reportJs,/submittedOnBehalf/u);
});
