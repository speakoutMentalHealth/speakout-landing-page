
import { db } from "./firebase-config.js";
import { collection, getDocs, query, where, doc, updateDoc } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import { schoolId, badge, fmtDate } from "./school-dashboard.js";

const tbody = document.getElementById("peopleTable");
const roleFilter = document.getElementById("roleFilter");
let all = [];

async function load(){
  const snap = await getDocs(query(collection(db, "users"), where("schoolId", "==", schoolId())));
  all = snap.docs.map(d => ({id:d.id, ...d.data()}));
  render();
}

function render(){
  const role = roleFilter?.value || "";
  const rows = all.filter(u => !role || u.role === role);

  if(!rows.length){
    tbody.innerHTML = `<tr><td colspan="7" class="empty">No matching records.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(u => `
    <tr>
      <td>${u.fullName || "—"}</td>
      <td>${u.email || "—"}</td>
      <td>${u.role || "—"}</td>
      <td>${u.phone || "—"}</td>
      <td>${badge(u.status)}</td>
      <td>${fmtDate(u.createdAt)}</td>
      <td>
        <button class="btn success" data-approve="${u.id}">Approve</button>
        <button class="btn danger" data-suspend="${u.id}">Suspend</button>
      </td>
    </tr>
  `).join("");
}

roleFilter?.addEventListener("change", render);

document.addEventListener("click", async e => {
  const approve = e.target.closest("[data-approve]");
  const suspend = e.target.closest("[data-suspend]");

  if(approve){
    await updateDoc(doc(db, "users", approve.dataset.approve), {approved:true,status:"approved",updatedAt:new Date()});
    await load();
  }

  if(suspend){
    await updateDoc(doc(db, "users", suspend.dataset.suspend), {approved:false,status:"suspended",updatedAt:new Date()});
    await load();
  }
});

window.addEventListener("schoolProfileReady", load);
