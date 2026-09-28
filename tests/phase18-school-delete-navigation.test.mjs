import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root=new URL("../",import.meta.url);
const read=path=>readFileSync(new URL(path,root),"utf8");

test("admin school deletion is explicit and routed through the privileged API",()=>{
  const page=read("admin-schools.html");
  const client=read("js/platform-api.js");
  const worker=read("workers/platform-api/src/index.js");

  assert.match(page,/data-delete=/u);
  assert.match(page,/Type DELETE to continue/u);
  assert.match(page,/adminApi\.deleteSchool/u);
  assert.match(client,/deleteSchool:\s*schoolId/u);
  assert.match(client,/\/v1\/admin\/schools\/delete/u);
  assert.match(worker,/async function deleteSchoolPermanently/u);
  assert.match(worker,/requireAdmin\(user\)/u);
  assert.match(worker,/schoolStudentRegistrations/u);
  assert.match(worker,/schoolStaffRegistrations/u);
  assert.match(worker,/schoolAdminInvites/u);
  assert.match(worker,/parentStudentLinks/u);
  assert.match(worker,/schoolAnnouncements/u);
  assert.match(worker,/schoolResources/u);
  assert.match(worker,/schoolReports/u);
  assert.match(worker,/tx\.delete\(`schools\/\$\{schoolId\}`\)/u);
  assert.match(worker,/status:\s*"suspended"/u);
  assert.match(worker,/approved:\s*false/u);
});

test("public navigation keeps standalone Academy and SpeakOut TV without submenu duplicates",()=>{
  const files=["index.html","pages/about.html","pages/programs.html","pages/academy.html","pages/resources.html","pages/schools.html","pages/impact.html","pages/research.html","pages/news.html","pages/contact.html","pages/donate.html","pages/partners.html","pages/volunteer.html"];
  for(const path of files){
    const source=read(path);
    const nav=source.match(/<nav class="links">[\s\S]*?<\/nav>/u)?.[0]||"";
    assert.ok(nav,`missing public nav in ${path}`);
    assert.equal((nav.match(/>Academy<\/a>/gu)||[]).length,1,`Academy count in ${path}`);
    assert.equal((nav.match(/>SpeakOut TV<\/a>/gu)||[]).length,1,`SpeakOut TV count in ${path}`);
    assert.doesNotMatch(nav,/>SpeakHub Academy<\/a>/u,`duplicate SpeakHub Academy submenu in ${path}`);
  }
});
