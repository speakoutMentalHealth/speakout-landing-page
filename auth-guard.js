import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const currentPage = window.location.pathname.split("/").pop();

const adminOnlyPages = ["admin-dashboard.html"];
const schoolOnlyPages = ["school-dashboard.html"];
const studentOnlyPages = ["student-dashboard.html"];

function redirect(page){
  window.location.href = page;
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    redirect("login.html");
    return;
  }

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    redirect("pending.html");
    return;
  }

  const profile = userSnap.data();

  if (profile.status !== "approved") {
    redirect("pending.html");
    return;
  }

  if (adminOnlyPages.includes(currentPage) && profile.role !== "admin") {
    redirect(profile.role === "school" ? "school-dashboard.html" : "student-dashboard.html");
    return;
  }

  if (schoolOnlyPages.includes(currentPage) && profile.role !== "school" && profile.role !== "admin") {
    redirect("student-dashboard.html");
    return;
  }

  if (studentOnlyPages.includes(currentPage) && profile.role !== "student" && profile.role !== "admin") {
    redirect("school-dashboard.html");
    return;
  }
});
