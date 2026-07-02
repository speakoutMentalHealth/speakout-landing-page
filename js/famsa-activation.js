
import { auth, db } from "./firebase-config.js";
import { createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const SCHOOL={name:"FAMSA College of Health Science and Technology",code:"FAMSA001",type:"College of Health Science and Technology"};
let currentStep=0;
const steps=[...document.querySelectorAll("[data-step]")];
const progress=document.querySelector("[data-progress]");
const msg=document.querySelector("[data-message]");
function showMessage(t,type="ok"){if(!msg){alert(t);return}msg.textContent=t;msg.className="message "+type}
function showStep(i){currentStep=Math.max(0,Math.min(i,steps.length-1));steps.forEach((s,n)=>s.classList.toggle("active",n===currentStep));if(progress)progress.style.width=`${((currentStep+1)/steps.length)*100}%`;document.querySelectorAll("[data-step-count]").forEach(e=>e.textContent=`${currentStep+1} of ${steps.length}`)}
function value(id){return document.getElementById(id)?.value?.trim()||""}
function checked(name){return [...document.querySelectorAll(`[name="${name}"]:checked`)].map(x=>x.value)}
document.querySelectorAll("[data-next]").forEach(b=>b.onclick=()=>showStep(currentStep+1));
document.querySelectorAll("[data-prev]").forEach(b=>b.onclick=()=>showStep(currentStep-1));

document.querySelector("[data-create-admin]")?.addEventListener("click",async()=>{
 const fullName=value("adminName"),position=value("adminPosition"),email=value("adminEmail"),phone=value("adminPhone"),password=value("adminPassword"),confirm=value("adminConfirmPassword");
 if(!fullName||!position||!email||!password){showMessage("Please complete administrator name, position, email and password.","bad");return}
 if(password!==confirm){showMessage("Passwords do not match.","bad");return}
 if(password.length<6){showMessage("Password must be at least 6 characters.","bad");return}
 try{
  showMessage("Creating FAMSA administrator account...","warn");
  const credential=await createUserWithEmailAndPassword(auth,email,password);
  await updateProfile(credential.user,{displayName:fullName});
  await setDoc(doc(db,"users",credential.user.uid),{uid:credential.user.uid,fullName,position,email,phone,role:"school_admin",status:"approved",schoolName:SCHOOL.name,schoolCode:SCHOOL.code,schoolType:SCHOOL.type,setupStatus:"in_progress",setupProgress:25,createdByInvite:true,createdAt:serverTimestamp(),updatedAt:serverTimestamp()},{merge:true});
  await setDoc(doc(db,"schools",SCHOOL.code),{schoolName:SCHOOL.name,schoolCode:SCHOOL.code,schoolType:SCHOOL.type,adminUid:credential.user.uid,adminName:fullName,adminEmail:email,adminPhone:phone,activationStatus:"activated",setupStatus:"in_progress",partnershipStatus:"pilot",createdAt:serverTimestamp(),updatedAt:serverTimestamp()},{merge:true});
  showMessage("Administrator created. Continue the setup wizard.","ok");showStep(currentStep+1);
 }catch(e){console.error(e);let clean=e.message||"Could not create administrator.";if(clean.includes("email-already-in-use"))clean="This email already exists. Please login or use another email.";showMessage(clean,"bad")}
});

document.querySelector("[data-finish-setup]")?.addEventListener("click",async()=>{
 try{
  await setDoc(doc(db,"schools",SCHOOL.code),{schoolName:SCHOOL.name,schoolCode:SCHOOL.code,website:value("schoolWebsite"),address:value("schoolAddress"),schoolPhone:value("schoolPhone"),population:value("population"),departments:checked("departments"),levels:checked("levels"),modules:checked("modules"),setupStatus:"completed",setupProgress:100,updatedAt:serverTimestamp()},{merge:true});
  showMessage("Setup saved. Opening FAMSA school dashboard...","ok");
  setTimeout(()=>{window.location.href="../../dashboards/school/index.html"},1200);
 }catch(e){console.error(e);showMessage("Setup could not be saved, but you can still open the dashboard.","warn");setTimeout(()=>{window.location.href="../../dashboards/school/index.html"},1500)}
});
showStep(0);
