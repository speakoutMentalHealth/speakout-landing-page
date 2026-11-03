import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
import {canSubmitWeeklyReport,canReviewWeeklyReport,programmeReportsRoute} from "../workers/platform-api/src/programme-reports.js";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const base={id:"club-a",schoolId:"school-a",schoolCode:"KPA",name:"Mental Health Club",
  status:"active",facilitatorIds:["teacher-a"],supervisorIds:["reviewer-a"]};
const person=(uid,role,schoolId="school-a")=>({uid,profile:{role,schoolId,status:"approved",fullName:uid}});
const report={programmeId:"club-a",termKey:"2026-T1",week:3,sessionDate:"2026-10-30",
  attendanceCount:17,topic:"Stress and wellbeing",activities:"Discussed identifying stress and coping tools.",
  learningOutcomes:"Students could list healthy coping skills.",challenges:"Limited time",
  nextSteps:"Review breathing tools",safetyEscalated:false,privacyAttested:true};
function fixtures(overrideProgramme=base){
  const records=new Map([["programmes/club-a",{...overrideProgramme}]]);
  records.set("users/reviewer-b",{role:"volunteer",status:"approved",fullName:"Volunteer Reviewer",schoolId:""});
  records.set("users/reviewer-a",{role:"teacher",status:"approved",schoolId:"school-a"});
  const stub={
    env:{},
    getDocument:async(_env,path)=>records.get(path)?{id:path.split("/").at(-1),...records.get(path)}:null,
    queryDocumentsByField:async(_env,name,field,value)=>({
      documents:[...records].filter(([path,v])=>path.startsWith(name+"/")&&v[field]===value)
        .map(([path,v])=>({id:path.split("/").at(-1),...v})),truncated:false
    }),
    runTransaction:async(_env,callback)=>{
      const writes=[];
      const tx={
        get:async path=>records.get(path)?{id:path.split("/").at(-1),...records.get(path)}:null,
        set:(path,value)=>writes.push({path,value,patch:false}),
        patch:(path,value)=>writes.push({path,value,patch:true})
      };
      const result=await callback(tx);
      for(const w of writes)records.set(w.path,w.patch?{...records.get(w.path),...w.value}:w.value);
      return result;
    }
  };
  return {records,stub};
}
const call=(st,path,user,data)=>programmeReportsRoute({
  path:"/v1/programme-reports/"+path,data,user,...st.stub
});

test("only current assigned facilitators can submit, including cross-school denial",()=>{
  assert.equal(canSubmitWeeklyReport(person("teacher-a","teacher"),base),true);
  assert.equal(canSubmitWeeklyReport(person("creator","teacher"),base),false);
  assert.equal(canSubmitWeeklyReport(person("teacher-a","teacher","school-other"),base),false);
  assert.equal(canSubmitWeeklyReport(person("learner","student"),base),false);
  assert.equal(canReviewWeeklyReport(person("reviewer-a","teacher"),base),true);
  assert.equal(canReviewWeeklyReport(person("reviewer-z","teacher"),base),false);
  assert.equal(canReviewWeeklyReport(person("admin-other","school_admin","school-other"),base),false);
  assert.equal(canReviewWeeklyReport(person("central","super_admin",""),base),true);
});

test("submission creates one private weekly report and immutable audit, no case notes",async()=>{
  const st=fixtures();
  const teacher=person("teacher-a","teacher");
  const result=await call(st,"submit",teacher,report);
  assert.equal(result.status,"submitted");
  const saved=st.records.get("programmeWeeklyReports/"+result.reportId);
  assert.equal(saved.facilitatorId,"teacher-a");
  assert.equal(saved.attendanceCount,17);
  assert.equal(saved.status,"submitted");
  assert.equal(saved.privacyAttested,undefined);
  assert.ok([...st.records.keys()].some(x=>x.startsWith("programmeWeeklyReportAudits/")));
  await assert.rejects(call(st,"submit",teacher,report),e=>e.status===409);
});

test("supervisor review, self-review prevention, revision and immutable approval",async()=>{
  const st=fixtures();
  const teacher=person("teacher-a","teacher");
  const reviewer=person("reviewer-a","teacher");
  const submitted=await call(st,"submit",teacher,report);
  await assert.rejects(call(st,"review",teacher,{programmeId:"club-a",reportId:submitted.reportId,decision:"approved"}),e=>e.status===403);
  await assert.rejects(call(st,"review",reviewer,{programmeId:"club-a",reportId:submitted.reportId,decision:"revision_requested",note:""}),e=>e.status===400);
  const requested=await call(st,"review",reviewer,{programmeId:"club-a",reportId:submitted.reportId,decision:"revision_requested",note:"Please add outcomes"});
  assert.equal(requested.status,"revision_requested");
  const revised=await call(st,"submit",teacher,{...report,activities:"Improved activities and outcomes recorded."});
  assert.equal(revised.revision,2);
  const approved=await call(st,"review",reviewer,{programmeId:"club-a",reportId:submitted.reportId,decision:"approved",note:"Approved"});
  assert.equal(approved.status,"approved");
  await assert.rejects(call(st,"submit",teacher,report),e=>e.status===409);
  await assert.rejects(call(st,"review",reviewer,{programmeId:"club-a",reportId:submitted.reportId,decision:"approved"}),e=>e.status===409);
});

test("list filters facilitator records, preserves reviewer queue and hides from students",async()=>{
  const st=fixtures();
  await call(st,"submit",person("teacher-a","teacher"),report);
  const own=await call(st,"list",person("teacher-a","teacher"),{programmeId:"club-a"});
  assert.equal(own.reports.length,1);
  assert.equal(own.permissions.submit,true);
  assert.equal(own.permissions.review,false);
  const queue=await call(st,"list",person("reviewer-a","teacher"),{programmeId:"club-a"});
  assert.equal(queue.reports.length,1);
  assert.equal(queue.permissions.review,true);
  await assert.rejects(call(st,"list",person("student-a","student"),{programmeId:"club-a"}),e=>e.status===403);
  await assert.rejects(call(st,"list",person("teacher-a","teacher","school-b"),{programmeId:"club-a"}),e=>e.status===403);
});

test("safeguarding attestation is mandatory; no narrative field accepts an incident payload",async()=>{
  const st=fixtures();
  const teacher=person("teacher-a","teacher");
  await assert.rejects(call(st,"submit",teacher,{...report,privacyAttested:false}),e=>e.status===400);
  await assert.rejects(call(st,"submit",teacher,{...report,attendanceCount:-1}),e=>e.status===400);
  await assert.rejects(call(st,"submit",teacher,{...report,week:25}),e=>e.status===400);
  await assert.rejects(call(st,"submit",teacher,{...report,sessionDate:"2026-02-30"}),e=>e.status===400);
  await assert.rejects(call(st,"submit",teacher,{...report,challenges:"Contact 08031234567 urgently"}),e=>e.status===400);
  await assert.rejects(call(st,"submit",teacher,{...report,activities:"Send this information to pupil@example.com"}),e=>e.status===400);
});

test("school manager assigns scoped reviewer and revocation blocks review immediately",async()=>{
  const st=fixtures({...base,supervisorIds:[]});
  const admin=person("school-admin","school_admin");
  const t=person("teacher-a","teacher");
  const result=await call(st,"supervisor",admin,{programmeId:"club-a",supervisorId:"reviewer-a",action:"assign"});
  assert.deepEqual(result.supervisors,["reviewer-a"]);
  const submitted=await call(st,"submit",t,report);
  const reviewer=person("reviewer-a","teacher");
  assert.equal((await call(st,"list",reviewer,{programmeId:"club-a"})).reports.length,1);
  await call(st,"supervisor",admin,{programmeId:"club-a",supervisorId:"reviewer-a",action:"remove"});
  await assert.rejects(call(st,"review",reviewer,{programmeId:"club-a",reportId:submitted.reportId,decision:"approved"}),e=>e.status===403);
  await assert.rejects(call(st,"supervisor",person("admin-elsewhere","school_admin","other"),
    {programmeId:"club-a",supervisorId:"reviewer-a",action:"assign"}),e=>e.status===403);
});

test("private report Firestore collections cannot bypass worker even as super admin",()=>{
  const rules=read("firebase/firestore.rules");
  const index=read("workers/platform-api/src/index.js");
  const page=read("programme-weekly-reports.html");
  const js=read("js/programmes/weekly-reports.js");
  assert.match(rules,/match \/programmeWeeklyReports\/\{reportId\} \{ allow read, write: if false; \}/);
  assert.match(rules,/match \/programmeWeeklyReportAudits\/\{auditId\} \{ allow read, write: if false; \}/);
  assert.equal((rules.match(/collection != "programmeWeeklyReports"/g)||[]).length,4);
  assert.equal((rules.match(/collection != "programmeWeeklyReportAudits"/g)||[]).length,4);
  assert.match(index,/programmeReportsRoute/);
  assert.match(index,/"programmeWeeklyReportAudits"/);
  assert.match(page,/safeguarding concern was escalated separately/);
  assert.match(js,/programmeReportsApi\.review/);
  assert.match(read("teacher-dashboard.html"),/href="programme-weekly-reports\.html"/);
  assert.match(read("admin-dashboard.html"),/href="programme-weekly-reports\.html"/);
  assert.match(read("school-dashboard.html"),/href="programme-weekly-reports\.html"/);
});


test("supervisor candidate directory includes approved school staff but never students",async()=>{
  const st=fixtures();
  st.records.set("users/teacher-a",{role:"teacher",status:"approved",schoolId:"school-a",fullName:"KPA Facilitator"});
  st.records.set("users/student-a",{role:"student",status:"approved",schoolId:"school-a"});
  st.records.set("users/teacher-other",{role:"teacher",status:"approved",schoolId:"other"});
  const admin=person("school-admin","school_admin");
  const response=await call(st,"candidates",admin,{programmeId:"club-a"});
  assert.ok(response.candidates.some(x=>x.uid==="teacher-a"));
  assert.ok(response.candidates.some(x=>x.uid==="reviewer-a"));
  assert.ok(!response.candidates.some(x=>x.uid==="student-a"));
  assert.ok(!response.candidates.some(x=>x.uid==="teacher-other"));
  await assert.rejects(call(st,"candidates",person("teacher-a","teacher"),{programmeId:"club-a"}),e=>e.status===403);
  assert.match(read("programme-weekly-reports.html"),/weeklySupervisorCandidate/);
});
