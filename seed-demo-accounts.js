import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { doc,getDoc,setDoc,serverTimestamp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const statusBox=document.getElementById("statusBox");
const seedBtn=document.getElementById("seedBtn");
let currentUser=null;

function show(m,t=""){statusBox.textContent=m;statusBox.className="notice "+t}

async function isAdmin(user){
  if(!user) return false;
  const snap=await getDoc(doc(db,"users",user.uid));
  if(!snap.exists()) return false;
  const role=(snap.data().role||"").toLowerCase();
  return role==="admin" || role==="super_admin";
}

onAuthStateChanged(auth,async user=>{
  currentUser=user;
  if(!user){show("Login as super admin first.","bad");return;}
  if(await isAdmin(user)){show("Super admin verified. You can seed demo certificate.","ok");seedBtn.disabled=false;}
  else show("Access denied. Super admin only.","bad");
});

seedBtn.addEventListener("click",async()=>{
  seedBtn.disabled=true;
  try{
    const certId="demo-certificate-mental-health-foundations";
    await setDoc(doc(db,"certificates",certId),{
      certificateNumber:"SPK-2026-DEMO-001",
      verificationCode:"SPK-2026-DEMO-001",
      recipientId:currentUser.uid,
      recipientName:"Demo Student",
      recipientRole:"student",
      title:"Mental Health Foundations",
      issueDate:new Date().toISOString().slice(0,10),
      issuedBy:"SpeakOut Mental Health Outreach",
      status:"active",
      createdAt:serverTimestamp()
    },{merge:true});
    show("Demo certificate created. Open certificate-center.html","ok");
  }catch(e){
    console.error(e);
    show(e.message||"Seed failed.","bad");
    seedBtn.disabled=false;
  }
});
