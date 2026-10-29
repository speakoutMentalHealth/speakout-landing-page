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
function present(application) {
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
  const name = String(profile.firstName || profile.fullName || "").trim().split(" ")[0];
  if (name) $("welcome").textContent = "Welcome, " + name + ". Your volunteer journey starts here.";
  let existing = null;
  try {
    const snapshot = await getDoc(path(user.uid));
    existing = snapshot.exists() ? snapshot.data() : null;
    if (existing) fillForm(existing);
    present(existing);
  } catch (error) {
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
      show("Volunteer information saved. Your next step is shown above.");
    } catch (error) {
      show("Unable to save your information. Please check your connection and try again.", true);
    } finally {
      save.disabled = false;
    }
  });
});
