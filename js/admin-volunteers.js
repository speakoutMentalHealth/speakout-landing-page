import { db } from "../firebase-config.js";
import { collection, doc, getDoc, getDocs, query, limit, updateDoc, setDoc, serverTimestamp, writeBatch, addDoc } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import { requireRoles } from "../launch-role-guard.js";

const $ = id => document.getElementById(id);
let actingAdminUid = "";
function newNotification(uid, category, title, body) {
  return {
    recipientUid: uid, senderUid: actingAdminUid, category, title, body,
    createdAt: serverTimestamp(), readAt: null
  };
}
function notificationCollection(uid) {
  return collection(db, "volunteerNotifications", uid, "messages");
}

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
      const batch = writeBatch(db);
      batch.set(doc(db, "volunteerAssignments", uid), {
        volunteerId:uid, ...values, updatedAt:serverTimestamp()
      });
      batch.set(doc(notificationCollection(uid)), newNotification(
        uid, "assignment", "Your coordinator details are available",
        "SpeakOut has published your approved coordinator and role details. Open your Volunteer Hub to read your responsibilities and reporting instructions."
      ));
      await batch.commit();
      status.textContent = "Coordinator assignment saved. The volunteer can now view these details in their hub.";
    } catch {
      status.textContent = "Unable to publish. Verify the volunteer is still active and try again.";
    } finally {button.disabled = false;}
  });
  return details;
}

function notificationEditor(uid, email, allowEmailUpdates) {
  const details = document.createElement("details");
  details.className = "assignment-editor";
  const summary = document.createElement("summary");
  summary.textContent = "Send an in-app notification";
  details.append(summary);
  const form = document.createElement("form");
  form.className = "assignment-form";
  const categoryWrap = document.createElement("label");
  categoryWrap.textContent = "Message category";
  const category = optionSelect(["general", "onboarding", "assignment", "programme"], "general");
  categoryWrap.append(category);
  const titleWrap = document.createElement("label");
  titleWrap.textContent = "Subject (4–90 characters)";
  const title = document.createElement("input");
  title.required = true; title.minLength = 4; title.maxLength = 90;
  title.placeholder = "e.g. Your SpeakOut volunteer update";
  titleWrap.append(title);
  const messageWrap = document.createElement("label");
  messageWrap.className = "wide";
  messageWrap.textContent = "Message (6–450 characters)";
  const body = document.createElement("textarea");
  body.required = true;body.minLength = 6;body.maxLength = 450;body.rows = 4;
  body.placeholder = "Please check your dashboard for your next approved activity.";
  messageWrap.append(body);
  const help = document.createElement("p");
  help.className = "wide";
  help.textContent = "Keep this message non-sensitive. No names of beneficiaries, clinical information, private case details or passwords. It appears in this volunteer's inbox; it is not automatically sent as email, WhatsApp or a phone push.";
  const send = document.createElement("button");
  send.type = "submit";send.textContent = "Send in-app notification";
  const status = document.createElement("p");
  status.className = "wide";status.setAttribute("role", "status");
  const emailLink = document.createElement("a");
  emailLink.className = "wide";
  emailLink.textContent = "Prepare optional email in your mail app (manual send)";
  emailLink.hidden = true;
  form.append(categoryWrap,titleWrap,messageWrap,help,send,status,emailLink);
  details.append(form);
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const subject = title.value.trim();
    const message = body.value.trim();
    if(subject.length < 4 || subject.length > 90 || message.length < 6 || message.length > 450) {
      status.textContent = "Check the message length before sending.";return;
    }
    send.disabled = true;
    status.textContent = "Sending securely…";
    try {
      await addDoc(notificationCollection(uid), newNotification(uid, category.value, subject, message));
      status.textContent = "In-app notification sent. It will appear in this volunteer's dashboard inbox.";
      form.reset();
      if (allowEmailUpdates && email && email.includes("@") && email.split("@")[1]?.includes(".") && !email.includes(" ")) {
        emailLink.href = "mailto:" + encodeURIComponent(email) + "?subject=" +
          encodeURIComponent(subject) + "&body=" + encodeURIComponent(message);
        emailLink.hidden = false;
      }
    } catch {
      status.textContent = "Unable to send. Confirm the volunteer's account is approved and try again.";
    } finally {send.disabled = false;}
  });
  return details;
}

function credentialReviewPanel(uid, application, assessmentSelect) {
  const box=document.createElement("details");
  box.className="assignment-editor";
  const heading=document.createElement("summary");
  heading.textContent="Review submitted training certificate";
  box.append(heading);
  const content=document.createElement("div");
  content.className="assignment-form";
  box.append(content);
  let loaded=false;
  let claim=null;
  const status=document.createElement("p");
  status.className="wide";
  status.setAttribute("role","status");
  const load=async()=>{
    content.replaceChildren();
    content.append(status);
    status.textContent="Checking submitted certificate reference…";
    try {
      const record=await getDoc(doc(db,"volunteerCredentialClaims",uid));
      claim=record.exists()?record.data():null;
      loaded=true;
    } catch {
      loaded=false;
      status.textContent="Could not load the certificate record. Try reopening this panel.";
      return;
    }
    if(!claim) {
      status.textContent="No certificate reference has been submitted. The volunteer can submit a printed certificate ID from their dashboard.";
      return;
    }
    const reference=document.createElement("p");
    reference.className="wide";
    reference.textContent="Certificate ID submitted: "+claim.certificateId;
    const instruction=document.createElement("p");
    instruction.className="wide";
    instruction.textContent="Check the issuing authority, exact certificate ID, recipient identity, assessment result and current validity using the official MindCheck verification service. A typed ID or client-side result is NOT sufficient proof.";
    const verify=document.createElement("a");
    verify.href="https://mindcheck.speakoutmentalhealth.org/verify.html";
    verify.target="_blank";verify.rel="noopener noreferrer";
    verify.className="wide";verify.textContent="Open official MindCheck certificate verification";
    content.append(reference,instruction,verify);
    if(claim.reviewStatus!=="pending") {
      status.textContent=claim.reviewStatus==="verified"?"Already verified by SpeakOut.":"Reference rejected. Volunteer may submit a different ID.";
      return;
    }
    const checked=document.createElement("label");
    checked.className="wide";
    const checkbox=document.createElement("input");
    checkbox.type="checkbox";
    checkbox.required=true;
    checked.append(checkbox,document.createTextNode(" I independently checked the certificate with the issuer and matched its recipient to this volunteer's SpeakOut account. It is valid and meets the required assessment standard."));
    const reason=document.createElement("label");
    reason.className="wide";
    reason.textContent="Reason if rejecting (no personal or medical information)";
    const note=document.createElement("textarea");
    note.maxLength=240;note.rows=2;
    note.placeholder="e.g. The code was not found in the approved certificate register.";
    reason.append(note);
    const buttons=document.createElement("div");
    buttons.className="wide links";
    const approve=document.createElement("button");
    approve.type="button";approve.textContent="Verify certificate and record assessment pass";
    const reject=document.createElement("button");
    reject.type="button";reject.textContent="Reject reference";
    reject.className="secondary-review";
    buttons.append(approve,reject);
    content.append(checked,reason,buttons);
    status.textContent="Pending independent verification.";
    const save=async verdict=>{
      if(!loaded || claim.reviewStatus!=="pending") return;
      if(verdict==="verified" && !checkbox.checked) {
        status.textContent="Verify the actual issuer, recipient and passing assessment before approving.";
        return;
      }
      if(verdict==="rejected" && note.value.trim().length<6) {
        status.textContent="Enter a brief reason (at least six characters) for the volunteer.";
        return;
      }
      approve.disabled=true;reject.disabled=true;
      status.textContent="Recording administrator verification…";
      try {
        const batch=writeBatch(db);
        batch.update(doc(db,"volunteerCredentialClaims",uid),{
          reviewStatus:verdict,verifierUid:actingAdminUid,reviewedAt:serverTimestamp(),
          updatedAt:serverTimestamp(),reviewNote:verdict==="rejected"?note.value.trim():""
        });
        if(verdict==="verified" && application.assessmentStatus!=="passed") {
          batch.update(doc(db,"volunteerApplications",uid),{
            assessmentStatus:"passed",updatedAt:serverTimestamp()
          });
        }
        batch.set(doc(notificationCollection(uid)),newNotification(
          uid,"onboarding",verdict==="verified"?"Certificate verification completed":"Certificate review needs attention",
          verdict==="verified"
            ?"SpeakOut verified your existing certificate. Open the Volunteer Hub to see your updated assessment and safeguarding steps."
            :"Your submitted certificate reference could not be verified. Open your Volunteer Hub to see the next steps."
        ));
        await batch.commit();
        if(verdict==="verified") {
          application.assessmentStatus="passed";
          assessmentSelect.value="passed";
        }
        claim.reviewStatus=verdict;
        status.textContent=verdict==="verified"?"Verified. Assessment marked Passed; safeguarding and placement still require separate approval.":"Reference rejected. Volunteer can resubmit a different code.";
        checked.remove();reason.remove();buttons.remove();
      } catch {
        status.textContent="Save failed. Check verification permissions and try again; no approval has been recorded.";
        approve.disabled=false;reject.disabled=false;
      }
    };
    approve.addEventListener("click",()=>save("verified"));
    reject.addEventListener("click",()=>save("rejected"));
  };
  box.addEventListener("toggle",()=>{if(box.open&&!loaded)load();});
  return box;
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
  const profilePanel = document.createElement("details");
  profilePanel.className = "profile-info";
  const profileToggle = document.createElement("summary");
  profileToggle.textContent = "View volunteer profile and availability";
  profilePanel.append(profileToggle, info);
  article.append(profilePanel);
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
      const changed = a.reviewStage !== stage.value || a.assessmentStatus !== exam.value ||
        a.safeguardingStatus !== safety.value || a.placementStatus !== placement.value;
      const batch = writeBatch(db);
      batch.update(doc(db,"volunteerApplications",uid), {
        reviewStage:stage.value, assessmentStatus:exam.value,
        safeguardingStatus:safety.value, placementStatus:placement.value,
        updatedAt:serverTimestamp()
      });
      if (changed) batch.set(doc(notificationCollection(uid)), newNotification(
        uid, "onboarding", "Your volunteer status has been updated",
        "SpeakOut updated your onboarding record. Sign in to your Volunteer Hub to check your current status and next steps."
      ));
      await batch.commit();
      Object.assign(a, {
        reviewStage: stage.value, assessmentStatus: exam.value,
        safeguardingStatus: safety.value, placementStatus: placement.value
      });
      message.textContent = "Saved. This is a review decision, not an automated notification.";
    } catch {
      message.textContent = "Could not save review. Check permissions and try again.";
    } finally {save.disabled = false;}
  });
  controls.append(save,message);
  article.append(controls);
  article.append(credentialReviewPanel(uid, a, exam));
  article.append(assignmentEditor(uid, a));
  article.append(notificationEditor(uid, email, a.emailUpdates));
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
requireRoles(["admin","super_admin"], async user => {
  actingAdminUid = user.uid;
  await loadApplications();
});
