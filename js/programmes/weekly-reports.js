import {requireRoles,renderRoleNav} from "../../launch-role-guard.js";
import {db} from "../../firebase-config.js";
import {collection,doc,getDoc,getDocs,query,where} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import {programmeReportsApi} from "../platform-api.js";
import {escapeHtml} from "../learner/ui-utils.js";

const $=id=>document.getElementById(id);
const fromLink=new URLSearchParams(location.search).get("id")||"";
let user=null,profile=null,programmes=[],activeId="",reports=[],permissions={},supervisors=[];
const role=()=>String(profile?.actualRole||profile?.role||"").toLowerCase();
const central=()=>role()==="super_admin";
const schoolManager=()=>["school_admin","school"].includes(role());
const status=(message,error=false)=>{
  $("weeklyStatus").textContent=message;
  $("weeklyStatus").className="week-note"+(error?" error":"");
};
const input=id=>$(id).value.trim();
const localToday=()=>{
  const now=new Date();
  return [now.getFullYear(),String(now.getMonth()+1).padStart(2,"0"),String(now.getDate()).padStart(2,"0")].join("-");
};
const assigned=p=>Array.isArray(p.facilitatorIds)&&p.facilitatorIds.includes(user.uid);
const supervisor=p=>Array.isArray(p.supervisorIds)&&p.supervisorIds.includes(user.uid);
const sameSchool=(p,schoolId)=>p.schoolId===schoolId||Boolean(profile.schoolCode&&p.schoolCode===profile.schoolCode);

async function loadProgrammes(){
  let schoolId=profile.schoolId||"";
  if(!schoolId&&profile.schoolCode&&!central()){
    const schools=await getDocs(query(collection(db,"schools"),where("schoolCode","==",profile.schoolCode)));
    schoolId=schools.docs[0]?.id||"";
  }
  programmes=[];
  if(central()){
    const docs=await getDocs(collection(db,"programmes"));
    programmes=docs.docs.map(x=>({id:x.id,...x.data()}));
  }else if(schoolId&&(schoolManager()||role()==="teacher")){
    const docs=await getDocs(query(collection(db,"programmes"),where("schoolId","==",schoolId)));
    programmes=docs.docs.map(x=>({id:x.id,...x.data()}))
      .filter(p=>sameSchool(p,schoolId)&&(schoolManager()||assigned(p)||supervisor(p)));
  }
  // A volunteer supervisor can use a programme-specific link supplied by admin.
  // The authenticated API still denies anyone lacking the current supervisor assignment.
  if(fromLink&&!programmes.some(x=>x.id===fromLink)){
    if(role()==="volunteer"){
      programmes.push({id:fromLink,name:"Assigned programme"});
    }else if(central()||role()==="teacher"||schoolManager()){
      try{
        const d=await getDoc(doc(db,"programmes",fromLink));
        if(d.exists()&&(central()||sameSchool(d.data(),schoolId)&&(schoolManager()||assigned(d.data())||supervisor(d.data())))){
          programmes.push({id:d.id,...d.data()});
        }
      }catch{ /* Default to the programmes visible through Firestore rules. */ }
    }
  }
  programmes.sort((a,b)=>String(a.name||"").localeCompare(String(b.name||"")));
  $("reportProgramme").innerHTML=programmes.length
    ? programmes.map(p=>'<option value="'+escapeHtml(p.id)+'">'+escapeHtml(central()
       ? ((p.schoolName||p.schoolCode||p.schoolId||"School")+" · "+(p.name||"Programme"))
       : (p.name||"Programme"))+'</option>').join("")
    : '<option value="">No assigned programmes</option>';
  activeId=programmes.some(p=>p.id===fromLink)?fromLink:(programmes[0]?.id||"");
  $("reportProgramme").value=activeId;
}

function summary(){
  const counts={submitted:0,approved:0,revision_requested:0};
  reports.forEach(r=>{if(Object.prototype.hasOwnProperty.call(counts,r.status))counts[r.status]++;});
  const attendance=reports.filter(r=>r.status==="approved").reduce((sum,r)=>sum+Number(r.attendanceCount||0),0);
  $("weeklySummary").innerHTML=[
    ["Reports visible",reports.length],
    ["Awaiting review",counts.submitted],
    ["Approved",counts.approved],
    ["Revision requested",counts.revision_requested],
    ["Approved-session attendance",attendance]
  ].map(([name,n])=>'<div class="week-stat"><strong>'+n+'</strong>'+escapeHtml(name)+'</div>').join("");
}

function renderSupervisors(){
  $("weeklySupervisorPanel").hidden=!permissions.manage;
  if(!permissions.manage)return;
  $("weeklySupervisors").innerHTML=supervisors.length
    ? '<p><strong>Current supervisors</strong></p>'+supervisors.map(uid=>
      '<p class="week-row"><code>'+escapeHtml(uid)+'</code> <button type="button" class="week-btn secondary" data-remove="'+escapeHtml(uid)+'">Remove</button></p>'
    ).join("")
    : '<p>No additional supervisors assigned. School and central administrators can still review.</p>';
  $("weeklySupervisors").querySelectorAll("[data-remove]").forEach(button=>button.addEventListener("click",async()=>{
    if(!confirm("Remove this supervisor from this programme?"))return;
    button.disabled=true;
    try{
      const result=await programmeReportsApi.supervisor(activeId,button.dataset.remove,"remove");
      supervisors=result.supervisors||[];
      renderSupervisors();
      status("Supervisor removed. Their report review access is revoked.");
    }catch(error){status(error.message||"Unable to remove supervisor.",true);}
    finally{button.disabled=false;}
  }));
}

const safeDate=value=>escapeHtml(String(value||""));
const paragraph=(label,value)=>value?'<p><strong>'+label+':</strong> '+escapeHtml(value)+'</p>':"";
function renderReports(){
  const list=$("weeklyReports");
  list.innerHTML=reports.length?reports.map(r=>{
    const canReview=permissions.review&&r.facilitatorId!==user.uid&&r.status==="submitted";
    const canRevise=permissions.submit&&r.facilitatorId===user.uid&&r.status==="revision_requested";
    return '<article class="week-item"><h3>'+escapeHtml(r.topic||"Session")+'</h3>'+
      '<div class="week-meta">'+safeDate(r.termKey)+' • Week '+Number(r.week)+' • '+safeDate(r.sessionDate)+
      ' • '+escapeHtml(r.facilitatorName||"Facilitator")+' • '+escapeHtml(r.status||"Submitted")+
      ' • Revision '+Number(r.revision||1)+'</div>'+
      paragraph("Activities",r.activities)+paragraph("Learning outcomes",r.learningOutcomes)+
      paragraph("Operational challenges",r.challenges)+paragraph("Next week",r.nextSteps)+
      '<p><strong>Attendance:</strong> '+Number(r.attendanceCount||0)+
      (r.safetyEscalated?' • Separate safeguarding escalation recorded':'')+'</p>'+
      (r.reviewNote?paragraph("Supervisor feedback",r.reviewNote):"")+
      (canReview?'<label for="note-'+escapeHtml(r.id)+'">Reviewer feedback</label>'+
        '<textarea class="review-note" id="note-'+escapeHtml(r.id)+'" maxlength="800" placeholder="Required when requesting a revision"></textarea>'+
        '<div class="week-actions"><button class="week-btn" data-decision="approved" data-report="'+escapeHtml(r.id)+'">Approve</button>'+
        '<button class="week-btn secondary" data-decision="revision_requested" data-report="'+escapeHtml(r.id)+'">Request revision</button></div>':"")+
      (canRevise?'<button class="week-btn secondary" type="button" data-revise="'+escapeHtml(r.id)+'">Edit and resubmit this week</button>':"")+
      '</article>';
  }).join(""):'<p>No weekly reports submitted for this programme yet.</p>';

  const byId=new Map(reports.map(r=>[r.id,r]));
  list.querySelectorAll("[data-decision]").forEach(button=>button.addEventListener("click",async()=>{
    const note=$("note-"+button.dataset.report).value.trim();
    if(button.dataset.decision==="revision_requested"&&note.length<5){
      status("Explain the requested revision in at least five characters.",true);return;
    }
    button.disabled=true;
    try{
      await programmeReportsApi.review(activeId,button.dataset.report,button.dataset.decision,note);
      await loadReports();
      status("Supervisor decision recorded and added to the audit history.");
    }catch(error){status(error.message||"Could not review report.",true);}
    finally{button.disabled=false;}
  }));
  list.querySelectorAll("[data-revise]").forEach(button=>button.addEventListener("click",()=>{
    const r=byId.get(button.dataset.revise);
    if(!r)return;
    $("weeklyTerm").value=r.termKey;
    $("weeklyWeek").value=String(r.week);
    $("weeklyDate").value=r.sessionDate;
    $("weeklyAttendance").value=String(r.attendanceCount);
    $("weeklyTopic").value=r.topic||"";
    $("weeklyActivities").value=r.activities||"";
    $("weeklyOutcomes").value=r.learningOutcomes||"";
    $("weeklyChallenges").value=r.challenges||"";
    $("weeklyNext").value=r.nextSteps||"";
    $("weeklySafety").checked=r.safetyEscalated===true;
    $("weeklyPrivacy").checked=false;
    $("weeklySubmitPanel").scrollIntoView({behavior:"smooth",block:"start"});
    status("Revision loaded. Apply the feedback, confirm privacy and resubmit.");
  }));
}

async function loadReports(){
  $("weeklySubmitPanel").hidden=true;
  $("weeklySupervisorPanel").hidden=true;
  $("weeklyReportsPanel").hidden=true;
  $("weeklySummaryPanel").hidden=true;
  if(!activeId){
    status("No programme assignment found. Ask your administrator to link your account.",true);return;
  }
  status("Loading private weekly records…");
  try{
    const result=await programmeReportsApi.list(activeId);
    reports=Array.isArray(result.reports)?result.reports:[];
    permissions=result.permissions||{};
    supervisors=Array.isArray(result.supervisors)?result.supervisors:[];
    $("weeklySubmitPanel").hidden=!permissions.submit;
    $("weeklyReportsPanel").hidden=false;
    $("weeklySummaryPanel").hidden=false;
    summary();renderSupervisors();renderReports();
    status(reports.length+" weekly report"+(reports.length===1?"":"s")+" loaded for "+(result.programmeName||"this programme")+".");
    if(result.truncated)status("More reports exist than this page can display. Contact your programme administrator.",true);
  }catch(error){
    console.error(error);
    status(error.message||"Could not retrieve programme reports.",true);
  }
}

$("reportProgramme").addEventListener("change",()=>{
  activeId=$("reportProgramme").value;
  loadReports();
});
$("weeklyRefresh").addEventListener("click",loadReports);
$("weeklyForm").addEventListener("submit",async event=>{
  event.preventDefault();
  if(!permissions.submit||!activeId)return;
  const button=$("weeklySubmit");
  button.disabled=true;
  try{
    await programmeReportsApi.submit({
      programmeId:activeId,termKey:input("weeklyTerm"),week:Number(input("weeklyWeek")),
      sessionDate:input("weeklyDate"),attendanceCount:Number(input("weeklyAttendance")),
      topic:input("weeklyTopic"),activities:input("weeklyActivities"),
      learningOutcomes:input("weeklyOutcomes"),challenges:input("weeklyChallenges"),
      nextSteps:input("weeklyNext"),safetyEscalated:$("weeklySafety").checked,
      privacyAttested:$("weeklyPrivacy").checked
    });
    $("weeklyForm").reset();
    $("weeklyTerm").value=new Date().getFullYear()+"-T1";
    $("weeklyDate").value=localToday();
    await loadReports();
    status("Report submitted. It is now waiting for supervisor review.");
  }catch(error){
    status(error.message||"Could not submit report.",true);
  }finally{button.disabled=false;}
});
$("weeklySupervisorForm").addEventListener("submit",async event=>{
  event.preventDefault();
  if(!permissions.manage)return;
  const button=event.target.querySelector("button");
  button.disabled=true;
  try{
    const result=await programmeReportsApi.supervisor(activeId,input("weeklySupervisorUid"),"assign");
    supervisors=result.supervisors||[];
    $("weeklySupervisorUid").value="";
    renderSupervisors();
    status("Supervisor assigned. Share this page with the programme-specific ?id link.");
  }catch(error){status(error.message||"Could not assign supervisor.",true);}
  finally{button.disabled=false;}
});
function cell(value){
  const raw=String(value??"");
  const safe=/^[=+\-@\t\r]/.test(raw)?"'"+raw:raw;
  return '"'+safe.replaceAll('"','""')+'"';
}
$("weeklyExport").addEventListener("click",()=>{
  // Export aggregate operations only; never copy free-text challenges or safeguarding details.
  const headers=["Programme","Term","Week","Session date","Facilitator UID","Attendance","Status","Revision"];
  const rows=reports.map(r=>[activeId,r.termKey,r.week,r.sessionDate,r.facilitatorId,r.attendanceCount,r.status,r.revision]);
  const csv=[headers,...rows].map(items=>items.map(cell).join(",")).join("\r\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download="speakout-weekly-report-summary.csv";
  document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),5000);
});
for(let i=1;i<=24;i++){
  const option=document.createElement("option");option.value=String(i);option.textContent="Week "+i;
  $("weeklyWeek").append(option);
}
$("weeklyTerm").value=new Date().getFullYear()+"-T1";
$("weeklyDate").value=localToday();
requireRoles(["teacher","school_admin","admin","super_admin","volunteer"],async (account,data)=>{
  user=account;profile=data;
  renderRoleNav(profile,"Programs");
  try{await loadProgrammes();await loadReports();}
  catch(error){console.error(error);status(error.message||"Programme access is unavailable.",true);}
});
