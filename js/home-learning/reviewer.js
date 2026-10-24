import { auth, db } from "../firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { doc, collection, query, where, getDoc, getDocs, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const hosts = new Set(["speakout-portal-staging.web.app", "speakout-portal-staging.firebaseapp.com"]);
const status = document.getElementById("status");
const area = document.getElementById("assignments");
let authGeneration = 0;
async function loadDraftCatalogue() {
  const response = await fetch("data/home-learning-catalog.json", {cache:"no-store"});
  if (!response.ok) throw new Error("Catalogue unavailable");
  const data = await response.json();
  if (!Array.isArray(data.resources)) throw new Error("Invalid catalogue");
  return new Map(data.resources.filter(item =>
    typeof item.id === "string" &&
    typeof item.resource_url === "string" &&
    /^[a-z0-9-]+\.html$/.test(item.resource_url)
  ).map(item => [item.id, item]));
}
function element(tag, value) {
  const item = document.createElement(tag);
  item.textContent = value;
  return item;
}
if (!hosts.has(location.hostname)) {
  status.textContent = "This workspace is disabled outside the designated staging portal.";
} else {
  onAuthStateChanged(auth, async (user) => {
    const generation = ++authGeneration;
    area.hidden = true;
    area.replaceChildren();
    if (!user) {
      status.textContent = "Sign in using an approved staging teacher account.";
      return;
    }
    try {
      const profile = await getDoc(doc(db, "users", user.uid));
      if (!profile.exists() || profile.data().status !== "approved" || profile.data().role !== "teacher") {
        status.textContent = "An approved teacher account is required.";
        return;
      }
      const catalogue = await loadDraftCatalogue();
      const assigned = await getDocs(query(
        collection(db, "homeLearningReviewerAssignments"),
        where("reviewerUid", "==", user.uid)
      ));
      if (generation !== authGeneration || auth.currentUser?.uid !== user.uid) return;
      status.textContent = "Verified teacher account. Review only assignments listed below.";
      area.hidden = false;
      if (assigned.empty) {
        area.append(element("p", "No assignments have been issued to your account."));
      }
      for (const row of assigned.docs) {
        const assignment = row.data();
        if (typeof assignment.resourceId !== "string" || typeof assignment.resourceVersion !== "string") continue;
        const card = element("article", "");
        card.append(element("h2", assignment.resourceId), element("p", "Assigned version: " + assignment.resourceVersion));
        const draft = catalogue.get(assignment.resourceId);
        if (draft) {
          const link = element("a", "Open draft learning resource (not approved)");
          link.href = draft.resource_url;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          card.append(link);
        } else {
          card.append(element("p", "Draft content unavailable in catalogue; contact the assigning administrator."));
          area.append(card);
          continue;
        }
        const existing = await getDoc(doc(db, "homeLearningReviewSubmissions", row.id));
        if (generation !== authGeneration || auth.currentUser?.uid !== user.uid) return;
        if (existing.exists()) {
          card.append(element("p", "Findings already submitted. They cannot be edited."));
          area.append(card);
          continue;
        }
        const form = document.createElement("form");
        const label = element("label", "Curriculum checks, accuracy, accessibility and safeguarding findings");
        const details = document.createElement("textarea");
        details.required = true;
        details.minLength = 10;
        details.maxLength = 4000;
        const button = element("button", "Submit findings for independent verification");
        button.type = "submit";
        const feedback = element("p", "");
        feedback.setAttribute("role", "status");
        label.append(details);
        form.append(label, button, feedback);
        form.addEventListener("submit", async (event) => {
          event.preventDefault();
          const findings = details.value.trim();
          if (findings.length < 10 || findings.length > 4000) {
            feedback.textContent = "Please provide 10–4000 characters.";
            return;
          }
          if (generation !== authGeneration || auth.currentUser?.uid !== user.uid) {
            feedback.textContent = "Session changed. Reload to continue.";
            return;
          }
          button.disabled = true;
          try {
            await setDoc(doc(db, "homeLearningReviewSubmissions", row.id), {
              reviewerUid: user.uid,
              resourceId: assignment.resourceId,
              resourceVersion: assignment.resourceVersion,
              reviewStatus: "submitted_for_verification",
              findings,
              submittedAt: serverTimestamp()
            });
            form.replaceWith(element("p", "Submitted for verification; no lesson has been approved."));
          } catch {
            feedback.textContent = "Submission unavailable or denied. No changes were applied.";
            button.disabled = false;
          }
        });
        card.append(form);
        area.append(card);
      }
    } catch {
      if (generation !== authGeneration) return;
      status.textContent = "Review access could not be verified.";
      area.hidden = true;
    }
  });
}
