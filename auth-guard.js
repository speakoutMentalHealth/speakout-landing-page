// auth-guard.js
// SpeakOut Portal Access Control
// Protects approved-only pages and admin-only pages.

import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const currentPage = window.location.pathname.split("/").pop() || "index.html";

/*
  Public pages are open to everyone.
  Keep index.html public. Keep login/register public.
*/
const publicPages = [
  "index.html",
  "",
  "login.html",
  "register.html",
  "forgot-password.html",
  "verify-certificate.html"
];

/*
  Admin-only pages.
  Only users with role = admin AND status = approved can access these.
*/
const adminOnlyPages = [
  "admin-dashboard.html",
  "admin-users.html",
  "admin-schools.html",
  "admin-books.html",
  "admin-courses.html",
  "admin-certificates.html",
  "admin-analytics.html",
  "admin-progress.html"
];

/*
  Approved portal pages.
  Any approved user can access these.
*/
const approvedOnlyPages = [
  "student-dashboard.html",
  "school-dashboard.html",
  "student-progress.html",
  "e-library.html",
  "speakhub.html",
  "kiddies.html",
  "school-resources.html",
  "submit-work.html"
];

function redirectToLogin(){
  const next = encodeURIComponent(currentPage);
  window.location.href = `login.html?next=${next}`;
}

function redirectToPending(){
  window.location.href = "pending-approval.html";
}

function redirectToDashboard(role){
  if(role === "admin") window.location.href = "admin-dashboard.html";
  else if(role === "school") window.location.href = "school-dashboard.html";
  else window.location.href = "student-dashboard.html";
}

function isPublicPage(){
  return publicPages.includes(currentPage);
}

function isAdminPage(){
  return adminOnlyPages.includes(currentPage);
}

function isApprovedPage(){
  return approvedOnlyPages.includes(currentPage);
}

async function getUserProfile(uid){
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if(!snap.exists()) return null;
  return snap.data();
}

onAuthStateChanged(auth, async (user) => {
  try{
    if(isPublicPage()){
      return;
    }

    if(!user){
      redirectToLogin();
      return;
    }

    const profile = await getUserProfile(user.uid);

    if(!profile){
      await signOut(auth);
      redirectToLogin();
      return;
    }

    const role = profile.role || "student";
    const status = profile.status || "pending";

    if(status !== "approved"){
      if(currentPage !== "pending-approval.html"){
        redirectToPending();
      }
      return;
    }

    if(isAdminPage() && role !== "admin"){
      redirectToDashboard(role);
      return;
    }

    if(isApprovedPage()){
      return;
    }

  }catch(error){
    console.error("Auth guard error:", error);
    await signOut(auth);
    redirectToLogin();
  }
});
