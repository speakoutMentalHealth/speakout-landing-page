const status = document.getElementById("applicationStatus");
const form = document.getElementById("reviewerApplication");
const button = document.getElementById("applyButton");
let generation = 0;
try {
  const [{ auth, db }, { onAuthStateChanged }, { doc, getDocFromServer, setDoc, serverTimestamp }] = await Promise.all([
    import("../firebase-config.js"),
    import("https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js")
  ]);
  onAuthStateChanged(auth, async (user) => {
    const current = ++generation;
    form.hidden = true;
    form.onsubmit = null;
    if (!user) {
      status.textContent = "Sign in with an approved SpeakOut teacher account to apply.";
      return;
    }
    status.textContent = "Checking your teacher account…";
    try {
      const profile = await getDocFromServer(doc(db, "users", user.uid));
      if (current !== generation || auth.currentUser?.uid !== user.uid) return;
      if (!profile.exists() || profile.data().status !== "approved" || profile.data().role !== "teacher") {
        status.textContent = "Applications currently require an approved SpeakOut teacher account.";
        return;
      }
      const application = doc(db, "homeLearningReviewerApplications", user.uid);
      const existing = await getDocFromServer(application);
      if (current !== generation || auth.currentUser?.uid !== user.uid) return;
      if (existing.exists()) {
        status.textContent = "Your application has already been received. An editor must independently review it.";
        return;
      }
      status.textContent = "Complete the form below to request consideration. Approval is not automatic.";
      form.hidden = false;
      form.onsubmit = async (event) => {
        event.preventDefault();
        if (!form.reportValidity() || button.disabled) return;
        const data = new FormData(form);
        if (auth.currentUser?.uid !== user.uid || current !== generation) return;
        button.disabled = true;
        status.textContent = "Submitting your application…";
        try {
          await setDoc(application, {
            applicantUid: user.uid,
            displayName: String(data.get("displayName") || "").trim(),
            subjectExpertise: String(data.get("subjectExpertise") || "").trim(),
            experience: String(data.get("experience") || "").trim(),
            consentToContact: data.get("consentToContact") === "on",
            publicCreditOptIn: data.get("publicCreditOptIn") === "on",
            status: "pending_review",
            submittedAt: serverTimestamp()
          });
          if (current !== generation) return;
          form.hidden = true;
          status.textContent = "Application submitted for independent editorial review. This does not authorize reviewing or publishing.";
        } catch {
          if (current === generation) status.textContent = "Submission could not be confirmed. Please try again or contact SpeakOut support.";
        } finally {
          button.disabled = false;
        }
      };
    } catch {
      if (current === generation) status.textContent = "We could not verify your eligibility. Please retry when connected.";
    }
  });
} catch {
  status.textContent = "Applications are temporarily unavailable. No information has been submitted.";
}
