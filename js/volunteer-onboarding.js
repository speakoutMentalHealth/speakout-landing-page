import { auth, db } from "../firebase-config.js";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import { requireRoles, renderRoleNav } from "../launch-role-guard.js";

const $ = (id) => document.getElementById(id);
const path = (id) => doc(db, "volunteerApplications", id);
const statusLabels = {
  intake_received: "Intake received — waiting for coordinator review",
  orientation: "Orientation in progress",
  assessment_review: "Assessment verification in progress",
  safeguarding_review: "Safeguarding and role review in progress",
  eligible: "Eligible for an assignment — awaiting confirmation",
  active: "Active — follow your assigned supervisor's instructions",
  paused: "Placement paused — contact your coordinator",
  declined: "Application closed — contact the team for information"
};

function show(message, bad = false) {
  const target = $("formMessage");
  target.textContent = message;
  target.style.color = bad ? "#a52623" : "#08624d";
  target.setAttribute("role", bad ? "alert" : "status");
}
function selected(name) {
  return [...document.querySelectorAll('input[name="' + name + '"]:checked')].map((node) => node.value);
}
function setChecks(name, values) {
  for (const field of document.querySelectorAll('input[name="' + name + '"]')) field.checked = (values || []).includes(field.value);
}
function fillForm(application) {
  for (const field of ["city", "state", "weeklyHours", "participationMode", "languages", "experience"]) {
    $(field).value = application[field] || "";
  }
  setChecks("availabilityDays", application.availabilityDays);
  setChecks("focusAreas", application.focusAreas);
  $("emailUpdates").checked = Boolean(application.emailUpdates);
  $("whatsAppUpdates").checked = Boolean(application.whatsAppUpdates);
  $("safeguardingAcknowledged").checked = Boolean(application.safeguardingAcknowledged);
}
const interestLabels = {
  mental_health_education: "Mental health education",
  research: "Research", outreach: "Community outreach",
  programme_support: "Programme coordination", technology: "Technology",
  media: "Media", fundraising: "Fundraising"
};
const participationLabels = {
  remote: "Remote", hybrid: "Remote and planned in-person", in_person: "In-person"
};
function presentProfile(application) {
  const summary = $("profileSummary");
  summary.replaceChildren();
  if (!application) {
    summary.hidden = true;
    $("profileIntro").textContent = "Complete the volunteer form below to create your profile.";
    $("intakeToggle").textContent = "Complete your volunteer information";
    return;
  }
  const fields = [
    ["Location", [application.city, application.state].filter(Boolean).join(", ")],
    ["Weekly availability", (application.weeklyHours || "Not specified") + " hours · " +
      (application.availabilityDays || []).join(", ")],
    ["Participation preference", participationLabels[application.participationMode] || "Not specified"],
    ["Areas of interest", (application.focusAreas || []).map(area => interestLabels[area] || area).join(", ")],
    ["Languages", application.languages || "Not specified"],
    ["Bio and experience", application.experience || "Not added"],
    ["Email updates", application.emailUpdates ? "Opted in" : "Not opted in"],
    ["WhatsApp updates", application.whatsAppUpdates ? "Opted in" : "Not opted in"]
  ];
  for (const [label, value] of fields) {
    const field = document.createElement("div");
    field.className = "profile-field";
    const name = document.createElement("dt");
    name.textContent = label;
    const description = document.createElement("dd");
    description.textContent = value;
    field.append(name, description);
    summary.append(field);
  }
  summary.hidden = false;
  $("profileIntro").textContent = "Your saved volunteer information. Use Edit volunteer information to make changes.";
  $("intakeToggle").textContent = "Edit volunteer information";
}
function present(application) {
  presentProfile(application);
  $("intakeStatus").textContent = application ? "Submitted — you can update your contact preferences and availability." : "Not yet submitted";
  $("reviewStatus").textContent = application ? (statusLabels[application.reviewStage] || "Under review") : "Complete your application first";
  $("assessmentStatus").textContent = application?.assessmentStatus === "passed" ? "Verified passed" : application?.assessmentStatus === "failed" ? "Not passed" : "Not independently verified";
  $("safeguardingStatus").textContent = application?.safeguardingStatus === "cleared" ? "Cleared" : application?.safeguardingStatus === "blocked" ? "Not cleared" : "Pending review";
  $("placementStatus").textContent = application?.placementStatus === "assigned" ? "Assigned — consult the coordinator" : application?.placementStatus === "paused" ? "Paused" : "Not assigned";
  $("nextStep").textContent = !application ? "Complete your volunteer information below." :
    application.reviewStage === "declined" ? "Contact SpeakOut if you need clarification." :
    application.reviewStage === "active" ? "Follow your supervisor's approved instructions." :
    application.reviewStage === "eligible" ? "Await a placement invitation from your coordinator." :
    application.assessmentStatus === "not_verified" ? "Start the five free MindCheck lessons and complete the assessment; SpeakOut will verify the result before placement." :
    application.safeguardingStatus !== "cleared" ? "Await the safeguarding and role review before participating in activities." :
    "Your intake is on record. Wait for your coordinator to confirm the next assignment.";
}
async function presentAssignment(application, uid) {
  const card = $("assignmentCard");
  const active = application?.reviewStage === "active" &&
    application?.assessmentStatus === "passed" &&
    application?.safeguardingStatus === "cleared" &&
    application?.placementStatus === "assigned";
  card.hidden = !active;
  if (!active) return;
  const details = $("assignmentDetails");
  const emailLink = $("assignmentEmail");
  const fallback = $("assignmentFallback");
  const message = $("assignmentMessage");
  details.hidden = true;
  emailLink.hidden = true;
  fallback.hidden = true;
  message.textContent = "Loading your coordinator information…";
  try {
    const snapshot = await getDoc(doc(db, "volunteerAssignments", uid));
    if (!snapshot.exists()) {
      message.textContent = "Your placement is marked Assigned, but the coordinator's name and contact have not yet been published. Contact SpeakOut to request these details before starting new activities.";
      fallback.hidden = false;
      return;
    }
    const assignment = snapshot.data();
    details.replaceChildren();
    const fields = [
      ["Assigned role", assignment.roleTitle],
      ["Your coordinator / supervisor", assignment.coordinatorName],
      ["Approved duties", assignment.scope],
      ["Reporting instructions", assignment.reportingInstructions || "Contact your coordinator to confirm reporting arrangements"]
    ];
    for (const [label, value] of fields) {
      const field = document.createElement("div");
      field.className = "profile-field";
      const dt = document.createElement("dt");
      dt.textContent = label;
      const dd = document.createElement("dd");
      dd.textContent = value || "Not specified";
      field.append(dt, dd);
      details.append(field);
    }
    details.hidden = false;
    message.textContent = "Your assigned coordinator and reporting details are below.";
    const email = String(assignment.coordinatorEmail || "");
    if (/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(email)) {
      emailLink.href = "mailto:" + encodeURIComponent(email) + "?subject=SpeakOut%20Volunteer%20Assignment";
      emailLink.textContent = "Email " + (assignment.coordinatorName || "my coordinator");
      emailLink.hidden = false;
    } else {
      fallback.hidden = false;
    }
  } catch {
    message.textContent = "Coordinator details could not be loaded. Please use the official SpeakOut contact channel for assistance.";
    fallback.hidden = false;
  }
}
function input() {
  const city = $("city").value.trim();
  const state = $("state").value.trim();
  const languages = $("languages").value.trim();
  const experience = $("experience").value.trim();
  const availabilityDays = selected("availabilityDays");
  const focusAreas = selected("focusAreas");
  if (city.length < 2 || city.length > 80 || state.length < 2 || state.length > 80) throw new Error("Enter your city and state (2–80 characters each).");
  if (languages.length < 2 || languages.length > 160) throw new Error("Enter your preferred working languages (2–160 characters).");
  if (experience.length > 800) throw new Error("Keep your experience summary within 800 characters.");
  if (!availabilityDays.length || !focusAreas.length) throw new Error("Select at least one available day and one area of interest.");
  if (!$("safeguardingAcknowledged").checked) throw new Error("Please acknowledge the safeguarding and confidentiality expectations.");
  return {
    city, state, languages, experience, availabilityDays, focusAreas,
    weeklyHours: $("weeklyHours").value,
    participationMode: $("participationMode").value,
    emailUpdates: $("emailUpdates").checked,
    whatsAppUpdates: $("whatsAppUpdates").checked,
    safeguardingAcknowledged: true
  };
}
requireRoles(["volunteer"], async (user, profile) => {
  renderRoleNav(profile, "dashboard");
  // The global account controls supply the single Logout action.
  document.getElementById("logoutBtn")?.remove();
  const name = String(profile.firstName || profile.fullName || "").trim().split(" ")[0];
  if (name) $("welcome").textContent = "Welcome, " + name + ". Your volunteer journey starts here.";
  let existing = null;
  try {
    const snapshot = await getDoc(path(user.uid));
    existing = snapshot.exists() ? snapshot.data() : null;
    if (existing) fillForm(existing);
    present(existing);
    await presentAssignment(existing, user.uid);
    $("intakeDisclosure").open = !existing;
    document.body.classList.remove("volunteer-auth-pending");
  } catch (error) {
    document.body.classList.remove("volunteer-auth-pending");
    show("We could not load your volunteer record. Please retry or contact SpeakOut.", true);
    $("saveIntake").disabled = true;
    return;
  }
  $("intakeForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    let data;
    try { data = input(); } catch (error) { show(error.message, true); return; }
    const save = $("saveIntake");
    save.disabled = true;
    show("Saving your application securely…");
    try {
      if (existing) {
        await updateDoc(path(user.uid), { ...data, updatedAt: serverTimestamp() });
      } else {
        await setDoc(path(user.uid), {
          ...data, userId: user.uid, reviewStage: "intake_received",
          assessmentStatus: "not_verified", safeguardingStatus: "pending",
          placementStatus: "not_assigned", submittedAt: serverTimestamp(), updatedAt: serverTimestamp()
        });
      }
      const refreshed = await getDoc(path(user.uid));
      existing = refreshed.data();
      present(existing);
      await presentAssignment(existing, user.uid);
      $("intakeDisclosure").open = false;
      show("Volunteer information saved. Your saved profile is shown below.");
      $("intakeToggle").focus();
      $("form-heading").scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      show("Unable to save your information. Please check your connection and try again.", true);
    } finally {
      save.disabled = false;
    }
  });
});
