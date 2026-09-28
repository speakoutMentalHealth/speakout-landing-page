import { requireRoles, renderRoleNav } from "../../launch-role-guard.js";
import { db } from "../../firebase-config.js";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import { escapeHtml, normalize, prettyLabel as pretty, statusPill as pill } from "../learner/ui-utils.js";

let currentUser = null;
let profile = null;
let school = null;
let programmes = [];
let membershipIds = new Set();

const $ = id => document.getElementById(id);
const statusBox = $("statusBox");
const createPanel = $("createPanel");
const programmeList = $("programmeList");
const searchInput = $("searchInput");
const statusFilter = $("statusFilter");

function show(message,type){
  statusBox.textContent = message;
  statusBox.className = "program-note" + (type ? " " + type : "");
}

function role(){
  return normalize(profile && profile.role);
}

function isSchoolAdmin(){
  return ["school_admin","school","admin","super_admin"].includes(role());
}

function isTeacher(){
  return role() === "teacher";
}

function isStudent(){
  return role() === "student";
}

function sameSchoolProgramme(item){
  if(!school) return false;
  return item.schoolId === school.id ||
    (school.schoolCode && item.schoolCode === school.schoolCode);
}

function membershipId(programmeId,userId){
  return programmeId + "__" + userId;
}

async function resolveSchool(){
  if(profile.schoolId){
    const snap = await getDoc(doc(db,"schools",profile.schoolId));
    if(snap.exists()) return { id:snap.id, ...snap.data() };
  }
  if(profile.schoolCode){
    const snap = await getDocs(query(collection(db,"schools"),where("schoolCode","==",profile.schoolCode)));
    if(!snap.empty) return { id:snap.docs[0].id, ...snap.docs[0].data() };
  }
  return null;
}

async function loadMemberships(){
  membershipIds = new Set();
  if(!isStudent()) return;
  for(const item of programmes.filter(p => normalize(p.status) === "active")){
    try{
      const id = membershipId(item.id,currentUser.uid);
      const snap = await getDoc(doc(db,"programmeMemberships",id));
      if(snap.exists() && normalize(snap.data().status || "active") !== "inactive"){
        membershipIds.add(item.id);
      }
    }catch(error){
      console.warn("Membership lookup failed",item.id,error);
    }
  }
}

function statusActions(item){
  if(!isSchoolAdmin()) return "";
  const status = normalize(item.status);
  let buttons = "";
  if(status !== "active"){
    buttons += '<button class="program-btn primary" data-status-id="' + escapeHtml(item.id) + '" data-next-status="active">Approve / Activate</button>';
  }
  if(status === "active"){
    buttons += '<button class="program-btn gold" data-status-id="' + escapeHtml(item.id) + '" data-next-status="suspended">Suspend</button>';
  }
  if(status !== "archived"){
    buttons += '<button class="program-btn soft" data-status-id="' + escapeHtml(item.id) + '" data-next-status="archived">Archive</button>';
  }
  return buttons;
}

function studentAction(item){
  if(!isStudent() || normalize(item.status) !== "active") return "";
  if(membershipIds.has(item.id)){
    return '<span class="program-pill active">Joined</span>';
  }
  const mode = normalize(item.membershipMode);
  if(["open","voluntary"].includes(mode)){
    return '<button class="program-btn primary" data-join-id="' + escapeHtml(item.id) + '">Join programme</button>';
  }
  return '<span class="program-pill">Membership managed by school</span>';
}

function render(){
  const q = normalize(searchInput.value);
  const filter = normalize(statusFilter.value || "all");
  const filtered = programmes.filter(item => {
    const haystack = normalize([item.name,item.category,item.type,item.description].join(" "));
    const matchesSearch = !q || haystack.includes(q);
    const matchesStatus = filter === "all" || normalize(item.status) === filter;
    return matchesSearch && matchesStatus;
  });

  $("activeCount").textContent = programmes.filter(p => normalize(p.status) === "active").length;
  $("pendingCount").textContent = programmes.filter(p => normalize(p.status) === "pending_approval").length;
  $("myCount").textContent = programmes.filter(p =>
    p.createdBy === currentUser.uid ||
    (Array.isArray(p.facilitatorIds) && p.facilitatorIds.includes(currentUser.uid))
  ).length;
  $("membershipCount").textContent = membershipIds.size;

  if(!filtered.length){
    programmeList.innerHTML = '<div class="program-empty">No programmes match this view yet.</div>';
    return;
  }

  programmeList.innerHTML = filtered.map(item => {
    const programmeStatus = normalize(item.status || "pending_approval");
    const manageLabel = isStudent() ? "Open programme" : "Open workspace";
    return '<article class="program-item">' +
      '<div class="program-item-head"><div>' +
      '<h3>' + escapeHtml(item.name || "Programme") + '</h3>' +
      '<p>' + escapeHtml(item.description || "No description yet.") + '</p>' +
      '<div class="program-meta">' +
      pill(programmeStatus) +
      '<span class="program-pill">' + escapeHtml(pretty(item.type || "programme")) + '</span>' +
      '<span class="program-pill">' + escapeHtml(item.category || "General") + '</span>' +
      '<span class="program-pill">' + escapeHtml(pretty(item.source || "school")) + '</span>' +
      ((isTeacher() || isSchoolAdmin()) ? '<span class="program-pill">Parent: ' + escapeHtml(pretty(item.parentVisibility || "progress")) + '</span>' : '') +
      '</div></div>' +
      '<div class="program-actions">' + studentAction(item) + '</div></div>' +
      '<div class="program-meta">' +
      (item.scheduleDay ? '<span class="program-pill">' + escapeHtml(item.scheduleDay) + '</span>' : '') +
      (item.scheduleTime ? '<span class="program-pill">' + escapeHtml(item.scheduleTime) + '</span>' : '') +
      (item.frequency ? '<span class="program-pill">' + escapeHtml(item.frequency) + '</span>' : '') +
      (item.venue ? '<span class="program-pill">' + escapeHtml(item.venue) + '</span>' : '') +
      '</div>' +
      '<div class="program-actions">' +
      '<a class="program-btn dark" href="programme-workspace.html?id=' + encodeURIComponent(item.id) + '">' + manageLabel + '</a>' +
      statusActions(item) +
      '</div></article>';
  }).join("");

  document.querySelectorAll("[data-status-id]").forEach(button => {
    button.addEventListener("click",async () => {
      button.disabled = true;
      try{
        const nextStatus = button.dataset.nextStatus;
        const payload = {
          status:nextStatus,
          updatedAt:serverTimestamp()
        };
        if(nextStatus === "active"){
          payload.approvedBy = currentUser.uid;
          payload.approvedAt = serverTimestamp();
        }
        await updateDoc(doc(db,"programmes",button.dataset.statusId),payload);
        show("Programme status updated.","ok");
        await loadProgrammes();
      }catch(error){
        console.error(error);
        show(error.message || "Could not update programme.","bad");
      }finally{
        button.disabled = false;
      }
    });
  });

  document.querySelectorAll("[data-join-id]").forEach(button => {
    button.addEventListener("click",async () => {
      button.disabled = true;
      try{
        const programmeId = button.dataset.joinId;
        await setDoc(doc(db,"programmeMemberships",membershipId(programmeId,currentUser.uid)),{
          programmeId,
          schoolId:school.id,
          schoolCode:school.schoolCode || "",
          userId:currentUser.uid,
          role:"student",
          status:"active",
          joinedBy:currentUser.uid,
          joinedAt:serverTimestamp(),
          updatedAt:serverTimestamp()
        });
        show("You joined the programme.","ok");
        await loadMemberships();
        render();
      }catch(error){
        console.error(error);
        show(error.message || "Could not join this programme.","bad");
      }finally{
        button.disabled = false;
      }
    });
  });
}

async function loadProgrammes(){
  if(!school) return;
  let snap = isStudent()
    ? await getDocs(query(collection(db,"programmes"),where("schoolId","==",school.id),where("status","==","active")))
    : await getDocs(query(collection(db,"programmes"),where("schoolId","==",school.id)));
  programmes = snap.docs.map(document => ({ id:document.id, ...document.data() })).filter(sameSchoolProgramme);
  programmes.sort((a,b) => String(a.name || "").localeCompare(String(b.name || "")));
  await loadMemberships();
  render();
}

$("programmeForm").addEventListener("submit",async event => {
  event.preventDefault();
  if(!isTeacher() && !isSchoolAdmin()) return;

  const button = $("createButton");
  button.disabled = true;
  try{
    const teacherCreated = isTeacher();
    const payload = {
      name:$("programmeName").value.trim(),
      type:$("programmeType").value,
      category:$("category").value.trim(),
      source:$("programmeSource").value,
      description:$("description").value.trim(),
      objectives:$("objectives").value.trim(),
      expectedOutcomes:$("expectedOutcomes").value.trim(),
      scheduleDay:$("scheduleDay").value.trim(),
      scheduleTime:$("scheduleTime").value.trim(),
      frequency:$("frequency").value.trim(),
      venue:$("venue").value.trim(),
      membershipMode:$("membershipMode").value,
      parentVisibility:$("parentVisibility").value || "progress",
      schoolId:school.id,
      schoolCode:school.schoolCode || "",
      schoolName:school.schoolName || school.name || "",
      createdBy:currentUser.uid,
      createdByRole:role(),
      createdByName:profile.fullName || [profile.firstName,profile.lastName].filter(Boolean).join(" ") || currentUser.email || "Teacher",
      facilitatorIds:teacherCreated ? [currentUser.uid] : [],
      status:teacherCreated ? "pending_approval" : "active",
      approvedBy:teacherCreated ? "" : currentUser.uid,
      approvedAt:teacherCreated ? null : serverTimestamp(),
      createdAt:serverTimestamp(),
      updatedAt:serverTimestamp()
    };
    if(!payload.name || !payload.type || !payload.category || !payload.description){
      throw new Error("Name, type, category and description are required.");
    }
    await addDoc(collection(db,"programmes"),payload);
    event.target.reset();
    show(teacherCreated ? "Programme submitted for school approval." : "Programme created and activated.","ok");
    await loadProgrammes();
  }catch(error){
    console.error(error);
    show(error.message || "Could not create programme.","bad");
  }finally{
    button.disabled = false;
  }
});

searchInput.addEventListener("input",render);
statusFilter.addEventListener("change",render);

requireRoles(["student","teacher","school_admin"],async (user,data) => {
  currentUser = user;
  profile = data;
  renderRoleNav(profile,"Programs");
  school = await resolveSchool();
  if(!school){
    show("Your account is not linked to an approved school.","bad");
    return;
  }
  $("schoolPills").innerHTML =
    pill(school.schoolCode || "School") +
    pill(profile.role || "member");
  createPanel.classList.toggle("hidden",!(isTeacher() || isSchoolAdmin()));
  show("Loading school programmes...");
  await loadProgrammes();
  show("Programmes loaded.","ok");
});