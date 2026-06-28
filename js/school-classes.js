
import { db } from "./firebase-config.js";
import { collection, addDoc, getDocs, query, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import { schoolId } from "./school-dashboard.js";

const form = document.getElementById("classForm");
const tbody = document.getElementById("classesTable");

async function load(){
  const snap = await getDocs(query(collection(db, "classes"), where("schoolId", "==", schoolId())));
  const rows = snap.docs.map(d => ({id:d.id, ...d.data()}));

  if(!rows.length){
    tbody.innerHTML = `<tr><td colspan="5" class="empty">No classes yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(c => `
    <tr>
      <td>${c.name || "—"}</td>
      <td>${c.level || "—"}</td>
      <td>${c.teacher || "—"}</td>
      <td>${c.coordinator || "—"}</td>
      <td>${c.status || "active"}</td>
    </tr>
  `).join("");
}

form?.addEventListener("submit", async e => {
  e.preventDefault();

  await addDoc(collection(db, "classes"), {
    schoolId: schoolId(),
    name: document.getElementById("className").value.trim(),
    level: document.getElementById("level").value.trim(),
    teacher: document.getElementById("teacher").value.trim(),
    coordinator: document.getElementById("coordinator").value.trim(),
    status: "active",
    createdAt: serverTimestamp()
  });

  form.reset();
  await load();
});

window.addEventListener("schoolProfileReady", load);
