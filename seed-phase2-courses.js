import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { doc, getDoc, writeBatch, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import { PHASE2_VERIFIED_COURSES } from "./phase2-verified-courses.js";

async function isAdmin(user){
  if(!user) return false;
  const snap=await getDoc(doc(db,"users",user.uid));
  if(!snap.exists()) return false;
  const p=snap.data();
  const role=(p.role||"").toLowerCase();
  return (role==="admin"||role==="super_admin") &&
    (p.status==="approved"||p.approved===true);
}

async function installCatalogue(){
  const user=auth.currentUser;
  if(!await isAdmin(user)) throw new Error("Only an approved SpeakOut admin can install this catalogue.");

  const chunkSize=400;
  let installed=0;

  for(let i=0;i<PHASE2_VERIFIED_COURSES.length;i+=chunkSize){
    const batch=writeBatch(db);
    PHASE2_VERIFIED_COURSES.slice(i,i+chunkSize).forEach(course=>{
      const ref=doc(db,"courses",course.id);
      batch.set(ref,{
        ...course,
        phase:"phase-2-verified-external",
        updatedAt:serverTimestamp()
      },{merge:true});
      installed++;
    });
    await batch.commit();
  }

  return {installed,total:PHASE2_VERIFIED_COURSES.length};
}

window.installPhase2VerifiedCatalogue=installCatalogue;

onAuthStateChanged(auth,async user=>{
  const status=document.getElementById("seedStatus");
  const button=document.getElementById("seedButton");
  if(!status||!button) return;

  if(!user){
    status.textContent="Sign in as an approved SpeakOut administrator first.";
    button.disabled=true;
    return;
  }

  if(!await isAdmin(user)){
    status.textContent="This installer is restricted to approved administrators.";
    button.disabled=true;
    return;
  }

  status.textContent="Admin verified. The verified Phase 2 catalogue is ready to install.";
  status.className="notice ok";
  button.disabled=false;
});
