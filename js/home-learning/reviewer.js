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
  // Do not initialize a Firebase app on any non-staging host.
  const { app, auth, db } = await import("../firebase-config.js");
  const [{ onAuthStateChanged }, { doc, collection, query, where, getDoc, getDocFromServer, getDocs, setDoc, serverTimestamp }] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js")
  ]);
  if (app.options.projectId !== "speakout-portal-staging") {
    status.textContent = "Staging Firebase project verification failed. Reviews are disabled.";
    throw new Error("Staging project mismatch");
  }
  onAuthStateChanged(auth, async (user) => {
    const generation = ++authGeneration;
    area.hidden = true;
    area.replaceChildren();
    status.textContent = "Verifying staging teacher access…";
    if (!user) {
      status.textContent = "Sign in using an approved staging teacher account.";
      return;
    }
    try {
      const profile = await getDoc(doc(db, "users", user.uid));
      if (generation !== authGeneration || auth.currentUser?.uid !== user.uid) return;
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
          card.append(element("p", "Preview only: this page is not an immutable, verified version. Confirm the assigned source revision with the administrator before submitting findings."));
        } else {
          card.append(element("p", "Draft content unavailable in catalogue; contact the assigning administrator."));
          area.append(card);
          continue;
        }
        const existing = await getDocFromServer(doc(db, "homeLearningReviewSubmissions", row.id));
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
            if (generation !== authGeneration || auth.currentUser?.uid !== user.uid) return;
            form.replaceWith(element("p", "Submitted for verification; no lesson has been approved."));
          } catch {
            if (generation !== authGeneration || auth.currentUser?.uid !== user.uid) return;
            // A network error can occur after Firestore has committed the write.
            // Re-read before allowing another attempt at an immutable submission.
            try {
              const saved = await getDocFromServer(doc(db, "homeLearningReviewSubmissions", row.id));
              if (generation !== authGeneration || auth.currentUser?.uid !== user.uid) return;
              if (saved.exists()) {
                form.replaceWith(element("p", "A review submission is already recorded. No further submission is permitted."));
                return;
              }
              feedback.textContent = "The server confirmed no saved submission. You may retry if your connection is stable.";
              button.disabled = false;
            } catch {
              if (generation !== authGeneration || auth.currentUser?.uid !== user.uid) return;
              feedback.textContent = "Submission status is unknown. Reload to check before attempting again.";
              button.disabled = true;
            }
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
