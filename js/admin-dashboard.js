
import { countCollection, getLatest, badge, fmtDate } from "./admin-cms.js";

async function loadDashboard(){
  const users = await countCollection("users").catch(()=>0);
  const schools = await countCollection("schools").catch(()=>0);
  const news = await countCollection("newsEvents").catch(()=>0);
  const resources = await countCollection("studentResources").catch(()=>0);

  document.getElementById("statUsers").textContent = users;
  document.getElementById("statSchools").textContent = schools;
  document.getElementById("statNews").textContent = news;
  document.getElementById("statResources").textContent = resources;

  const latestUsers = await getLatest("users", 8).catch(()=>[]);
  const tbody = document.getElementById("latestUsers");

  if(!latestUsers.length){
    tbody.innerHTML = `<tr><td colspan="5" class="empty">No users yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = latestUsers.map(u => `
    <tr>
      <td>${u.fullName || "—"}</td>
      <td>${u.email || "—"}</td>
      <td>${u.role || "—"}</td>
      <td>${badge(u.status)}</td>
      <td>${fmtDate(u.createdAt)}</td>
    </tr>
  `).join("");
}

loadDashboard();
