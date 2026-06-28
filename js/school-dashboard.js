
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { doc, getDoc, collection, getDocs, query, where, limit } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const LOGIN = "../../auth/auth.html";

export let currentUser = null;
export let currentProfile = null;

function roleOk(role){
  return role === "school_admin" || role === "admin" || role === "super_admin";
}

export function schoolId(){
  return currentProfile?.schoolId || currentProfile?.schoolCode || "";
}

export function schoolName(){
  return currentProfile?.schoolName || "Your School";
}

export function badge(status){
  const s = (status || "active").toLowerCase();
  return `<span class="badge ${s}">${s}</span>`;
}

export function fmtDate(v){
  try{
    if(v?.toDate) return v.toDate().toLocaleDateString();
    return v || "";
  }catch{
    return "";
  }
}

export async function getSchoolScoped(collectionName){
  const sid = schoolId();
  const snap = await getDocs(query(collection(db, collectionName), where("schoolId", "==", sid)));
  return snap.docs.map(d => ({id:d.id, ...d.data()}));
}

export async function countSchoolScoped(collectionName){
  return (await getSchoolScoped(collectionName)).length;
}

onAuthStateChanged(auth, async user => {
  if(!user){
    window.location.href = LOGIN;
    return;
  }

  const snap = await getDoc(doc(db, "users", user.uid));

  if(!snap.exists()){
    await signOut(auth);
    window.location.href = LOGIN;
    return;
  }

  const profile = snap.data();
  const role = (profile.role || "").toLowerCase();
  const status = (profile.status || "").toLowerCase();

  if(profile.approved !== true || status !== "approved" || !roleOk(role)){
    await signOut(auth);
    window.location.href = LOGIN;
    return;
  }

  currentUser = user;
  currentProfile = profile;

  document.body.classList.add("auth-ready");
  document.querySelectorAll("[data-user-name]").forEach(el => el.textContent = profile.fullName || "School Admin");
  document.querySelectorAll("[data-user-school]").forEach(el => el.textContent = schoolName());
  window.dispatchEvent(new CustomEvent("schoolProfileReady", {detail: profile}));
});

document.addEventListener("click", async e => {
  if(e.target.closest("[data-logout]")){
    await signOut(auth);
    window.location.href = LOGIN;
  }
});
