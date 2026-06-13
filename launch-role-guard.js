// launch-role-guard.js
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const dashboardRoutes = {
  super_admin: "admin-dashboard.html",
  admin: "admin-dashboard.html",
  school_admin: "school-dashboard.html",
  teacher: "teacher-dashboard.html",
  parent: "parent-dashboard.html",
  student: "student-dashboard.html",
  ambassador: "ambassador.html",
  contributor: "contributor-dashboard.html"
};

export function routeForRole(role){
  return dashboardRoutes[(role || "").toLowerCase().trim()] || "portal.html";
}

export function roleLabel(role){
  const labels = {
    super_admin: "Super Admin",
    admin: "Admin",
    school_admin: "School Admin",
    teacher: "Teacher",
    parent: "Parent",
    student: "Student",
    ambassador: "Ambassador",
    contributor: "Contributor"
  };
  return labels[(role || "").toLowerCase().trim()] || "User";
}

export async function getCurrentProfile(user){
  const snap = await getDoc(doc(db, "users", user.uid));
  if(!snap.exists()) return null;
  return { uid:user.uid, ...snap.data() };
}

export function requireRoles(allowedRoles, callback){
  onAuthStateChanged(auth, async user => {
    if(!user){
      location.href = "auth.html";
      return;
    }

    const profile = await getCurrentProfile(user);

    if(!profile){
      location.href = "auth.html#pending";
      return;
    }

    const role = (profile.role || "").toLowerCase().trim();
    const status = (profile.status || "").toLowerCase().trim();

    if(status !== "approved"){
      location.href = "portal.html";
      return;
    }

    const allowed = allowedRoles.map(r => r.toLowerCase().trim());

    if(!allowed.includes(role) && role !== "admin" && role !== "super_admin"){
      location.href = routeForRole(role);
      return;
    }

    callback(user, profile);
  });
}

export function renderRoleNav(profile, active = ""){
  const role = (profile.role || "").toLowerCase().trim();
  const linksByRole = {
    student: [
      ["Dashboard","student-dashboard.html"],
      ["My Courses","speakhub.html?audience=student"],
      ["Student Library","student-library.html"],
      ["Kiddies","kiddies.html"],
      ["Certificates","certificate-center.html"]
    ],
    parent: [
      ["Dashboard","parent-dashboard.html"],
      ["My Children","parent-child-link.html"],
      ["Parent Library","parent-library.html"],
      ["Workshops","workshops.html"],
      ["Certificates","certificate-center.html"]
    ],
    teacher: [
      ["Dashboard","teacher-dashboard.html"],
      ["Teacher Library","teacher-library.html"],
      ["Students","teacher-students.html"],
      ["Workshops","workshops.html"],
      ["Certificates","certificate-center.html"]
    ],
    school_admin: [
      ["Dashboard","school-dashboard.html"],
      ["Students","school-students.html"],
      ["Parents","school-parents.html"],
      ["Teachers","school-teachers.html"],
      ["Workshops","school-workshops.html"],
      ["Reports","school-reports.html"]
    ],
    admin: [
      ["Dashboard","admin-dashboard.html"],
      ["Schools","admin-schools.html"],
      ["Users","admin-users.html"],
      ["Content","admin-content-review.html"],
      ["Payments","admin-payments.html"]
    ],
    super_admin: [
      ["Dashboard","admin-dashboard.html"],
      ["Schools","admin-schools.html"],
      ["Users","admin-users.html"],
      ["Content","admin-content-review.html"],
      ["Payments","admin-payments.html"]
    ],
    contributor: [
      ["Dashboard","contributor-dashboard.html"],
      ["My Books","contributor-books.html"],
      ["My Courses","contributor-courses.html"],
      ["Sales","contributor-sales.html"]
    ],
    ambassador: [
      ["Dashboard","ambassador.html"],
      ["Courses","speakhub.html?audience=ambassador"],
      ["Certificates","certificate-center.html"]
    ]
  };

  const links = linksByRole[role] || [["Dashboard", routeForRole(role)]];
  const nav = document.getElementById("roleNav");

  if(!nav) return;

  nav.innerHTML = links.map(([label, href]) => {
    const cls = label.toLowerCase() === active.toLowerCase() ? "btn dark" : "btn soft";
    return `<a class="${cls}" href="${href}">${label}</a>`;
  }).join("") + `<button class="btn dark" id="logoutBtn">Logout</button>`;

  const logoutBtn = document.getElementById("logoutBtn");
  if(logoutBtn){
    logoutBtn.addEventListener("click", async () => {
      await signOut(auth);
      location.href = "auth.html";
    });
  }
}
