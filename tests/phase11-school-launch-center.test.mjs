import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = path => readFileSync(new URL(path, root), "utf8");

test("school launch center is available to school administrators", () => {
  const page = read("school-launch-center.html");
  const controller = read("js/programmes/school-launch-center.js");
  const nav = read("launch-role-guard.js");
  const dashboard = read("school-dashboard.html");

  assert.match(page,/School Launch Center/u);
  assert.match(page,/Pilot starter programmes/u);
  assert.match(page,/3-account pilot test/u);
  assert.match(page,/On-site ICT check/u);
  assert.match(controller,/requireRoles\(\["school_admin"\]/u);
  assert.match(nav,/"Launch",\s*"school-launch-center\.html"/u);
  assert.match(dashboard,/href="school-launch-center\.html"/u);
});

test("launch starter set is editable and preserves flexible school ownership", () => {
  const controller = read("js/programmes/school-launch-center.js");

  assert.match(controller,/name:"STEM Programme"/u);
  assert.match(controller,/name:"ICT & Digital Skills"/u);
  assert.match(controller,/name:"Mental Health & Wellness Club"/u);
  assert.match(controller,/name:"Literary, Debate & Spelling"/u);
  assert.match(controller,/name:"Cultural & Drama"/u);

  assert.match(controller,/source:"existing_school"/u);
  assert.match(controller,/source:"speakout_supported"/u);
  assert.match(controller,/data-field="name"/u);
  assert.match(controller,/data-field="type"/u);
  assert.match(controller,/data-field="source"/u);
  assert.match(controller,/data-field="membershipMode"/u);
  assert.match(controller,/data-field="facilitatorId"/u);
  assert.match(controller,/data-field="parentVisibility"/u);
  assert.match(controller,/selected\.filter/u);
  assert.match(controller,/existingNames/u);
});

test("KPA launch assumptions remain non-destructive and privacy-aware", () => {
  const controller = read("js/programmes/school-launch-center.js");
  const page = read("school-launch-center.html");

  assert.match(controller,/Monday \/ Wednesday \/ Friday/u);
  assert.match(controller,/membershipMode:"voluntary"/u);
  assert.match(controller,/parentVisibility:"progress"/u);
  assert.match(controller,/preserving the school’s current structure and coordinators/u);
  assert.match(page,/editable launch templates, not fixed clubs/u);
  assert.match(page,/Existing school programmes should be strengthened, not replaced/u);
  assert.match(page,/private wellbeing disclosures/iu);
});

test("launch readiness uses real roster, user and programme state", () => {
  const controller = read("js/programmes/school-launch-center.js");

  assert.match(controller,/roleApi\.schoolRoster\(\)/u);
  assert.match(controller,/where\("schoolId","==",school\.id\)/u);
  assert.match(controller,/normalize\(item\.role\)==="teacher"/u);
  assert.match(controller,/normalize\(item\.role\)==="student"/u);
  assert.match(controller,/normalize\(item\.status\)==="active"/u);
  assert.match(controller,/approvedStudents >= 1 && approvedTeachers\.length >= 1 && activeProgrammes >= 1/u);
});