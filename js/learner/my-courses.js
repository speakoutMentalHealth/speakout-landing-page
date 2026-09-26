import { SO } from "../../dashboard-shared.js";
import { isPublicCourse } from "../content-visibility.js";
import { learningApi } from "../platform-api.js";
import { PHASE2_VERIFIED_COURSES } from "../../phase2-verified-courses.js";
import { normalize, statusLabel } from "./ui-utils.js";
import { renderLearnerNav } from "./role-nav.js";
const isExternalCourse=c=>normalize(c.courseType)==="external"||normalize(c.completionMethod)==="certificate-upload";
const courseHref=c=>isExternalCourse(c)?`course-details.html?id=${encodeURIComponent(c.id)}`:`course-player.html?id=${encodeURIComponent(c.id)}`;
const externalStatus=record=>statusLabel(record?.status||record?.verificationStatus);
let courses=[];
async function load(){
  const [firestoreCatalog,dashboard]=await Promise.all([SO.getAll("courses"),learningApi.dashboard()]);
  const catalogById=new Map(PHASE2_VERIFIED_COURSES.filter(isPublicCourse).map(c=>[c.id,{...c}]));
  firestoreCatalog.filter(isPublicCourse).forEach(c=>catalogById.set(c.id,{...(catalogById.get(c.id)||{}),...c}));
  const byId=new Map((dashboard.progress||[]).map(p=>[p.courseId,p]));
  const externalById=new Map((dashboard.externalLearning||[]).map(record=>[record.courseId,record]));
  courses=[...catalogById.values()]
    .filter(c=>byId.has(c.id)||externalById.has(c.id))
    .map(c=>({...c,learnerProgress:byId.get(c.id)||null,externalLearning:externalById.get(c.id)||null}));
  total.textContent=SO.num(courses.length);
  digital.textContent=SO.num(courses.filter(c=>["digital-skills","coding","ai-data","cybersecurity"].includes(normalize(c.category))).length);
  leadership.textContent=SO.num(courses.filter(c=>["leadership","career"].includes(normalize(c.category))).length);
  category.innerHTML='<option value="all">All Categories</option>';
  [...new Set(courses.map(c=>c.category).filter(Boolean))].sort().forEach(c=>category.innerHTML+=`<option value="${SO.safe(c)}">${SO.safe(String(c).replaceAll("-"," "))}</option>`);
  render();
}
function render(){
  const q=search.value.toLowerCase();
  const out=courses.filter(c=>(category.value==="all"||c.category===category.value)&&`${c.title} ${c.category} ${c.level||c.difficulty} ${c.provider||""}`.toLowerCase().includes(q));
  cards.innerHTML=out.length?out.map(c=>{
    const external=isExternalCourse(c);
    const pct=Math.max(0,Math.min(100,Number(c.learnerProgress?.percent||0)));
    const status=external?externalStatus(c.externalLearning):`${pct}% complete`;
    const action=external?"View Pathway":(pct?"Continue Course":"Start Course");
    return `<article class="card">
      <div class="icon">${external?"🌐":"🎓"}</div>
      <span class="label">${SO.safe(String(c.category||"Course").replaceAll("-"," "))}</span>
      <h2>${SO.safe(c.title)}</h2>
      <p>${SO.safe(c.shortDescription||c.description)}</p>
      <p><strong>${SO.safe(c.provider||c.level||c.difficulty||"SpeakHub Academy")}</strong> • ${SO.safe(c.duration||"Self-paced")}</p>
      ${external
        ? `<div class="notice"><strong>External learning:</strong> ${SO.safe(status)}. The provider delivers the course; SpeakHub tracks your pathway and verification.</div>`
        : `<div class="progress-track" aria-label="${pct}% complete"><div class="progress-fill" style="width:${pct}%"></div></div><p><strong>${pct}% complete</strong></p>`}
      <a class="btn primary" href="${SO.safe(courseHref(c))}">${action}</a>
    </article>`;
  }).join(""):`<div class="notice"><h3>No enrolled courses found.</h3><p><a href="speakhub.html">Browse the catalogue</a> and start a SpeakHub course or external learning pathway.</p></div>`;
}
search.oninput=render;category.onchange=render;reset.onclick=()=>{search.value="";category.value="all";render()};SO.onAuthStateChanged(SO.auth,async user=>{if(!user)return;try{await renderLearnerNav(user,"Courses");await load()}catch(error){cards.innerHTML=`<div class="notice bad">${SO.safe(error.message||"Could not load your enrolled courses.")}</div>`}});
