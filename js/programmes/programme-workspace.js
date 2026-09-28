import { requireRoles, renderRoleNav } from "../../launch-role-guard.js";
import { db } from "../../firebase-config.js";
import { roleApi } from "../platform-api.js";
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
  writeBatch,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import { escapeHtml, normalize, prettyLabel as pretty, statusPill as pill, formatDisplayDate as formatDate } from "../learner/ui-utils.js";

const $ = id => document.getElementById(id);
const programmeId = new URLSearchParams(location.search).get("id") || "";

let currentUser = null;
let profile = null;
let programme = null;
let roster = [];
let rosterMap = new Map();
let members = [];
let sessions = [];
let assignments = [];
let submissions = [];
let attendance = [];
let ownMembership = null;

function show(message,type){
  $("statusBox").textContent = message;
  $("statusBox").className = "program-note" + (type ? " " + type : "");
}

function currentRole(){
  return normalize(profile && profile.role);
}

function isSchoolAdmin(){
  return ["school_admin","school","admin","super_admin"].includes(currentRole());
}

function isTeacher(){
  return currentRole() === "teacher";
}

function isStudent(){
  return currentRole() === "student";
}

function sameSchool(){
  if(!profile || !programme) return false;
  if(profile.schoolId && programme.schoolId === profile.schoolId) return true;
  return Boolean(profile.schoolCode && programme.schoolCode === profile.schoolCode);
}

function isFacilitator(){
  return isTeacher() && (
    programme.createdBy === currentUser.uid ||
    (Array.isArray(programme.facilitatorIds) && programme.facilitatorIds.includes(currentUser.uid))
  );
}

function canManage(){
  return isSchoolAdmin() || isFacilitator();
}

function memberDocId(userId){
  return programmeId + "__" + userId;
}

function attendanceDocId(sessionId,userId){
  return sessionId + "__" + userId;
}

function submissionDocId(assignmentId,userId){
  return assignmentId + "__" + userId;
}

function userName(userId){
  const item = rosterMap.get(userId);
  if(item){
    return item.fullName || [item.firstName,item.lastName].filter(Boolean).join(" ") || item.studentId || userId;
  }
  const member = members.find(x => x.userId === userId);
  return member && member.displayName ? member.displayName : userId;
}

function safeUrl(value){
  const raw = String(value || "").trim();
  if(!raw) return "";
  try{
    const parsed = new URL(raw);
    return parsed.protocol === "https:" ? parsed.toString() : "";
  }catch{
    return "";
  }
}

async function loadProgramme(){
  if(!programmeId) throw new Error("Programme identifier is missing.");
  const snap = await getDoc(doc(db,"programmes",programmeId));
  if(!snap.exists()) throw new Error("Programme not found.");
  programme = { id:snap.id, ...snap.data() };
  if(!sameSchool()) throw new Error("This programme is not linked to your school.");
}

async function loadRoster(){
  roster = [];
  rosterMap = new Map();
  if(!canManage()) return;
  try{
    const overview = await roleApi.overview();
    roster = (overview.subjects || []).filter(item => {
      if(!sameSchool()) return false;
      return ["student","teacher"].includes(normalize(item.role));
    });
    roster.forEach(item => rosterMap.set(item.id,item));
  }catch(error){
    console.warn("Roster load failed",error);
  }
}

async function loadMemberships(){
  members = [];
  ownMembership = null;
  if(isStudent()){
    const snap = await getDoc(doc(db,"programmeMemberships",memberDocId(currentUser.uid)));
    if(snap.exists()){
      ownMembership = { id:snap.id, ...snap.data() };
      if(normalize(ownMembership.status || "active") !== "inactive") members = [ownMembership];
    }
    return;
  }
  if(canManage()){
    const snap = await getDocs(query(collection(db,"programmeMemberships"),where("programmeId","==",programmeId)));
    members = snap.docs.map(document => ({ id:document.id, ...document.data() }))
      .filter(item => normalize(item.status || "active") !== "inactive");
  }
}

async function loadSessions(){
  sessions = [];
  if(isStudent() && !ownMembership) return;
  try{
    const snap = await getDocs(query(collection(db,"programmeSessions"),where("programmeId","==",programmeId)));
    sessions = snap.docs.map(document => ({ id:document.id, ...document.data() }));
    sessions.sort((a,b) => String(b.sessionDate || "").localeCompare(String(a.sessionDate || "")));
  }catch(error){
    console.warn("Session load failed",error);
  }
}

async function loadAssignments(){
  assignments = [];
  if(isStudent() && !ownMembership) return;
  try{
    const snap = await getDocs(query(collection(db,"programmeAssignments"),where("programmeId","==",programmeId)));
    assignments = snap.docs.map(document => ({ id:document.id, ...document.data() }));
    assignments.sort((a,b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  }catch(error){
    console.warn("Assignment load failed",error);
  }
}

async function loadAttendance(){
  attendance = [];
  if(!canManage()) return;
  try{
    const snap = await getDocs(query(collection(db,"programmeAttendance"),where("programmeId","==",programmeId)));
    attendance = snap.docs.map(document => ({ id:document.id, ...document.data() }));
  }catch(error){
    console.warn("Attendance load failed",error);
  }
}

async function loadSubmissions(){
  submissions = [];
  if(isStudent()){
    if(!ownMembership) return;
    for(const assignment of assignments){
      try{
        const snap = await getDoc(doc(db,"programmeSubmissions",submissionDocId(assignment.id,currentUser.uid)));
        if(snap.exists()) submissions.push({ id:snap.id, ...snap.data() });
      }catch(error){
        console.warn("Submission load failed",assignment.id,error);
      }
    }
    return;
  }
  if(canManage()){
    try{
      const snap = await getDocs(query(collection(db,"programmeSubmissions"),where("programmeId","==",programmeId)));
      submissions = snap.docs.map(document => ({ id:document.id, ...document.data() }));
    }catch(error){
      console.warn("Submission list failed",error);
    }
  }
}

function renderHeader(){
  $("programmeTypeLabel").textContent = pretty(programme.type || "Programme");
  $("programmeTitle").textContent = programme.name || "Programme";
  $("programmeDescription").textContent = programme.description || "No description yet.";
  $("programmePills").innerHTML =
    pill(programme.status || "pending_approval") +
    '<span class="program-pill">' + escapeHtml(programme.category || "General") + '</span>' +
    '<span class="program-pill">' + escapeHtml(pretty(programme.source || "school")) + '</span>';
  $("objectivesText").textContent = programme.objectives || "Not specified yet.";
  $("outcomesText").textContent = programme.expectedOutcomes || "Not specified yet.";
  $("scheduleMeta").innerHTML = [
    programme.scheduleDay,
    programme.scheduleTime,
    programme.frequency,
    programme.venue
  ].filter(Boolean).map(value => '<span class="program-pill">' + escapeHtml(value) + '</span>').join("") || '<span class="program-pill">Schedule to be confirmed</span>';
  $("membershipMeta").innerHTML =
    '<span class="program-pill">' + escapeHtml(pretty(programme.membershipMode || "voluntary")) + '</span>';
}

function renderStats(){
  $("memberCount").textContent = canManage() ? members.length : (ownMembership ? "1" : "0");
  $("sessionCount").textContent = sessions.length;
  $("assignmentCount").textContent = assignments.length;
  $("completedCount").textContent = submissions.filter(item => normalize(item.status) === "completed").length;
}

function renderFacilitators(){
  const panel = $("facilitatorPanel");
  panel.classList.toggle("hidden",!isSchoolAdmin());
  if(!isSchoolAdmin()) return;

  const teachers = roster.filter(item => normalize(item.role) === "teacher");
  $("facilitatorSelect").innerHTML =
    '<option value="">Select teacher / facilitator</option>' +
    teachers.map(item => '<option value="' + escapeHtml(item.id) + '">' + escapeHtml(userName(item.id)) + '</option>').join("");

  const ids = Array.isArray(programme.facilitatorIds) ? programme.facilitatorIds : [];
  $("facilitatorList").innerHTML = ids.length
    ? ids.map(id => '<div class="program-item"><strong>' + escapeHtml(userName(id)) + '</strong><div class="program-meta"><span class="program-pill">Teacher / Facilitator</span></div></div>').join("")
    : '<div class="program-empty">No facilitator assigned yet.</div>';
}

function renderMembers(){
  const panel = $("memberPanel");
  panel.classList.toggle("hidden",!canManage());
  if(!canManage()) return;

  const students = roster.filter(item => normalize(item.role) === "student");
  const currentIds = new Set(members.map(item => item.userId));
  $("studentSelect").innerHTML =
    '<option value="">Select student</option>' +
    students.filter(item => !currentIds.has(item.id))
      .map(item => '<option value="' + escapeHtml(item.id) + '">' + escapeHtml(userName(item.id)) + (item.classLevel ? " • " + escapeHtml(item.classLevel) : "") + '</option>')
      .join("");

  $("memberList").innerHTML = members.length
    ? members.map(item => '<div class="program-item"><strong>' + escapeHtml(userName(item.userId)) + '</strong><div class="program-meta">' + pill(item.status || "active") + '</div></div>').join("")
    : '<div class="program-empty">No students added yet.</div>';

  $("attendancePicker").innerHTML = members.length
    ? '<p><b>Attendance</b> — tick students who were present.</p>' +
      members.map(item => '<label style="display:block;margin:7px 0"><input type="checkbox" name="attendanceStudent" value="' + escapeHtml(item.userId) + '"> ' + escapeHtml(userName(item.userId)) + '</label>').join("")
    : '<div class="program-note">Add students before recording attendance.</div>';

  $("onBehalfStudent").innerHTML =
    '<option value="">Select student</option>' +
    members.map(item => '<option value="' + escapeHtml(item.userId) + '">' + escapeHtml(userName(item.userId)) + '</option>').join("");
}

function renderSessions(){
  $("sessionCreatePanel").classList.toggle("hidden",!canManage());
  $("sessionList").innerHTML = sessions.length
    ? sessions.map(item => {
        const present = attendance.filter(record => record.sessionId === item.id && normalize(record.status) === "present").length;
        const count = canManage() ? present : Number(item.attendanceCount || 0);
        return '<article class="program-item"><div class="program-item-head"><div><h3>' +
          escapeHtml(item.topic || "Session") + '</h3><p>' +
          escapeHtml(item.activitySummary || "") + '</p></div>' +
          pill(item.status || "completed") + '</div><div class="program-meta">' +
          '<span class="program-pill">' + escapeHtml(item.sessionDate || "Date not set") + '</span>' +
          '<span class="program-pill">' + count + ' attended</span>' +
          (item.learningObjective ? '<span class="program-pill">' + escapeHtml(item.learningObjective) + '</span>' : '') +
          '</div>' +
          (canManage() && item.challenges ? '<p><b>Challenges:</b> ' + escapeHtml(item.challenges) + '</p>' : '') +
          (item.nextSteps ? '<p><b>Next:</b> ' + escapeHtml(item.nextSteps) + '</p>' : '') +
          '</article>';
      }).join("")
    : '<div class="program-empty">No sessions recorded yet.</div>';
}

function methodsFor(assignment){
  const list = Array.isArray(assignment.allowedSubmissionMethods) && assignment.allowedSubmissionMethods.length
    ? assignment.allowedSubmissionMethods
    : ["digital_text","evidence_link","paper","practical","oral"];
  return list;
}

function submissionFor(assignmentId){
  return submissions.find(item => item.assignmentId === assignmentId && item.studentId === currentUser.uid);
}

function renderAssignments(){
  $("assignmentCreatePanel").classList.toggle("hidden",!canManage());
  $("onBehalfPanel").classList.toggle("hidden",!canManage());

  $("onBehalfAssignment").innerHTML =
    '<option value="">Select assignment / project</option>' +
    assignments.filter(item => normalize(item.status || "active") === "active")
      .map(item => '<option value="' + escapeHtml(item.id) + '">' + escapeHtml(item.title || "Assignment") + '</option>').join("");

  if(!assignments.length){
    $("assignmentList").innerHTML = '<div class="program-empty">No assignments or projects yet.</div>';
    return;
  }

  $("assignmentList").innerHTML = assignments.map(item => {
    const methods = methodsFor(item);
    let studentArea = "";
    if(isStudent() && ownMembership){
      const existing = submissionFor(item.id);
      const status = existing ? normalize(existing.status || "submitted") : "";
      const locked = status === "completed" || status === "submitted" || status === "reviewed";
      const options = methods.map(method =>
        '<option value="' + escapeHtml(method) + '"' +
        (existing && normalize(existing.submissionMethod) === normalize(method) ? " selected" : "") +
        '>' + escapeHtml(pretty(method)) + '</option>'
      ).join("");
      studentArea =
        '<form class="program-form student-submission-form" data-assignment-id="' + escapeHtml(item.id) + '" style="margin-top:12px">' +
        '<select name="method" required' + (locked ? " disabled" : "") + '>' + options + '</select>' +
        '<input name="evidence" placeholder="HTTPS evidence link (optional)" value="' + escapeHtml(existing && existing.evidenceUrl || "") + '"' + (locked ? " disabled" : "") + '>' +
        '<textarea class="full" name="response" placeholder="Your response / project note"' + (locked ? " disabled" : "") + '>' + escapeHtml(existing && existing.responseText || "") + '</textarea>' +
        (existing ? '<div class="full program-meta">' + pill(status) + (existing.feedback ? '<span class="program-pill">Feedback: ' + escapeHtml(existing.feedback) + '</span>' : '') + '</div>' : '') +
        (!locked || status === "revision_required" ? '<button class="program-btn primary full" type="submit">' + (existing ? "Resubmit work" : "Submit work") + '</button>' : '') +
        '</form>';
    }
    return '<article class="program-item"><div class="program-item-head"><div><h3>' +
      escapeHtml(item.title || "Assignment") + '</h3><p>' +
      escapeHtml(item.instructions || "") + '</p></div>' +
      pill(item.status || "active") + '</div>' +
      '<div class="program-meta">' +
      (item.dueDate ? '<span class="program-pill">Due ' + escapeHtml(item.dueDate) + '</span>' : '') +
      methods.map(method => '<span class="program-pill">' + escapeHtml(pretty(method)) + '</span>').join("") +
      '</div>' + studentArea + '</article>';
  }).join("");

  document.querySelectorAll(".student-submission-form").forEach(form => {
    form.addEventListener("submit",submitStudentWork);
  });
}

function renderSubmissions(){
  if(isStudent()){
    $("submissionList").innerHTML = submissions.length
      ? submissions.map(item => '<article class="program-item"><div class="program-item-head"><div><h3>' +
          escapeHtml(assignments.find(a => a.id === item.assignmentId)?.title || "Submission") + '</h3><p>' +
          escapeHtml(item.responseText || "Work recorded.") + '</p></div>' + pill(item.status || "submitted") +
          '</div><div class="program-meta"><span class="program-pill">' + escapeHtml(pretty(item.submissionMethod || "digital")) + '</span>' +
          (item.submittedOnBehalf ? '<span class="program-pill">Recorded by facilitator</span>' : '<span class="program-pill">Submitted by student</span>') +
          '</div>' +
          (item.feedback ? '<p><b>Facilitator feedback:</b> ' + escapeHtml(item.feedback) + '</p>' : '') +
          (safeUrl(item.evidenceUrl) ? '<a class="program-btn soft" target="_blank" rel="noopener noreferrer" href="' + escapeHtml(safeUrl(item.evidenceUrl)) + '">Open evidence</a>' : '') +
          '</article>').join("")
      : '<div class="program-empty">No submissions yet.</div>';
    return;
  }

  if(!canManage()){
    $("submissionList").innerHTML = '<div class="program-empty">Submission review is available to assigned facilitators and school administrators.</div>';
    return;
  }

  $("submissionList").innerHTML = submissions.length
    ? submissions.map(item => {
        const assignment = assignments.find(a => a.id === item.assignmentId);
        return '<article class="program-item"><div class="program-item-head"><div><h3>' +
          escapeHtml(userName(item.studentId)) + ' • ' + escapeHtml(assignment && assignment.title || "Assignment") +
          '</h3><p>' + escapeHtml(item.responseText || "Work recorded without a text response.") + '</p></div>' +
          pill(item.status || "submitted") + '</div>' +
          '<div class="program-meta"><span class="program-pill">' + escapeHtml(pretty(item.submissionMethod || "digital")) + '</span>' +
          (item.submittedOnBehalf ? '<span class="program-pill">Facilitator-recorded</span>' : '<span class="program-pill">Student-submitted</span>') +
          '</div>' +
          (safeUrl(item.evidenceUrl) ? '<a class="program-btn soft" target="_blank" rel="noopener noreferrer" href="' + escapeHtml(safeUrl(item.evidenceUrl)) + '">Open evidence</a>' : '') +
          '<div class="program-form" style="margin-top:12px"><input class="full" data-feedback="' + escapeHtml(item.id) + '" placeholder="Feedback" value="' + escapeHtml(item.feedback || "") + '">' +
          '<button class="program-btn primary" data-review="' + escapeHtml(item.id) + '" data-review-status="completed" type="button">Mark completed</button>' +
          '<button class="program-btn gold" data-review="' + escapeHtml(item.id) + '" data-review-status="revision_required" type="button">Request revision</button></div>' +
          '</article>';
      }).join("")
    : '<div class="program-empty">No student submissions yet.</div>';

  document.querySelectorAll("[data-review]").forEach(button => {
    button.addEventListener("click",async () => {
      const id = button.dataset.review;
      const feedback = document.querySelector('[data-feedback="' + CSS.escape(id) + '"]').value.trim();
      button.disabled = true;
      try{
        await updateDoc(doc(db,"programmeSubmissions",id),{
          status:button.dataset.reviewStatus,
          feedback,
          reviewedBy:currentUser.uid,
          reviewedAt:serverTimestamp(),
          updatedAt:serverTimestamp()
        });
        show("Submission review saved.","ok");
        await refreshData();
      }catch(error){
        console.error(error);
        show(error.message || "Could not review submission.","bad");
      }finally{
        button.disabled = false;
      }
    });
  });
}

function renderAll(){
  renderHeader();
  renderStats();
  renderFacilitators();
  renderMembers();
  renderSessions();
  renderAssignments();
  renderSubmissions();
}

async function submitStudentWork(event){
  event.preventDefault();
  const form = event.currentTarget;
  const assignmentId = form.dataset.assignmentId;
  const method = form.elements.method.value;
  const responseText = form.elements.response.value.trim();
  const evidenceUrl = safeUrl(form.elements.evidence.value);
  if(form.elements.evidence.value.trim() && !evidenceUrl){
    show("Evidence links must use HTTPS.","bad");
    return;
  }
  const button = form.querySelector("button[type=submit]");
  button.disabled = true;
  try{
    await setDoc(doc(db,"programmeSubmissions",submissionDocId(assignmentId,currentUser.uid)),{
      assignmentId,
      programmeId,
      schoolId:programme.schoolId,
      schoolCode:programme.schoolCode || "",
      studentId:currentUser.uid,
      submittedBy:currentUser.uid,
      submittedOnBehalf:false,
      submissionMethod:method,
      responseText,
      evidenceUrl,
      status:"submitted",
      feedback:"",
      reviewedBy:"",
      reviewedAt:null,
      submittedAt:serverTimestamp(),
      updatedAt:serverTimestamp()
    },{ merge:true });
    show("Work submitted.","ok");
    await refreshData();
  }catch(error){
    console.error(error);
    show(error.message || "Could not submit work.","bad");
  }finally{
    button.disabled = false;
  }
}

$("facilitatorForm").addEventListener("submit",async event => {
  event.preventDefault();
  if(!isSchoolAdmin()) return;
  const selected = $("facilitatorSelect").value;
  if(!selected) return;
  const ids = Array.from(new Set([...(Array.isArray(programme.facilitatorIds) ? programme.facilitatorIds : []),selected]));
  try{
    await updateDoc(doc(db,"programmes",programmeId),{
      facilitatorIds:ids,
      updatedAt:serverTimestamp()
    });
    programme.facilitatorIds = ids;
    show("Facilitator added.","ok");
    renderFacilitators();
  }catch(error){
    console.error(error);
    show(error.message || "Could not add facilitator.","bad");
  }
});

$("memberForm").addEventListener("submit",async event => {
  event.preventDefault();
  if(!canManage()) return;
  const studentId = $("studentSelect").value;
  const student = rosterMap.get(studentId);
  if(!student) return;
  try{
    await setDoc(doc(db,"programmeMemberships",memberDocId(studentId)),{
      programmeId,
      schoolId:programme.schoolId,
      schoolCode:programme.schoolCode || "",
      userId:studentId,
      role:"student",
      status:"active",
      displayName:userName(studentId),
      classLevel:student.classLevel || "",
      joinedBy:currentUser.uid,
      joinedAt:serverTimestamp(),
      updatedAt:serverTimestamp()
    },{ merge:true });
    show("Student added to programme.","ok");
    await refreshData();
  }catch(error){
    console.error(error);
    show(error.message || "Could not add student.","bad");
  }
});

$("sessionForm").addEventListener("submit",async event => {
  event.preventDefault();
  if(!canManage()) return;
  const presentIds = Array.from(document.querySelectorAll('input[name="attendanceStudent"]:checked')).map(input => input.value);
  try{
    const created = await addDoc(collection(db,"programmeSessions"),{
      programmeId,
      schoolId:programme.schoolId,
      schoolCode:programme.schoolCode || "",
      sessionDate:$("sessionDate").value,
      topic:$("sessionTopic").value.trim(),
      learningObjective:$("learningObjective").value.trim(),
      activitySummary:$("activitySummary").value.trim(),
      challenges:$("sessionChallenges").value.trim(),
      nextSteps:$("sessionNextSteps").value.trim(),
      attendanceCount:presentIds.length,
      facilitatorId:currentUser.uid,
      facilitatorName:profile.fullName || [profile.firstName,profile.lastName].filter(Boolean).join(" ") || currentUser.email || "Facilitator",
      status:"completed",
      createdAt:serverTimestamp(),
      updatedAt:serverTimestamp()
    });

    if(presentIds.length){
      const batch = writeBatch(db);
      presentIds.forEach(studentId => {
        batch.set(doc(db,"programmeAttendance",attendanceDocId(created.id,studentId)),{
          programmeId,
          sessionId:created.id,
          schoolId:programme.schoolId,
          studentId,
          status:"present",
          recordedBy:currentUser.uid,
          recordedAt:serverTimestamp()
        });
      });
      await batch.commit();
    }

    event.target.reset();
    show("Session report and attendance saved.","ok");
    await refreshData();
  }catch(error){
    console.error(error);
    show(error.message || "Could not save session report.","bad");
  }
});

$("assignmentForm").addEventListener("submit",async event => {
  event.preventDefault();
  if(!canManage()) return;
  const methods = Array.from(document.querySelectorAll('input[name="submissionMethod"]:checked')).map(input => input.value);
  try{
    await addDoc(collection(db,"programmeAssignments"),{
      programmeId,
      schoolId:programme.schoolId,
      schoolCode:programme.schoolCode || "",
      title:$("assignmentTitle").value.trim(),
      dueDate:$("assignmentDueDate").value,
      instructions:$("assignmentInstructions").value.trim(),
      allowedSubmissionMethods:methods.length ? methods : ["digital_text"],
      status:"active",
      createdBy:currentUser.uid,
      createdAt:serverTimestamp(),
      updatedAt:serverTimestamp()
    });
    event.target.reset();
    show("Assignment published.","ok");
    await refreshData();
  }catch(error){
    console.error(error);
    show(error.message || "Could not publish assignment.","bad");
  }
});

$("onBehalfForm").addEventListener("submit",async event => {
  event.preventDefault();
  if(!canManage()) return;
  const assignmentId = $("onBehalfAssignment").value;
  const studentId = $("onBehalfStudent").value;
  const evidenceRaw = $("onBehalfEvidence").value.trim();
  const evidenceUrl = safeUrl(evidenceRaw);
  if(evidenceRaw && !evidenceUrl){
    show("Evidence links must use HTTPS.","bad");
    return;
  }
  try{
    await setDoc(doc(db,"programmeSubmissions",submissionDocId(assignmentId,studentId)),{
      assignmentId,
      programmeId,
      schoolId:programme.schoolId,
      schoolCode:programme.schoolCode || "",
      studentId,
      submittedBy:currentUser.uid,
      submittedOnBehalf:true,
      submissionMethod:$("onBehalfMethod").value,
      responseText:$("onBehalfResponse").value.trim(),
      evidenceUrl,
      status:"submitted",
      feedback:"",
      reviewedBy:"",
      reviewedAt:null,
      submittedAt:serverTimestamp(),
      updatedAt:serverTimestamp()
    },{ merge:true });
    event.target.reset();
    show("Student work recorded by facilitator.","ok");
    await refreshData();
  }catch(error){
    console.error(error);
    show(error.message || "Could not record student work.","bad");
  }
});

async function refreshData(){
  await loadMemberships();
  await Promise.all([loadSessions(),loadAssignments(),loadAttendance()]);
  await loadSubmissions();
  renderAll();
}

requireRoles(["student","teacher","school_admin"],async (user,data) => {
  currentUser = user;
  profile = data;
  renderRoleNav(profile,"Programs");

  try{
    await loadProgramme();
    if(isStudent() && normalize(programme.status) !== "active"){
      throw new Error("This programme is not active.");
    }

    await loadRoster();
    await refreshData();

    if(isStudent() && !ownMembership){
      show("This programme is active, but you are not yet a member. Join it from the Programs page if open, or ask your teacher to add you.");
    }else if(isTeacher() && !isFacilitator()){
      show("You can view this programme, but only assigned facilitators can manage delivery.");
    }else{
      show("Programme workspace loaded.","ok");
    }
  }catch(error){
    console.error(error);
    show(error.message || "Could not load programme workspace.","bad");
  }
});