import { auth, db } from "../firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { doc, collection, query, where, getDoc, getDocs, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const hosts = new Set(["speakout-portal-staging.web.app", "speakout-portal-staging.firebaseapp.com"]);
const status = document.getElementById("status");
const area = document.getElementById("assignments");
function element(tag, value) {
  const item = document.createElement(tag);
  item.textContent = value;
  return item;
}
if (!hosts.has(location.hostname)) {
  status.textContent = "This workspace is disabled outside the designated staging portal.";
} else {
  onAuthStateChanged(auth, async (user) => {
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
      const assigned = await getDocs(query(
        collection(db, "homeLearningReviewerAssignments"),
        where("reviewerUid", "==", user.uid)
      ));
      status.textContent = "Verified teacher account. Review only assignments listed below.";
      area.hidden = false;
      if (assigned.empty) {
        area.append(element("p", "No assignments have been issued to your account."));
      }
      for (const row of assigned.docs) {
        const assignment = row.data();
        if (typeof assignment.resourceId !== "string") continue;
        const card = element("article", "");
        card.append(element("h2", assignment.resourceId));
        const existing = await getDoc(doc(db, "homeLearningReviewSubmissions", row.id));
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
          button.disabled = true;
          try {
            await setDoc(doc(db, "homeLearningReviewSubmissions", row.id), {
              reviewerUid: user.uid,
              resourceId: assignment.resourceId,
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
      status.textContent = "Review access could not be verified.";
      area.hidden = true;
    }
  });
}
