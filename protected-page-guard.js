// protected-page-guard.js
// Add before </body> in e-library.html, speakhub.html, kiddies.html, ambassador.html:
// <script type="module" src="protected-page-guard.js"></script>

import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import { canAccessPage } from "./role-access.js";

const pageName = location.pathname.split("/").pop().toLowerCase();

onAuthStateChanged(auth, async user => {
  if (!user) {
    location.href = "auth.html";
    return;
  }

  const snap = await getDoc(doc(db, "users", user.uid));

  if (!snap.exists()) {
    location.href = "auth.html#pending";
    return;
  }

  const profile = snap.data();

  if (profile.status !== "approved") {
    location.href = "auth.html#pending";
    return;
  }

  if (!canAccessPage(profile.role, pageName)) {
    alert("You do not have access to this section. Please contact SpeakOut admin.");
    location.href = "portal.html";
    return;
  }

  document.body.classList.add("access-approved");
});

