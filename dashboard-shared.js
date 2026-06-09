// dashboard-shared.js
import { auth, db } from "./firebase-config.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { collection, getDocs, addDoc, doc, getDoc, query, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const logoutBtn = document.getElementById("logoutBtn");
if(logoutBtn){
  logoutBtn.onclick = async () => {
    await signOut(auth);
    location.href = "login.html";
  };
}

export const SO = {
  auth, db, collection, getDocs, addDoc, doc, getDoc, query, where, serverTimestamp, onAuthStateChanged,
  safe(v){ return v ?? "—"; },
  num(v){ return Number(v || 0).toLocaleString(); },
  badge(v){
    const raw = v || "pending";
    const cls = raw.toLowerCase().replaceAll(" ","").replaceAll("_","");
    return `<span class="badge ${cls}">${raw}</span>`;
  },
  async getAll(name){
    const snap = await getDocs(collection(db, name));
    const rows = [];
    snap.forEach(d => rows.push({ id:d.id, ...d.data() }));
    return rows;
  },
  async getMine(name, field, value){
    const q = query(collection(db, name), where(field, "==", value));
    const snap = await getDocs(q);
    const rows = [];
    snap.forEach(d => rows.push({ id:d.id, ...d.data() }));
    return rows;
  },
  async profile(uid){
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? {id:snap.id, ...snap.data()} : null;
  },
  msg(id, text, ok=true){
    const el = document.getElementById(id);
    if(!el) return;
    el.textContent = text;
    el.className = "message " + (ok ? "ok" : "bad");
    el.style.display = "block";
    setTimeout(() => el.style.display = "none", 4500);
  }
};
