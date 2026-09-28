import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = path => readFileSync(new URL(path, root), "utf8");

test("school student management supports bulk roster pre-enrolment", () => {
  const page = read("school-students.html");
  const client = read("js/platform-api.js");

  assert.match(page, /id="rosterFile"/u);
  assert.match(page, /Download CSV Template/u);
  assert.match(page, /First Name, Last Name and Admission Number/u);
  assert.match(page, /function parseCsv/u);
  assert.match(page, /function rosterRowsFromCsv/u);
  assert.match(page, /roleApi\.importSchoolRoster/u);
  assert.match(page, /roleApi\.schoolRoster/u);
  assert.match(page, /Pre-enrolled school roster/u);
  assert.doesNotMatch(page, /await addDoc\(\s*collection\(\s*db,\s*"users"/u);
  assert.match(client, /\/v1\/roles\/school\/roster\/list/u);
  assert.match(client, /\/v1\/roles\/school\/roster\/import/u);
});

test("platform API validates, stores and links school roster records", () => {
  const worker = read("workers/platform-api/src/index.js");

  assert.match(worker, /schoolStudentRoster/u);
  assert.match(worker, /async function schoolRosterList/u);
  assert.match(worker, /async function importSchoolRoster/u);
  assert.match(worker, /maximum of 300 students/u);
  assert.match(worker, /Duplicate admission number in this import/u);
  assert.match(worker, /source: incoming\.length > 1 \? "bulk_csv" : "manual_roster"/u);
  assert.match(worker, /school-roster-claim/u);
  assert.match(worker, /rosterMatched/u);
  assert.match(worker, /linkedUserId/u);
  assert.match(worker, /status: "claim_pending"/u);
  assert.match(worker, /"schoolStudentRoster",\s*"schoolStaffRegistrations"/u);
});

test("roster does not bypass school approval", () => {
  const worker = read("workers/platform-api/src/index.js");

  assert.match(worker, /status: "pending_school_approval"/u);
  assert.match(worker, /approved: false/u);
  assert.match(worker, /schoolVerificationStatus: "pending"/u);
  assert.match(worker, /status === "approved" \? "active"/u);
  assert.match(worker, /status === "rejected"/u);
  assert.match(worker, /status: "pre_enrolled"/u);
});