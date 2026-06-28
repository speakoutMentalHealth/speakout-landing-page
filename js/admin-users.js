
import { auth, db } from "./firebase-config.js";
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import { badge, fmtDate } from "./admin-cms.js";

const tbody = document.getElementById("usersTable");
const roleFilter = document.getElementById("roleFilter");
const statusFilter = document.getElementById("statusFilter");
let allUsers = [];

async function loadUsers(){
  const snap = await getDocs(collection(db, "users"));
  allUsers = snap.docs.map(d => ({id:d.id, ...d.data()}));
  render();
}

function render(){
  const role = roleFilter.value;
  const status = statusFilter.value;

  const rows = allUsers.filter(u => {
    return (!role || u.role === role) && (!status || u.status === status);
  });

  if(!rows.length){
    tbody.innerHTML = `<tr><td colspan="7" class="empty">No matching users.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(u => `
    <tr>
      <td>${u.fullName || "—"}</td>
      <td>${u.email || "—"}</td>
      <td>${u.role || "—"}</td>
      <td>${u.schoolName || u.schoolId || "—"}</td>
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
statusFilter?.addEventListener("change", render);

document.addEventListener("click", async e => {
  const approve = e.target.closest("[data-approve]");
  const suspend = e.target.closest("[data-suspend]");

  if(approve){
    await updateDoc(doc(db, "users", approve.dataset.approve), {
      approved:true,
      status:"approved",
      updatedAt:new Date()
    });
    await loadUsers();
  }

  if(suspend){
    await updateDoc(doc(db, "users", suspend.dataset.suspend), {
      approved:false,
      status:"suspended",
      updatedAt:new Date()
    });
    await loadUsers();
  }
});

loadUsers();
