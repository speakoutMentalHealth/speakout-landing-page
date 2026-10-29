import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import { volunteerNextActions } from "./volunteer-next-actions.js";

const byId = id => document.getElementById(id);
const claimPath = (db, uid) => doc(db,"volunteerCredentialClaims",uid);
let credentialClaim = null;
let intake = null;
let published = false;

function renderChecklist() {
  const target = byId("journeySteps");
  target.replaceChildren();
  const actions = volunteerNextActions(intake,credentialClaim,published);
  if(byId("nextStep")) byId("nextStep").textContent=actions[0]?.title || "Review your current status.";
  byId("journeyIntro").textContent = actions.length === 1
    ? "Your next step is below. Completed stages stay in your onboarding record."
    : "Choose the step that applies to you. No need to repeat a completed assessment.";
  actions.forEach(action => {
    const item=document.createElement("li");
    item.className="journey-step";
    const heading=document.createElement("strong");
    heading.textContent=action.title;
    const p=document.createElement("p");
    p.textContent=action.description;
    item.append(heading,p);
    if(action.href) {
      const link=document.createElement("a");
      link.className="btn-link secondary";
      link.textContent=action.label || "Continue";
      link.href=action.href;
      if(action.href.startsWith("https://")) {link.target="_blank";link.rel="noopener noreferrer";}
      item.append(link);
    }
    target.append(item);
  });
}
function showClaim() {
  const form=byId("credentialForm");
  const status=byId("credentialStatus");
  const toggle=byId("credentialDisclosure");
  const button=byId("submitCredential");
  const text=byId("credentialGuidance");
  if(!intake) {
    toggle.hidden=true;
    status.textContent="Complete your volunteer profile before submitting a certificate reference.";
    return;
  }
  const assessmentPassed=intake.assessmentStatus==="passed";
  if(assessmentPassed) {
    toggle.hidden=true;
    status.textContent="Assessment recorded as verified passed by SpeakOut. No further certificate submission is needed.";
    return;
  }
  const review=credentialClaim?.reviewStatus || "none";
  toggle.hidden=review==="pending" || review==="verified";
  button.disabled=review==="pending" || review==="verified";
  if(review==="pending") {
    status.textContent="Certificate reference submitted. Await independent verification by SpeakOut. Do not repeat the assessment.";
  } else if(review==="verified") {
    status.textContent="Certificate reference verified by SpeakOut; awaiting assessment milestone reconciliation.";
  } else if(review==="rejected") {
    status.textContent="Reference not verified. " + (credentialClaim.reviewNote || "Please contact your coordinator if you need help.");
  } else {
    status.textContent="Already qualified? Submit the certificate ID printed on your existing MindCheck certificate. You do not need to retake the assessment.";
  }
  text.textContent=review==="rejected"
    ? "Enter a different valid certificate reference. Re-entering the same rejected code is not permitted."
    : "This is a certificate-reference submission, not a file upload. Only SpeakOut can verify and approve it.";
  form.hidden = toggle.hidden;
  if(toggle.hidden) toggle.open=false;
  if(review==="rejected") toggle.open=true;
}
function render() {showClaim();renderChecklist();}

export async function setupVolunteerCredentials(db,uid,application,coordinatorPublished) {
  intake=application;
  published=Boolean(coordinatorPublished);
  try {
    const found=await getDoc(claimPath(db,uid));
    credentialClaim=found.exists()?found.data():null;
  } catch {
    byId("credentialStatus").textContent="Unable to load certificate status. Refresh before submitting.";
    byId("credentialDisclosure").hidden=true;
    renderChecklist();
    return;
  }
  render();
  byId("credentialForm").addEventListener("submit",async event=>{
    event.preventDefault();
    const reference=byId("certificateReference").value.trim().toUpperCase();
    if(!/^[A-Z0-9-]{8,80}$/.test(reference)) {
      byId("credentialFeedback").textContent="Enter the printed certificate ID (8–80 letters, numbers or hyphens).";
      return;
    }
    const button=byId("submitCredential");
    button.disabled=true;
    byId("credentialFeedback").textContent="Submitting your reference securely…";
    try {
      if(credentialClaim?.reviewStatus==="rejected") {
        if(credentialClaim.certificateId===reference) throw Error("Use a different reference or contact SpeakOut.");
        await updateDoc(claimPath(db,uid),{
          certificateId:reference,reviewStatus:"pending",verifierUid:"",
          reviewedAt:null,reviewNote:"",updatedAt:serverTimestamp()
        });
      } else if(!credentialClaim) {
        await setDoc(claimPath(db,uid),{
          volunteerId:uid,certificateId:reference,reviewStatus:"pending",
          submittedAt:serverTimestamp(),updatedAt:serverTimestamp(),
          verifierUid:"",reviewedAt:null,reviewNote:""
        });
      } else {
        throw Error("This certificate is already being reviewed.");
      }
      const refreshed=await getDoc(claimPath(db,uid));
      credentialClaim=refreshed.exists()?refreshed.data():null;
      render();
      byId("credentialFeedback").textContent="Certificate reference received. SpeakOut will verify it. No retake is needed while it is under review.";
      byId("credentialStatus").scrollIntoView({behavior:"smooth",block:"center"});
    } catch(error) {
      byId("credentialFeedback").textContent=error.message==="Use a different reference or contact SpeakOut."
        ? error.message : "Could not submit. Check your connection and try again.";
    } finally {button.disabled=false;}
  });
}
export function refreshVolunteerJourney(application,coordinatorPublished) {
  intake=application;
  published=Boolean(coordinatorPublished);
  render();
}
