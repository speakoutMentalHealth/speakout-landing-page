
import { db } from "./firebase-config.js";
import { collection, addDoc, getDocs, query, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import { schoolId, fmtDate } from "./school-dashboard.js";

const type = document.body.dataset.schoolContent;
const colMap = {
  announcements: "schoolAnnouncements",
  resources: "schoolResources",
  reports: "schoolReports",
  certificates: "certificates"
};

const col = colMap[type];
const form = document.getElementById("contentForm");
const tbody = document.getElementById("contentTable");

async function load(){
  if(!col) return;
  const snap = await getDocs(query(collection(db, col), where("schoolId", "==", schoolId())));
  const rows = snap.docs.map(d => ({id:d.id, ...d.data()}));

  if(!rows.length){
    tbody.innerHTML = `<tr><td colspan="5" class="empty">No records yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.title || r.certificateNo || "—"}</td>
      <td>${r.category || r.type || r.userName || "—"}</td>
      <td>${r.status || "active"}</td>
      <td>${r.url || "—"}</td>
      <td>${fmtDate(r.createdAt || r.issuedAt)}</td>
    </tr>
  `).join("");
}

form?.addEventListener("submit", async e => {
  e.preventDefault();

  await addDoc(collection(db, col), {
    schoolId: schoolId(),
    title: document.getElementById("title").value.trim(),
    category: document.getElementById("category").value.trim(),
    type: document.getElementById("type").value.trim(),
    url: document.getElementById("url").value.trim(),
    description: document.getElementById("description").value.trim(),
    status: document.getElementById("status").value || "active",
    createdAt: serverTimestamp()
  });

  form.reset();
  await load();
});

window.addEventListener("schoolProfileReady", load);
