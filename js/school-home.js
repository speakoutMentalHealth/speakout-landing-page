
import { countSchoolScoped, getSchoolScoped, badge, fmtDate } from "./school-dashboard.js";

window.addEventListener("schoolProfileReady", async () => {
  const students = await countSchoolScoped("users").catch(()=>0);
  const classes = await countSchoolScoped("classes").catch(()=>0);
  const announcements = await countSchoolScoped("schoolAnnouncements").catch(()=>0);
  const certificates = await countSchoolScoped("certificates").catch(()=>0);

  document.getElementById("statStudents").textContent = students;
  document.getElementById("statClasses").textContent = classes;
  document.getElementById("statAnnouncements").textContent = announcements;
  document.getElementById("statCertificates").textContent = certificates;

  const users = await getSchoolScoped("users").catch(()=>[]);
  const tbody = document.getElementById("recentUsers");
  const rows = users.slice(0, 8);

  if(!rows.length){
    tbody.innerHTML = `<tr><td colspan="5" class="empty">No school users yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(u => `
    <tr>
      <td>${u.fullName || "—"}</td>
      <td>${u.email || "—"}</td>
      <td>${u.role || "—"}</td>
      <td>${badge(u.status)}</td>
      <td>${fmtDate(u.createdAt)}</td>
    </tr>
  `).join("");
});
