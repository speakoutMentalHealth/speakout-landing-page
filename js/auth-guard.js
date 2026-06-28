import { auth, db } from "./firebase-config.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const LOGIN_PAGE = "../../auth/auth.html";

function clean(value) {
  return (value || "").toString().trim();
}

function getRequiredRole() {
  return document.body?.dataset?.requiredRole || "";
}

function dashboardForRole(role) {
  const map = {
    student: "../../dashboards/student/",
    parent: "../../dashboards/parent/",
    teacher: "../../dashboards/teacher/",
    school_admin: "../../dashboards/school/",
    admin: "../../dashboards/admin/",
    super_admin: "../../dashboards/admin/",
    ambassador: "../../dashboards/student/"
  };

  return map[role] || LOGIN_PAGE;
}

function roleAllowed(requiredRole, actualRole) {
  if (!requiredRole) return true;

  if (requiredRole === actualRole) return true;

  if (requiredRole === "admin" && (actualRole === "admin" || actualRole === "super_admin")) {
    return true;
  }

  return false;
}

function showAccessDenied(message) {
  document.body.innerHTML = `
    <main style="min-height:100vh;display:grid;place-items:center;padding:24px;font-family:Outfit,Arial,sans-serif;background:#f7faff;color:#101828;">
      <section style="max-width:620px;background:#fff;border:1px solid #e5edf6;border-radius:28px;box-shadow:0 24px 70px rgba(6,21,47,.12);padding:32px;text-align:center;">
        <h1 style="margin:0 0 12px;color:#06152f;">Access Restricted</h1>
        <p style="color:#667085;line-height:1.7;">${message}</p>
        <a href="${LOGIN_PAGE}" style="display:inline-flex;margin-top:18px;padding:12px 18px;border-radius:999px;background:#0a68d8;color:#fff;text-decoration:none;font-weight:900;">Return to Login</a>
      </section>
    </main>
  `;
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = LOGIN_PAGE;
    return;
  }

  try {
    const snap = await getDoc(doc(db, "users", user.uid));

    if (!snap.exists()) {
      await signOut(auth);
      window.location.href = LOGIN_PAGE;
      return;
    }

    const profile = snap.data();
    const role = clean(profile.role).toLowerCase();
    const status = clean(profile.status).toLowerCase();
    const approved = profile.approved === true;
    const requiredRole = getRequiredRole();

    if (!approved || status !== "approved") {
      await signOut(auth);
      showAccessDenied("Your account is still pending approval. Please contact SpeakOut admin if you believe this is an error.");
      return;
    }

    if (!roleAllowed(requiredRole, role)) {
      showAccessDenied("You do not have permission to view this dashboard.");
      return;
    }

    document.body.classList.add("auth-ready");

    const nameTargets = document.querySelectorAll("[data-user-name]");
    nameTargets.forEach(el => {
      el.textContent = profile.fullName || "SpeakOut Member";
    });

    const roleTargets = document.querySelectorAll("[data-user-role]");
    roleTargets.forEach(el => {
      el.textContent = role.replace("_", " ");
    });

    const schoolTargets = document.querySelectorAll("[data-user-school]");
    schoolTargets.forEach(el => {
      el.textContent = profile.schoolName || profile.schoolId || "SpeakOut";
    });

  } catch (error) {
    console.error("Auth guard error:", error);
    await signOut(auth);
    window.location.href = LOGIN_PAGE;
  }
});
