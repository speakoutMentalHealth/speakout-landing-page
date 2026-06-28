
import { db } from "./firebase-config.js";
import { collection, addDoc, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const form = document.getElementById("schoolForm");
const tbody = document.getElementById("schoolsTable");

async function loadSchools(){
  const snap = await getDocs(collection(db, "schools"));
  const schools = snap.docs.map(d => ({id:d.id, ...d.data()}));

  if(!schools.length){
    tbody.innerHTML = `<tr><td colspan="6" class="empty">No schools yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = schools.map(s => `
    <tr>
      <td>${s.name || "—"}</td>
      <td>${s.schoolCode || s.id}</td>
      <td>${s.location || "—"}</td>
      <td>${s.coordinator || "—"}</td>
      <td>${s.status || "active"}</td>
      <td>${s.phone || "—"}</td>
    </tr>
  `).join("");
}

form?.addEventListener("submit", async e => {
  e.preventDefault();

  await addDoc(collection(db, "schools"), {
    name: document.getElementById("schoolName").value.trim(),
    schoolCode: document.getElementById("schoolCode").value.trim(),
    location: document.getElementById("location").value.trim(),
    coordinator: document.getElementById("coordinator").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    status: "active",
    createdAt: serverTimestamp()
  });

  form.reset();
  await loadSchools();
});

loadSchools();
