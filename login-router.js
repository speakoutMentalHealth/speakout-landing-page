// login-router.js
import { db } from "./firebase-config.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

export async function routeUserAfterLogin(user){
  if(!user){
    window.location.href = "login.html";
    return;
  }

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if(!userSnap.exists()){
    window.location.href = "pending-approval.html";
    return;
  }

  const profile = userSnap.data();
  const role = profile.role || "student";
  const status = profile.status || "pending";

  if(status !== "approved"){
    window.location.href = "pending-approval.html";
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const next = params.get("next");

  if(next && !next.startsWith("admin-")){
    window.location.href = next;
    return;
  }

  if(role === "admin"){
    window.location.href = "admin-dashboard.html";
    return;
  }

  if(role === "school"){
    window.location.href = "school-dashboard.html";
    return;
  }

  if(role === "teacher"){
    window.location.href = "teacher-dashboard.html";
    return;
  }

  if(role === "ambassador"){
    window.location.href = "ambassador-dashboard.html";
    return;
  }

  if(role === "parent"){
    window.location.href = "parent-dashboard.html";
    return;
  }

  window.location.href = "student-dashboard.html";
}
