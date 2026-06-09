// auth-guard.js
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
const page=location.pathname.split("/").pop()||"index.html";
const publicPages=["index.html","","auth.html"];
onAuthStateChanged(auth,async user=>{
  if(publicPages.includes(page)) return;
  if(!user){location.href="auth.html";return}
  const snap=await getDoc(doc(db,"users",user.uid));
  if(!snap.exists()){location.href="auth.html#pending";return}
  const p=snap.data();
  if(p.status!=="approved"){location.href="auth.html#pending";return}
  if(page==="admin.html" && p.role!=="admin"){location.href="portal.html";return}
});
