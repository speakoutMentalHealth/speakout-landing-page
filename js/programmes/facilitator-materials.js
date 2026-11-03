import {requireRoles,renderRoleNav} from "../../launch-role-guard.js";
import {db} from "../../firebase-config.js";
import {collection,doc,getDoc,getDocs,query,where} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import {programmeMaterialsApi} from "../platform-api.js";
import {escapeHtml} from "../learner/ui-utils.js";

const $ = id => document.getElementById(id);
const qsId = new URLSearchParams(location.search).get("id") || "";
let account = null;
let profile = null;
let programmes = [];
let activeId = "";
let linkedSchoolId = "";
const status = (message, error = false) => {
  $("materialsStatus").textContent = message;
  $("materialsStatus").className = "material-note" + (error ? " error" : "");
};
const role = () => String(profile?.actualRole || profile?.role || "").toLowerCase();
const manager = () => ["super_admin", "admin", "school_admin", "school"].includes(role());
const superAdmin = () => ["super_admin", "admin"].includes(role());
const assigned = p => p.createdBy === account.uid ||
  (Array.isArray(p.facilitatorIds) && p.facilitatorIds.includes(account.uid));
const ownProgramme = p => Boolean(p && (superAdmin() ||
  ((p.schoolId === profile.schoolId || (profile.schoolCode && p.schoolCode === profile.schoolCode)) &&
    (manager() || (role() === "teacher" && assigned(p)))));
const allowedType = {
  "application/pdf":true,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":true,
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":true,
  "image/png":true,
  "image/jpeg":true
};
const fileName = value => String(value || "SpeakOut-Resource").replace(/[^A-Za-z0-9._-]/g,"-").slice(0,140);

function renderProgrammeSelect(){
  const select = $("programmeSelect");
  select.innerHTML = programmes.length
    ? programmes.map(item => '<option value="' + escapeHtml(item.id) + '">' +
        escapeHtml(item.name || "Programme") + '</option>').join("")
    : '<option value="">No linked programmes</option>';
  activeId = programmes.some(p => p.id === qsId) ? qsId : (programmes[0]?.id || "");
  select.value = activeId;
  $("publishPanel").hidden = !manager() || !activeId;
}

async function resolveSchoolId(){
  if (profile.schoolId) return profile.schoolId;
  if (!profile.schoolCode) return "";
  const snap = await getDocs(query(collection(db,"schools"),where("schoolCode","==",profile.schoolCode)));
  return snap.docs[0]?.id || "";
}

async function loadProgrammes(){
  programmes = [];
  const schoolId = await resolveSchoolId();
  if (schoolId){
    const snap = await getDocs(query(collection(db,"programmes"),where("schoolId","==",schoolId)));
    programmes = snap.docs.map(item => ({id:item.id,...item.data()})).filter(ownProgramme);
  }
  if (qsId && !programmes.some(item => item.id === qsId)){
    // Super admins can open a specific programme without changing their school context.
    if (superAdmin()){
      const snap = await getDoc(doc(db,"programmes",qsId));
      if (snap.exists()) programmes.push({id:snap.id,...snap.data()});
    }
  }
  programmes.sort((a,b) => String(a.name || "").localeCompare(String(b.name || "")));
  renderProgrammeSelect();
}

async function loadMaterials(){
  const list = $("materialsList");
  list.replaceChildren();
  if (!activeId){
    status("No programme is currently assigned to this account. Ask the school administrator to link your facilitator profile.");
    list.textContent = "Your materials will appear here once you are assigned to a programme.";
    return;
  }
  status("Loading the latest programme materials…");
  try{
    const result = await programmeMaterialsApi.list(activeId);
    const materials = Array.isArray(result.materials) ? result.materials : [];
    if (!materials.length){
      list.textContent = "No materials have been published for this programme yet.";
      status("Programme selected. Materials will appear here when your administrator publishes them.");
      return;
    }
    list.innerHTML = materials.map(item =>
      '<article class="material-card">' +
      '<h3>' + escapeHtml(item.title || "Programme resource") + '</h3>' +
      '<div class="meta">' + (item.week ? "Week " + Number(item.week) : "General guidance") +
      ' · ' + escapeHtml(item.fileName || "Downloadable file") + '</div>' +
      (item.note ? '<p>' + escapeHtml(item.note) + '</p>' : "") +
      '<div class="material-actions"><button type="button" class="material-btn" data-download="' +
      escapeHtml(item.id) + '">Download file</button>' +
      (manager() ? '<button type="button" class="material-btn secondary" data-archive="' +
        escapeHtml(item.id) + '">Archive</button>' : "") + '</div></article>'
    ).join("");
    // Resolve filenames from this authenticated response only.
    const byId = new Map(materials.map(item => [item.id,item]));
    list.querySelectorAll("[data-download]").forEach(button => button.addEventListener("click",async () => {
      button.disabled = true;
      const previous = button.textContent;
      button.textContent = "Downloading…";
      try{
        const item = byId.get(button.dataset.download);
        const blob = await programmeMaterialsApi.download(item.id);
        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = objectUrl;
        anchor.download = fileName(item.fileName);
        document.body.append(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(objectUrl),30000);
        status("Download started: " + item.title);
      }catch(error){
        status(error.message || "Download failed.",true);
      }finally{
        button.disabled = false;
        button.textContent = previous;
      }
    }));
    list.querySelectorAll("[data-archive]").forEach(button => button.addEventListener("click",async () => {
      if (!confirm("Archive this resource for all facilitators assigned to the programme?")) return;
      button.disabled = true;
      try {
        await programmeMaterialsApi.archive(button.dataset.archive);
        await loadMaterials();
        status("Material archived. It is no longer available for download.");
      }catch(error){
        status(error.message || "Could not archive resource.",true);
        button.disabled = false;
      }
    }));
    status(materials.length + " downloadable material" + (materials.length === 1 ? "" : "s") + " available for " + (result.programmeName || "this programme") + ".");
    if (result.truncated) status("Some resources are not shown. Contact your programme administrator.",true);
  }catch(error){
    console.error(error);
    status(error.message || "Unable to load materials.",true);
    list.textContent = "We could not retrieve the materials. Check your assignment and try refreshing.";
  }
}

$("programmeSelect").addEventListener("change", () => {
  activeId = $("programmeSelect").value;
  $("publishPanel").hidden = !manager() || !activeId;
  loadMaterials();
});
$("refreshButton").addEventListener("click",loadMaterials);
$("uploadForm").addEventListener("submit", async event => {
  event.preventDefault();
  if (!manager() || !activeId) return;
  const button = $("publishButton");
  const file = $("materialFile").files?.[0];
  if (!file || !allowedType[file.type] || !file.size || file.size > 10*1024*1024){
    status("Choose a PDF, DOCX, PPTX, JPG or PNG up to 10 MB.",true);
    return;
  }
  button.disabled = true;
  status("Uploading securely and publishing to assigned facilitators…");
  try{
    await programmeMaterialsApi.upload(file, {
      programmeId:activeId, title:$("materialTitle").value.trim(),
      week:$("materialWeek").value, note:$("materialNote").value.trim()
    });
    $("uploadForm").reset();
    await loadMaterials();
    status("Published. Assigned facilitators can now download this material from their account.");
  }catch(error){
    console.error(error);
    status(error.message || "Could not publish this material.",true);
  }finally{
    button.disabled = false;
  }
});

for(let week=1;week<=24;week++){
  const option = document.createElement("option");
  option.value = String(week);
  option.textContent = "Week " + week;
  $("materialWeek").append(option);
}

requireRoles(["teacher","school_admin","admin","super_admin"],async (user,data) => {
  account = user;
  profile = data;
  renderRoleNav(profile,"Programs");
  try {
    await loadProgrammes();
    await loadMaterials();
  }catch(error){
    console.error(error);
    status(error.message || "Could not load linked programmes.",true);
    $("materialsList").textContent = "Please confirm that your profile is approved and linked to the correct school.";
  }
});
