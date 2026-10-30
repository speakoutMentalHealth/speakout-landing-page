import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read = path => readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("admin volunteer cards are folded by default and all sensitive sections have independent disclosures",()=>{
  const js=read("js/admin-volunteers.js");
  const html=read("admin-volunteers.html");
  assert.match(js,/const panel = document\.createElement\("details"\)/);
  assert.match(js,/panel\.className = "application-accordion"/);
  assert.match(js,/overview\.className = "application-summary"/);
  assert.match(js,/const reviewPanel = document\.createElement\("details"\)/);
  assert.match(js,/reviewPanel\.append\(controls\)/);
  assert.match(js,/body\.append\(profilePanel\)/);
  assert.match(js,/body\.append\(credentialReviewPanel\(uid, a, exam\)\)/);
  assert.match(js,/body\.append\(assignmentEditor\(uid, a\)\)/);
  assert.match(js,/body\.append\(notificationEditor\(uid, email, a\.emailUpdates\)\)/);
  assert.doesNotMatch(js,/panel\.open = true/);
  assert.match(html,/application-summary:focus-visible/);
});
test("search filters only loaded applications without additional Firestore reads",()=>{
  const js=read("js/admin-volunteers.js"), html=read("admin-volunteers.html");
  assert.match(html,/id="volunteerSearch"/);
  assert.match(html,/id="stageFilter"/);
  assert.match(html,/id="filterStatus" role="status"/);
  assert.match(js,/card\.dataset\.searchText\.includes\(search\)/);
  assert.match(js,/card\.dataset\.reviewStage === stage/);
  assert.match(js,/article\.dataset\.reviewStage = stage\.value/);
  assert.match(js,/applyApplicationFilters\(\)/);
  assert.match(html,/\.application\[hidden\]\{display:none!important\}/);
  assert.match(html,/@media\(max-width:700px\)/);
});
test("review saves retain security validation and never give an automatic placement",()=>{
  const js=read("js/admin-volunteers.js");
  assert.match(js,/Active placement requires independently verified assessment/);
  assert.match(js,/Only an active, verified and safeguarded volunteer may have an assignment/);
  assert.match(js,/batch\.update\(doc\(db,"volunteerApplications",uid\)/);
  assert.match(js,/await batch\.commit\(\)/);
});
