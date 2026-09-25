import { requireRoles, renderRoleNav } from "../../launch-role-guard.js";
import { learningApi } from "../platform-api.js";
import { PHASE2_VERIFIED_COURSES } from "../../phase2-verified-courses.js";
import { SO } from "../../dashboard-shared.js";

const allowedRoles=["student","teacher","parent","ambassador","contributor","volunteer","school_admin","school"];
const $=id=>document.getElementById(id);
const statusBox=$("statusBox"),credentialList=$("credentialList"),learningList=$("learningList"),
  focusAreas=$("focusAreas"),providerList=$("providerList"),cvSummary=$("cvSummary"),actionStatus=$("actionStatus");

let portfolioSummary="";

const normalize=value=>String(value||"").trim().toLowerCase();
const safe=value=>SO.safe(value);
const pretty=value=>String(value||"").replaceAll("-"," ").replace(/\b\w/g,letter=>letter.toUpperCase());
const clampPercent=value=>Math.max(0,Math.min(100,Number(value||0)));
const humanName=profile=>{
  const values=[
    profile?.certificateName,
    `${profile?.firstName||""} ${profile?.lastName||""}`.trim(),
    profile?.fullName,profile?.displayName,profile?.name
  ].map(value=>String(value||"").trim());
  return values.find(value=>value&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value))||"Learner";
};
const recordStatus=record=>normalize(record?.status||record?.verificationStatus);
const externalVerified=record=>["approved","verified"].includes(recordStatus(record));
const externalPending=record=>["pending","pending_review","submitted"].includes(recordStatus(record));
const progressComplete=record=>normalize(record?.status)==="completed"||clampPercent(record?.percent)>=100;
const certificateActive=record=>!["revoked","rejected","invalid"].includes(normalize(record?.status));
const courseLink=(courseId,external=false)=>external
  ? `course-details.html?id=${encodeURIComponent(courseId)}`
  : `course-player.html?id=${encodeURIComponent(courseId)}`;

function showAction(message,type=""){
  actionStatus.style.display="block";
  actionStatus.className=`notice ${type}`;
  actionStatus.textContent=message;
}

function credentialCard(item){
  const external=normalize(item.type)==="external-completion"||normalize(item.type)==="external-credential-verification"||Boolean(item.externalProvider)||Boolean(item._manualExternal);
  const title=item.courseTitle||item.awardTitle||item.programmeTitle||item.title||"Learning credential";
  const issuer=external?(item.externalProvider||item.provider||item.issuer||"External Provider"):(item.issuer||"SpeakOut / SpeakHub");
  const date=item.issueDate||item.issuedAt||item.completionDate||"";
  const id=item.certificateId||item.linkedCertificateId||(item._manualExternal?"":item.id||item.certificateNumber)||"";
  return `<article class="learning-item">
    <div class="learning-top">
      <div><h3>${safe(title)}</h3><p>${external?"External learning credential recorded through SpeakHub.":"SpeakHub-issued or managed learning credential."}</p></div>
      <span class="meta-chip verified">Verified record</span>
    </div>
    <div class="meta-row">
      <span class="meta-chip">${safe(issuer)}</span>
      ${date?`<span class="meta-chip">${safe(String(date).slice(0,10))}</span>`:""}
      ${external?'<span class="meta-chip external">External provider</span>':'<span class="meta-chip">SpeakHub</span>'}
    </div>
    ${id?`<div class="item-actions"><a class="btn soft" href="certificate-view.html?id=${encodeURIComponent(id)}">View credential</a></div>`:""}
  </article>`;
}

function learningCard(item){
  const external=item.kind==="external";
  const status=external?recordStatus(item.record):(progressComplete(item.record)?"completed":"in progress");
  const provider=external?(item.course.provider||item.record.provider||"External Provider"):"SpeakHub Academy";
  const title=item.course.title||item.record.courseTitle||"Learning pathway";
  const category=item.course.category||item.record.courseCategory||"";
  const pct=external?null:clampPercent(item.record.percent);
  const statusClass=(externalVerified(item.record)||progressComplete(item.record))?"verified":(externalPending(item.record)?"pending":"");
  return `<article class="learning-item">
    <div class="learning-top">
      <div><h3>${safe(title)}</h3><p>${external?"Learning delivered by the named external provider and tracked through SpeakHub.":"Guided learning delivered through SpeakHub Academy."}</p></div>
      <span class="meta-chip ${statusClass}">${safe(pretty(status||"started"))}</span>
    </div>
    <div class="meta-row">
      <span class="meta-chip">${safe(provider)}</span>
      ${category?`<span class="meta-chip">${safe(pretty(category))}</span>`:""}
      ${external?'<span class="meta-chip external">External pathway</span>':`<span class="meta-chip">${pct}% complete</span>`}
    </div>
    <div class="item-actions">
      <a class="btn soft" href="${safe(courseLink(item.course.id||item.record.courseId,external))}">${external?"View pathway":"Open course"}</a>
      ${external&&!externalVerified(item.record)&&!externalPending(item.record)?`<a class="btn primary" href="external-learning-submit.html?courseId=${encodeURIComponent(item.course.id||item.record.courseId)}">Submit completion</a>`:""}
    </div>
  </article>`;
}

function credentialKey(item={}){
  const issuer=normalize(item.externalProvider||item.provider||item.issuer);
  const title=normalize(item.courseTitle||item.awardTitle||item.title);
  const number=normalize(item.credentialNumber||item.certificateNumber);
  const date=String(item.issueDate||item.completionDate||"").slice(0,10);
  return number&&issuer?`number|${issuer}|${number}`:issuer&&title&&date?`title|${issuer}|${title}|${date}`:"";
}

function unifiedCredentialRecords(certificates=[],manual=[]){
  const canonical=certificates.filter(certificateActive);
  const canonicalIds=new Set(canonical.flatMap(item=>[item.id,item.certificateId].filter(Boolean)));
  const sourceCredentialIds=new Set(canonical.map(item=>item.sourceCredentialId).filter(Boolean));
  const keys=new Set(canonical.map(credentialKey).filter(Boolean));
  const legacyVerified=manual.filter(item=>externalVerified(item)).filter(item=>{
    if(sourceCredentialIds.has(item.id))return false;
    if(item.certificateId&&canonicalIds.has(item.certificateId))return false;
    if(item.linkedCertificateId&&canonicalIds.has(item.linkedCertificateId))return false;
    const key=credentialKey(item);
    return !key||!keys.has(key);
  }).map(item=>({...item,_manualExternal:true,type:"external-credential-verification"}));
  return [...canonical,...legacyVerified];
}

function providerRows(items){
  const counts=new Map();
  items.forEach(name=>{if(name)counts.set(name,(counts.get(name)||0)+1)});
  return [...counts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
}

function completedCourseIds(progress,external){
  const ids=new Set(progress.filter(progressComplete).map(item=>item.courseId).filter(Boolean));
  external.filter(externalVerified).forEach(item=>item.courseId&&ids.add(item.courseId));
  return ids;
}

function cvText(name,profile,completedCourses,credentials,providers,focus){
  const role=pretty(profile.role||"learner");
  const courseNames=completedCourses.map(item=>item.title).filter(Boolean).slice(0,8);
  const credentialNames=credentials.map(item=>item.courseTitle||item.awardTitle||item.title).filter(Boolean).filter((title,index,array)=>array.indexOf(title)===index).slice(0,8);
  const lines=[
    `${name} — SpeakHub Learning Portfolio`,
    `Role: ${role}`,
    profile.schoolName||profile.school||profile.institution?`School/Institution: ${profile.schoolName||profile.school||profile.institution}`:"",
    "",
    `Completed or verified learning: ${completedCourses.length}`,
    `Credentials recorded: ${credentials.length}`,
    providers.length?`Learning providers: ${providers.slice(0,6).join(", ")}`:"",
    focus.length?`Learning focus areas: ${focus.slice(0,8).map(pretty).join(", ")}`:"",
    courseNames.length?"":"No completed learning is recorded yet.",
    ...courseNames.map(title=>`• ${title}`),
    credentialNames.length?"Verified credentials:":"",
    ...credentialNames.map(title=>`• ${title}`),
    "",
    "External provider credentials remain issued by their original providers. SpeakHub records only reviewed learning evidence within its own portfolio."
  ].filter((line,index,array)=>line!==""||array[index-1]!=="");
  return lines.join("\n").trim();
}

async function loadPortfolio(user,profile){
  renderRoleNav(profile,"Portfolio");
  const name=humanName(profile);
  $("identityName").textContent=name;
  $("identityAvatar").textContent=name.split(/\s+/u).slice(0,2).map(part=>part[0]||"").join("").toUpperCase()||"L";
  const school=profile.schoolName||profile.school||profile.institution||"";
  $("identityMeta").textContent=[pretty(profile.role||"learner"),school].filter(Boolean).join(" • ");
  $("printName").textContent=`${name} — Learning Portfolio`;
  $("printMeta").textContent=[pretty(profile.role||"learner"),school,"SpeakHub Academy"].filter(Boolean).join(" • ");

  const [dashboardResult,catalogResult]=await Promise.allSettled([learningApi.dashboard(),SO.getAll("courses")]);
  if(dashboardResult.status!=="fulfilled")throw dashboardResult.reason;
  const dashboard=dashboardResult.value;
  const firestoreCourses=catalogResult.status==="fulfilled"?catalogResult.value:[];

  const courseById=new Map(PHASE2_VERIFIED_COURSES.map(course=>[course.id,{...course}]));
  firestoreCourses.forEach(course=>courseById.set(course.id,{...(courseById.get(course.id)||{}),...course}));

  const internal=(dashboard.progress||[]).map(record=>({
    kind:"internal",record,course:courseById.get(record.courseId)||{id:record.courseId,title:record.courseTitle||"SpeakHub Course"}
  }));
  const external=(dashboard.externalLearning||[]).map(record=>({
    kind:"external",record,course:courseById.get(record.courseId)||{id:record.courseId,title:record.courseTitle||"External Course",provider:record.provider,category:record.courseCategory}
  }));
  const manualCredentials=dashboard.externalCredentials||[];
  const credentials=unifiedCredentialRecords(dashboard.certificates||[],manualCredentials);

  const allLearning=[...internal,...external];
  const completedIds=completedCourseIds(dashboard.progress||[],dashboard.externalLearning||[]);
  const completedCourses=[...completedIds].map(id=>courseById.get(id)||allLearning.find(item=>(item.record.courseId===id))?.course).filter(Boolean);
  const focus=[...new Set(completedCourses.flatMap(course=>[
    course.category,
    ...(Array.isArray(course.tags)?course.tags:[])
  ]).filter(Boolean).map(normalize))].slice(0,16);
  const providerNames=[
    ...external.map(item=>item.course.provider||item.record.provider).filter(Boolean),
    ...credentials.map(item=>item.externalProvider||item.provider||item.issuer).filter(Boolean)
  ];
  const providers=providerRows(providerNames);

  $("learningCount").textContent=String(allLearning.length);
  $("completedCount").textContent=String(internal.filter(item=>progressComplete(item.record)).length+external.filter(item=>externalVerified(item.record)).length);
  $("credentialCount").textContent=String(credentials.length);
  $("providerCount").textContent=String(providers.length);

  credentialList.innerHTML=credentials.length
    ? credentials.map(credentialCard).join("")
    : '<div class="empty-state">No credentials have been recorded yet. Complete eligible learning to build this section.</div>';

  const sortedLearning=[...allLearning].sort((a,b)=>{
    const aDone=a.kind==="external"?externalVerified(a.record):progressComplete(a.record);
    const bDone=b.kind==="external"?externalVerified(b.record):progressComplete(b.record);
    return Number(bDone)-Number(aDone);
  });
  learningList.innerHTML=sortedLearning.length
    ? sortedLearning.map(learningCard).join("")
    : '<div class="empty-state">No learning records yet. Browse SpeakHub and start a course or external pathway.</div>';

  focusAreas.innerHTML=focus.length
    ? focus.map(item=>`<span class="focus-chip">${safe(pretty(item))}</span>`).join("")
    : '<div class="empty-state">Focus areas appear after you complete or verify learning.</div>';

  providerList.innerHTML=providers.length
    ? providers.map(([provider,count])=>`<div class="provider-row"><strong>${safe(provider)}</strong><span>${count} record${count===1?"":"s"}</span></div>`).join("")
    : '<div class="empty-state">External learning providers will appear here after you start a tracked pathway.</div>';

  portfolioSummary=cvText(name,profile,completedCourses,credentials,providers.map(([name])=>name),focus);
  cvSummary.textContent=portfolioSummary;

  statusBox.className="notice ok portfolio-status";
  statusBox.textContent=catalogResult.status==="fulfilled"
    ?"Portfolio ready. Only your signed-in account can view this page."
    :"Portfolio ready. Some course metadata could not be enriched, but your authoritative learning records are shown.";
}

$("copySummary").addEventListener("click",async()=>{
  try{await navigator.clipboard.writeText(portfolioSummary);showAction("CV summary copied.","ok")}
  catch{showAction("Copy is unavailable in this browser. Select the summary text manually.","warn")}
});
$("shareSummary").addEventListener("click",async()=>{
  try{
    if(navigator.share){
      await navigator.share({title:"My SpeakHub Learning Portfolio",text:portfolioSummary});
      showAction("Share sheet opened.","ok");
    }else{
      await navigator.clipboard.writeText(portfolioSummary);
      showAction("Sharing is not supported here, so the summary was copied instead.","ok");
    }
  }catch(error){
    if(error?.name!=="AbortError")showAction("The summary was not shared.","warn");
  }
});
$("printPortfolio").addEventListener("click",()=>window.print());

requireRoles(allowedRoles,async(user,profile)=>{
  try{await loadPortfolio(user,profile)}
  catch(error){
    console.error(error);
    statusBox.className="notice bad portfolio-status";
    statusBox.textContent=error.message||"Could not load your learning portfolio.";
  }
});
