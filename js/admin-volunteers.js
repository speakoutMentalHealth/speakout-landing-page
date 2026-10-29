import { db } from "../firebase-config.js";
import { collection, doc, getDoc, getDocs, query, limit, updateDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import { requireRoles } from "../launch-role-guard.js";

const $ = id => document.getElementById(id);
const reviewStages = ["intake_received", "orientation", "assessment_review", "safeguarding_review", "eligible", "active", "paused", "declined"];
const assessments = ["not_verified", "passed", "failed"];
const safeguarding = ["pending", "cleared", "blocked"];
const placements = ["not_assigned", "assigned", "paused"];
function optionSelect(values, selected) {
  const select = document.createElement("select");
  for (const value of values) {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = value.replaceAll("_", " ");
    select.append(opt);
  }
  select.value = selected;
  return select;
}
function field(group, label, value) {
  const dt = document.createElement("dt");
  dt.textContent = label;
  const dd = document.createElement("dd");
  dd.textContent = value;
  group.append(dt, dd);
}
function labelledSelect(group, label, values, selected) {
  const container = document.createElement("label");
  container.textContent = label;
  const select = optionSelect(values, selected);
  container.append(select);
  group.append(container);
  return select;
}
function assignmentEditor(uid, application) {
  const details = document.createElement("details");
  details.className = "assignment-editor";
  const summary = document.createElement("summary");
  summary.textContent = "Assign coordinator and role";
  details.append(summary);
  const form = document.createElement("form");
  form.className = "assignment-form";
  const inputs = {};
  function fieldInput(id, label, hint, length, multiline = false) {
    const wrapper = document.createElement("label");
    wrapper.textContent = label;
    const input = document.createElement(multiline ? "textarea" : "input");
    input.name = id;
    input.id = id + "-" + uid;
    input.required = !["reportingInstructions"].includes(id);
    input.maxLength = length;
    input.placeholder = hint;
    if (!multiline) input.type = id === "coordinatorEmail" ? "email" : "text";
    else wrapper.className = "wide";
    wrapper.append(input);
    form.append(wrapper);
    inputs[id] = input;
  }
  fieldInput("roleTitle", "Assigned volunteer role", "e.g. Mental Health Education Volunteer", 100);
  fieldInput("coordinatorName", "Coordinator / supervisor name", "Enter the appointed person's full name", 120);
  fieldInput("coordinatorEmail", "Approved work contact email", "Use an official contact email", 160);
  fieldInput("scope", "Approved duties and boundaries", "Describe what the volunteer may do, without beneficiary details", 700, true);
  fieldInput("reportingInstructions", "Reporting instructions (optional)", "e.g. Weekly updates to coordinator by email", 700, true);
  const button = document.createElement("button");
  button.type = "submit";
  button.textContent = "Save coordinator assignment";
  const status = document.createElement("p");
  status.className = "wide";
  status.setAttribute("role", "status");
  const guidance = document.createElement("p");
  guidance.className = "wide";
  guidance.textContent = "Publish only an authorised coordinator's work contact. No private beneficiary data or personal phone numbers. The volunteer sees this only while their account and placement remain active.";
  form.append(guidance, button, status);
  details.append(form);
  let loaded = false;
  details.addEventListener("toggle", async () => {
    if (!details.open || loaded) return;
    status.textContent = "Loading saved assignment…";
    try {
      const saved = await getDoc(doc(db, "volunteerAssignments", uid));
      if (saved.exists()) {
        const a = saved.data();
        for (const key of Object.keys(inputs)) inputs[key].value = a[key] || "";
      }
      loaded = true;
      status.textContent = saved.exists() ? "Saved assignment loaded." : "No coordinator details have been published yet.";
    } catch {
      status.textContent = "Unable to load assignment. Please try again.";
    }
  });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!loaded) {status.textContent = "Please open this panel and load the assignment first.";return;}
    if (application.reviewStage !== "active" || application.assessmentStatus !== "passed" ||
        application.safeguardingStatus !== "cleared" || application.placementStatus !== "assigned") {
      status.textContent = "Save Active, Passed, Cleared and Assigned review decisions before publishing coordinator details.";
      return;
    }
    const values = Object.fromEntries(Object.entries(inputs).map(([key,node]) => [key,node.value.trim()]));
    if (values.roleTitle.length < 3 || values.coordinatorName.length < 2 ||
        values.scope.length < 6 || !inputs.coordinatorEmail.checkValidity()) {
      status.textContent = "Complete the role, coordinator, approved email and duties before publishing.";
      return;
    }
    button.disabled = true;
    status.textContent = "Publishing coordinator details…";
    try {
      await setDoc(doc(db,"volunteerAssignments",uid),{
        volunteerId:uid, ...values, updatedAt:serverTimestamp()
      });
      status.textContent = "Coordinator assignment saved. The volunteer can now view these details in their hub.";
    } catch {
      status.textContent = "Unable to publish. Verify the volunteer is still active and try again.";
    } finally {button.disabled = false;}
  });
  return details;
}

async function renderOne(application) {
  const uid = application.id;
  const a = application.data();
  let displayName = uid, email = "";
  try {
    const user = await getDoc(doc(db, "users", uid));
    if (user.exists()) {
      const p = user.data();
      displayName = p.fullName || [p.firstName,p.lastName].filter(Boolean).join(" ") || uid;
      email = p.email || "";
    }
  } catch {} // Coordinator can still review a record without public profile details.
  const article = document.createElement("article");
  article.className = "application";
  const heading = document.createElement("h2");
  heading.textContent = displayName;
  article.append(heading);
  const info = document.createElement("dl");
  info.className = "data";
  field(info, "Email", email || "See account record");
  field(info, "UID", uid);
  field(info, "Location", [a.city,a.state].filter(Boolean).join(", "));
  field(info, "Hours / week", a.weeklyHours || "Not recorded");
  field(info, "Available days", (a.availabilityDays || []).join(", "));
  field(info, "Participation", a.participationMode || "Not recorded");
  field(info, "Interests", (a.focusAreas || []).join(", "));
  field(info, "Languages", a.languages || "Not recorded");
  field(info, "Experience", a.experience || "Not provided");
  field(info, "Optional email updates", a.emailUpdates ? "Yes" : "No");
  field(info, "Optional WhatsApp updates", a.whatsAppUpdates ? "Yes" : "No");
  article.append(info);
  const controls = document.createElement("div");
  controls.className = "actions";
  const stage = labelledSelect(controls, "Review stage", reviewStages, a.reviewStage);
  const exam = labelledSelect(controls, "Assessment", assessments, a.assessmentStatus);
  const safety = labelledSelect(controls, "Safeguarding", safeguarding, a.safeguardingStatus);
  const placement = labelledSelect(controls, "Placement", placements, a.placementStatus);
  const save = document.createElement("button");
  save.type = "button";
  save.textContent = "Save review";
  const message = document.createElement("span");
  message.setAttribute("role", "status");
  save.addEventListener("click", async () => {
    if (stage.value === "active" &&
      (exam.value !== "passed" || safety.value !== "cleared" || placement.value !== "assigned")) {
      message.textContent = "Active placement requires independently verified assessment, safeguarding clearance and assignment.";
      return;
    }
    if (stage.value === "eligible" && (exam.value !== "passed" || safety.value !== "cleared")) {
      message.textContent = "Eligible status requires verified assessment and safeguarding clearance.";
      return;
    }
    if (placement.value === "assigned" && stage.value !== "active") {
      message.textContent = "Only an active, verified and safeguarded volunteer may have an assignment.";
      return;
    }
    if (stage.value === "declined" && placement.value === "assigned") {
      message.textContent = "A declined volunteer cannot remain assigned.";
      return;
    }
    save.disabled = true;
    message.textContent = "Saving review…";
    try {
      await updateDoc(doc(db,"volunteerApplications",uid), {
        reviewStage:stage.value, assessmentStatus:exam.value,
        safeguardingStatus:safety.value, placementStatus:placement.value,
        updatedAt:serverTimestamp()
      });
      message.textContent = "Saved. This is a review decision, not an automated notification.";
    } catch {
      message.textContent = "Could not save review. Check permissions and try again.";
    } finally {save.disabled = false;}
  });
  controls.append(save,message);
  article.append(controls);
  article.append(assignmentEditor(uid, a));
  return article;
}
async function loadApplications() {
  try {
    const results = await getDocs(query(collection(db,"volunteerApplications"), limit(100)));
    const host = $("applications");
    host.replaceChildren();
    if (results.empty) {
      $("notice").textContent = "No submitted volunteer profiles found.";
      return;
    }
    $("notice").textContent = "Showing " + results.size + " application(s), limited to 100 per page. Review the Account Approval page separately.";
    for (const item of results.docs) host.append(await renderOne(item));
  } catch {
    $("notice").textContent = "Unable to load volunteer applications. Check your permissions.";
  }
}
requireRoles(["admin","super_admin"], loadApplications);
