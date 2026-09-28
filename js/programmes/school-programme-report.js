import { requireRoles, renderRoleNav } from "../../launch-role-guard.js";
import { db } from "../../firebase-config.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import { escapeHtml, normalize, prettyLabel as pretty, statusPill as pill, formatDisplayDate as formatDate } from "../learner/ui-utils.js";

const $=id=>document.getElementById(id);
let profile=null;
let school=null;
let programmes=[];
let sessions=[];
let memberships=[];
let assignments=[];
let submissions=[];
let reportRows=[];

function show(message,type=""){
  $("statusBox").textContent=message;
  $("statusBox").className="program-note"+(type?" "+type:"");
}

async function resolveSchool(){
  if(profile.schoolId){
    const snap=await getDoc(doc(db,"schools",profile.schoolId));
    if(snap.exists()) return {id:snap.id,...snap.data()};
  }
  if(profile.schoolCode){
    const snap=await getDocs(query(collection(db,"schools"),where("schoolCode","==",profile.schoolCode)));
    if(!snap.empty) return {id:snap.docs[0].id,...snap.docs[0].data()};
  }
  return null;
}

async function schoolCollection(name){
  const snap=await getDocs(query(collection(db,name),where("schoolId","==",school.id)));
  return snap.docs.map(document=>({id:document.id,...document.data()}));
}

function programmeMetrics(item){
  const id=item.id;
  const ownMembers=memberships.filter(x=>x.programmeId===id&&normalize(x.status||"active")!=="inactive");
  const ownSessions=sessions.filter(x=>x.programmeId===id);
  const ownAssignments=assignments.filter(x=>x.programmeId===id);
  const ownSubmissions=submissions.filter(x=>x.programmeId===id);
  const completed=ownSubmissions.filter(x=>normalize(x.status)==="completed").length;
  const attendance=ownSessions.reduce((sum,x)=>sum+(Number(x.attendanceCount)||0),0);
  return {
    id,
    name:item.name||"Programme",
    type:item.type||"programme",
    category:item.category||"General",
    status:item.status||"pending_approval",
    facilitators:Array.isArray(item.facilitatorIds)?item.facilitatorIds.length:0,
    members:ownMembers.length,
    sessions:ownSessions.length,
    attendance,
    assignments:ownAssignments.length,
    submissions:ownSubmissions.length,
    completed,
    completion:ownSubmissions.length?Math.round(completed*100/ownSubmissions.length):0
  };
}

function renderSummary(){
  const completed=submissions.filter(x=>normalize(x.status)==="completed").length;
  const offline=submissions.filter(x=>x.submittedOnBehalf===true).length;
  const attendance=sessions.reduce((sum,x)=>sum+(Number(x.attendanceCount)||0),0);
  $("programmeCount").textContent=programmes.length;
  $("sessionCount").textContent=sessions.length;
  $("attendanceCount").textContent=attendance;
  $("memberCount").textContent=memberships.filter(x=>normalize(x.status||"active")!=="inactive").length;
  $("assignmentCount").textContent=assignments.length;
  $("submissionCount").textContent=submissions.length;
  $("offlineCount").textContent=offline;
  $("completionRate").textContent=submissions.length?Math.round(completed*100/submissions.length)+"%":"0%";
}

function renderTable(){
  const q=normalize($("searchInput").value);
  const filter=normalize($("statusFilter").value||"all");
  const filtered=reportRows.filter(row=>{
    const text=normalize([row.name,row.type,row.category].join(" "));
    return (!q||text.includes(q))&&(filter==="all"||normalize(row.status)===filter);
  });

  $("reportRows").innerHTML=filtered.length
    ? filtered.map(row=>
      '<tr>'+
      '<td><a href="programme-workspace.html?id='+encodeURIComponent(row.id)+'"><strong>'+escapeHtml(row.name)+'</strong></a><br><small>'+escapeHtml(pretty(row.type))+' • '+escapeHtml(row.category)+'</small></td>'+
      '<td>'+pill(row.status)+'</td>'+
      '<td>'+row.members+'</td>'+
      '<td>'+row.sessions+'</td>'+
      '<td>'+row.attendance+'</td>'+
      '<td>'+row.assignments+'</td>'+
      '<td>'+row.submissions+'</td>'+
      '<td>'+row.completed+'</td>'+
      '<td>'+row.completion+'%</td>'+
      '</tr>'
    ).join("")
    : '<tr><td colspan="9">No programmes match this view.</td></tr>';
}

function renderAttention(){
  const items=[];
  reportRows.filter(row=>normalize(row.status)==="pending_approval")
    .forEach(row=>items.push({title:row.name,text:"Awaiting school approval.",kind:"pending_approval"}));
  reportRows.filter(row=>normalize(row.status)==="active"&&row.facilitators===0)
    .forEach(row=>items.push({title:row.name,text:"Active but no facilitator is assigned.",kind:"pending"}));
  reportRows.filter(row=>normalize(row.status)==="active"&&row.sessions===0)
    .forEach(row=>items.push({title:row.name,text:"Active programme with no recorded session yet.",kind:"pending"}));
  reportRows.filter(row=>row.submissions>=3&&row.completion<50)
    .forEach(row=>items.push({title:row.name,text:row.completion+"% of submitted work is marked completed.",kind:"pending"}));

  $("attentionList").innerHTML=items.length
    ? items.slice(0,12).map(item=>
      '<article class="program-item"><div class="program-item-head"><div><strong>'+
      escapeHtml(item.title)+'</strong><p>'+escapeHtml(item.text)+'</p></div>'+
      pill(item.kind)+'</div></article>'
    ).join("")
    : '<div class="program-empty">No operational issues detected from the available programme records.</div>';
}

function renderRecentSessions(){
  const programmeMap=new Map(programmes.map(item=>[item.id,item]));
  const ordered=[...sessions].sort((a,b)=>String(b.sessionDate||"").localeCompare(String(a.sessionDate||""))).slice(0,10);
  $("recentSessions").innerHTML=ordered.length
    ? ordered.map(item=>{
      const programme=programmeMap.get(item.programmeId);
      return '<article class="program-item"><div class="program-item-head"><div><strong>'+
        escapeHtml((programme?.name||"Programme")+" • "+(item.topic||"Session"))+
        '</strong><p>'+escapeHtml(item.activitySummary||"Session recorded.")+'</p></div>'+
        pill(item.status||"completed")+'</div><div class="program-meta">'+
        '<span class="program-pill">'+escapeHtml(formatDate(item.sessionDate||item.createdAt))+'</span>'+
        '<span class="program-pill">'+(Number(item.attendanceCount)||0)+' attended</span>'+
        (item.facilitatorName?'<span class="program-pill">'+escapeHtml(item.facilitatorName)+'</span>':"")+
        '</div></article>';
    }).join("")
    : '<div class="program-empty">No programme sessions have been recorded yet.</div>';
}

function csvValue(value){
  const valueText=String(value??"").replaceAll('"','""');
  return '"'+valueText+'"';
}

function exportCsv(){
  const header=["Programme","Type","Category","Status","Members","Sessions","Attendance","Assignments","Submissions","Completed","Completion %"];
  const lines=[header.map(csvValue).join(",")];
  reportRows.forEach(row=>{
    lines.push([
      row.name,row.type,row.category,row.status,row.members,row.sessions,row.attendance,
      row.assignments,row.submissions,row.completed,row.completion
    ].map(csvValue).join(","));
  });
  const blob=new Blob([lines.join("\n")],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download=String(school.schoolCode||"school").replace(/[^a-z0-9_-]/gi,"-")+"-programme-report.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function loadReport(){
  [programmes,sessions,memberships,assignments,submissions]=await Promise.all([
    schoolCollection("programmes"),
    schoolCollection("programmeSessions"),
    schoolCollection("programmeMemberships"),
    schoolCollection("programmeAssignments"),
    schoolCollection("programmeSubmissions")
  ]);
  reportRows=programmes.map(programmeMetrics).sort((a,b)=>a.name.localeCompare(b.name));
  renderSummary();
  renderTable();
  renderAttention();
  renderRecentSessions();
}

$("searchInput").addEventListener("input",renderTable);
$("statusFilter").addEventListener("change",renderTable);
$("exportButton").addEventListener("click",exportCsv);

requireRoles(["school_admin"],async (user,data)=>{
  profile=data;
  renderRoleNav(profile,"Reports");
  try{
    school=await resolveSchool();
    if(!school) throw new Error("No school is linked to this administrator account.");
    $("reportTitle").textContent=(school.schoolName||school.name||"School")+" programme reports";
    $("schoolPills").innerHTML=pill(school.schoolCode||"School")+pill(profile.role||"school_admin");
    await loadReport();
    show("Programme report loaded.","ok");
  }catch(error){
    console.error(error);
    show(error.message||"Could not load programme reports.","bad");
  }
});