
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { doc, getDoc, collection, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const LOGIN = "../../auth/auth.html";

function $(id){ return document.getElementById(id); }

function setText(id, value){
  const el = $(id);
  if(el) el.textContent = value;
}

function roleOk(role){
  return role === "admin" || role === "super_admin";
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

  document.body.classList.add("auth-ready");
  document.querySelectorAll("[data-user-name]").forEach(el => el.textContent = profile.fullName || "Admin");
});

document.addEventListener("click", async e => {
  if(e.target.closest("[data-logout]")){
    await signOut(auth);
    window.location.href = LOGIN;
  }
});

export async function countCollection(name){
  const snap = await getDocs(collection(db, name));
  return snap.size;
}

export async function getLatest(name, max = 10){
  const snap = await getDocs(query(collection(db, name), limit(max)));
  return snap.docs.map(d => ({id:d.id, ...d.data()}));
}

export function badge(status){
  const s = (status || "pending").toLowerCase();
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
