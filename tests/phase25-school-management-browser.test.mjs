import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("school management browser UAT script parses", () => {
  const path = new URL("../tests/school-management-browser.mjs", import.meta.url).pathname;
  execFileSync(process.execPath, ["--check", path]);
});

test("school management UAT covers the required V1 role matrix", () => {
  const source = read("tests/school-management-browser.mjs");
  for (const marker of [
    "schoolAdminOwnUserApproval",
    "crossSchoolUserApprovalDenied",
    "teacherProgrammeProposal",
    "schoolProgrammeApproval",
    "facilitatorAssignment",
    "facilitatorSessionAndAttendance",
    "offlineWorkRecordedOnBehalf",
    "parentLinkRequestAndSchoolApproval",
    "parentProgrammeVisibility",
    "crossSchoolProgrammeReadDenied",
    "superAdminExplicitSupportMode",
    "superAdminSupportScopedToSchoolA"
  ]) {
    assert.match(source, new RegExp(marker));
  }
});

test("school management UAT runs against staging rules, Worker and browser UI", () => {
  const workflow = read(".github/workflows/school-management-browser.yml");
  assert.match(workflow, /Deploy branch Firestore rules to staging/u);
  assert.match(workflow, /Deploy branch Worker to staging/u);
  assert.match(workflow, /Run school management browser UAT/u);
  assert.match(workflow, /Upload UAT evidence/u);
});


test("programme workspace queries stay explicitly school-scoped", () => {
  const source = read("js/programmes/programme-workspace.js");
  for (const collection of [
    "programmeMemberships",
    "programmeSessions",
    "programmeAttendance",
    "programmeAssignments",
    "programmeSubmissions"
  ]) {
    const start = source.indexOf(`collection(db,"${collection}")`);
    assert.ok(start >= 0, `missing ${collection} query`);
    const block = source.slice(start, start + 260);
    assert.match(block, /where\("schoolId","==",programme\.schoolId\)/u, collection);
    assert.match(block, /where\("programmeId","==",programmeId\)/u, collection);
  }
});
