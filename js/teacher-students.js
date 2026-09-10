import { requireRoles, renderRoleNav } from "../launch-role-guard.js";
import { roleApi } from "./platform-api.js";

const escapeHtml = value => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#039;");

requireRoles(["teacher"], async (user, profile) => {
  renderRoleNav(profile, "Students");
  const container = document.querySelector("main section:nth-of-type(2) .container");
  if (!container) return;
  container.innerHTML = `
    <div class="notice" id="statusBox">Loading your authorized student roster...</div>
    <div class="grid g3" id="studentStats"></div>
    <div class="panel"><label for="studentSearch"><strong>Search students</strong></label><input id="studentSearch" placeholder="Name or Student ID"></div>
    <div class="grid g3" id="studentGrid"></div>`;
  const status = document.getElementById("statusBox");
  const stats = document.getElementById("studentStats");
  const search = document.getElementById("studentSearch");
  const grid = document.getElementById("studentGrid");
  try {
    const overview = await roleApi.overview();
    const students = overview.subjects || [];
    const progress = overview.progress || [];
    const certificates = overview.certificates || [];
    stats.innerHTML = `
      <div class="card"><span class="label">Students</span><h2>${students.length}</h2></div>
      <div class="card"><span class="label">Active courses</span><h2>${progress.filter(item => item.status !== "completed").length}</h2></div>
      <div class="card"><span class="label">Certificates</span><h2>${certificates.length}</h2></div>`;
    const render = () => {
      const term = search.value.trim().toLowerCase();
      const filtered = students.filter(student => `${student.fullName} ${student.studentId}`.toLowerCase().includes(term));
      grid.innerHTML = filtered.length ? filtered.map(student => {
        const records = progress.filter(item => item.userId === student.id);
        const completed = records.filter(item => item.status === "completed" || item.completed || item.percent >= 100).length;
        const certs = certificates.filter(item => item.userId === student.id).length;
        return `<article class="card"><span class="label">${escapeHtml(student.classLevel || "Student")}</span><h3>${escapeHtml(student.fullName)}</h3><p><b>Student ID:</b> ${escapeHtml(student.studentId || "—")}</p><p>${records.length} learning record${records.length === 1 ? "" : "s"} · ${completed} completed · ${certs} certificate${certs === 1 ? "" : "s"}</p></article>`;
      }).join("") : `<div class="notice warn">No authorized students match this search.</div>`;
    };
    search.addEventListener("input", render);
    render();
    status.textContent = overview.truncated ? "Roster loaded with the current result limit." : "Authorized student roster loaded.";
    status.className = "notice ok";
  } catch (error) {
    console.error(error);
    status.textContent = error.message || "Could not load the authorized student roster.";
    status.className = "notice bad";
  }
});
