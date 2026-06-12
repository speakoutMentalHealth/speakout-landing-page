
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

export async function requireSchoolAdmin(onReady){
  onAuthStateChanged(auth, async user => {
    if(!user){ location.href = "auth.html"; return; }

    const userSnap = await getDoc(doc(db, "users", user.uid));
    if(!userSnap.exists()){ location.href = "auth.html#pending"; return; }

    const profile = { uid:user.uid, ...userSnap.data() };
    const role = (profile.role || "").toLowerCase();
    const status = (profile.status || "").toLowerCase();

    if(status !== "approved"){
      document.body.innerHTML = "<div style='font-family:Arial;padding:30px'>Your account is not approved yet.</div>";
      return;
    }

    if(role !== "school_admin" && role !== "admin" && role !== "super_admin"){
      document.body.innerHTML = "<div style='font-family:Arial;padding:30px'>Access denied. School admin only.</div>";
      return;
    }

    if(!profile.schoolId && role === "school_admin"){
      document.body.innerHTML = "<div style='font-family:Arial;padding:30px'>No school is connected to this account. Contact SpeakOut admin.</div>";
      return;
    }

    let school = null;
    if(profile.schoolId){
      const schoolSnap = await getDoc(doc(db, "schools", profile.schoolId));
      if(schoolSnap.exists()) school = { id: schoolSnap.id, ...schoolSnap.data() };
    }

    await onReady(user, profile, school);
  });
}
