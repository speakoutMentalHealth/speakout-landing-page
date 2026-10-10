import { requireRoles, renderRoleNav } from "../../launch-role-guard.js";
import { db } from "../../firebase-config.js";
import { doc, getDoc, setDoc, collection, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import { EDUCATION_STAGES, validPlacement, schoolPlacement, matchesPlacement } from "../education-levels.js";
import { isPublicBook, isPublicCourse } from "../content-visibility.js";
import { escapeHtml } from "./ui-utils.js";

const byId = id => document.getElementById(id);
let placement = null, currentUser = null, currentProfile = null, editable = false;
let tab = location.hash === "#materials" ? "materials" : "courses", courses = [], materials = [], catalogueErrors = [];
const stageFor = id => EDUCATION_STAGES.find(stage => stage.id === id);
const schoolLinked = profile => Boolean(profile.schoolId || profile.schoolCode);
const show = (text, error = false) => { byId("learningStatus").textContent = text; byId("learningStatus").className = error ? "notice bad" : "notice"; };

function selectedStage() { return document.querySelector('input[name="educationStage"]:checked')?.value || ""; }
function renderClasses(stageId, selected = "") {
  const classes = stageFor(stageId)?.classes || [];
  byId("classChoice").replaceChildren(new Option("Choose a class", ""), ...classes.map(value => new Option(value, value)));
  byId("classChoice").value = selected;
}
function renderPlacement() {
  const staff = currentProfile.role !== "student";
  byId("stageChoices").innerHTML = EDUCATION_STAGES.map(stage => `<label class="stage-choice"><input type="radio" name="educationStage" value="${stage.id}" required ${placement?.educationStage === stage.id ? "checked" : ""} ${!editable && !staff ? "disabled" : ""}><span>${stage.label}</span></label>`).join("");
  renderClasses(placement?.educationStage, placement?.classLevel);
  byId("classChoice").disabled = !editable && !staff;
  byId("savePlacement").hidden = !editable && !staff;
  byId("savePlacement").textContent = staff ? "View this class" : "Save my learning level";
  byId("placementHelp").textContent = staff ? "Choose a section and class to preview available learning." : schoolLinked(currentProfile)
    ? (placement ? "Your school’s recorded class selects your learning section. Contact your school if it needs updating." : "Your school has not recorded a supported class yet. Ask your school administrator to record your nursery, primary, secondary or tertiary class.")
    : "Save your education level and class. Your selection will be available when you sign in on another device.";
  byId("learningContent").hidden = false;
  document.querySelectorAll('input[name="educationStage"]').forEach(input => input.addEventListener("change", () => { renderClasses(input.value); byId("catalogue").hidden = true; }));
}

function safeUrl(value) { try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) ? url.href : ""; } catch { return ""; } }
function card(item) {
  const external = item.courseType === "external" || item.completionMethod === "certificate-upload";
  const details = external || item.courseType === "instructor-led";
  const href = tab === "courses" ? `${details ? "course-details" : "course-player"}.html?id=${encodeURIComponent(item.id)}` :
    [item.purchaseUrl, item.downloadUrl, item.bookUrl, item.fileUrl, item.readUrl].map(safeUrl).find(Boolean) || `book-reader.html?id=${encodeURIComponent(item.id)}`;
  const classLabel = Array.isArray(item.classLevels) ? item.classLevels.join(", ") : String(item.classLevels || "");
  return `<article class="learning-card"><span class="label">${escapeHtml(item.subject || String(item.category || (tab === "courses" ? "Course" : "Reading material")).replaceAll("-", " "))}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.shortDescription || item.description || "")}</p><p class="learning-meta">${escapeHtml(item.provider || item.author || item.authorName || "SpeakOut")} · ${escapeHtml(classLabel || "Across this education section")}${tab === "courses" && (item.difficulty || item.level) ? `<br>Difficulty: ${escapeHtml(item.difficulty || item.level)}` : ""}</p><a class="btn primary" href="${escapeHtml(href)}">${tab === "courses" ? (external ? "View course pathway" : "Open course") : item.purchaseUrl ? "View purchase options" : "Open material"}</a></article>`;
}

function render() {
  byId("catalogue").hidden = !validPlacement(placement);
  if (!validPlacement(placement)) return;
  const label = stageFor(placement.educationStage).label;
  byId("learningTitle").textContent = `${label} learning`;
  byId("placementLabel").textContent = placement.classLevel;
  byId("sectionHeading").textContent = `${label} courses and materials`;
  const availableCourses = courses.filter(item => matchesPlacement(item, placement));
  const availableMaterials = materials.filter(item => matchesPlacement(item, placement));
  byId("courseCount").textContent = availableCourses.length;
  byId("materialCount").textContent = availableMaterials.length;
  byId("coursesTab").setAttribute("aria-pressed", String(tab === "courses"));
  byId("materialsTab").setAttribute("aria-pressed", String(tab === "materials"));
  const query = byId("learningSearch").value.trim().toLowerCase();
  const items = (tab === "courses" ? availableCourses : availableMaterials).filter(item => `${item.title} ${item.subject || ""} ${item.category || ""} ${item.description || ""}`.toLowerCase().includes(query));
  byId("catalogueNote").textContent = "Class-specific items and resources marked for your whole education section appear here. Course difficulty is shown separately from school class. Provider courses may have their own enrolment requirements.";
  byId("resultCount").textContent = `${items.length} ${tab} shown for ${placement.classLevel}`;
  const error = catalogueErrors.includes(tab);
  byId("learningCards").innerHTML = error ? `<div class="learning-empty"><h3>Could not load ${tab}</h3><p>Refresh this page to try again. Your saved learning level is unchanged.</p></div>` : items.length ? items.map(card).join("") : `<div class="learning-empty"><h3>${query ? "No matching titles" : `No ${tab} ready for this class yet`}</h3><p>${query ? "Try a different subject or clear your search." : "New content must be reviewed and labelled for this education section before it appears here. We won’t substitute material intended for older learners."}</p></div>`;
}

byId("placementForm").addEventListener("submit", async event => {
  event.preventDefault();
  const next = { educationStage: selectedStage(), classLevel: byId("classChoice").value };
  if (!validPlacement(next)) return show("Choose a valid education section and class.", true);
  const staff = currentProfile.role !== "student";
  if (!editable && !staff) return;
  byId("savePlacement").disabled = true;
  try {
    if (editable) await setDoc(doc(db, "learningPreferences", currentUser.uid), { ...next, updatedAt: serverTimestamp() });
    placement = next;
    show(staff ? "Showing learning for the selected class." : "Your learning level has been saved.");
    render();
  } catch { show("Could not save your learning level. Please try again.", true); }
  finally { byId("savePlacement").disabled = false; }
});
byId("learningSearch").addEventListener("input", render);
for (const kind of ["courses", "materials"]) byId(`${kind}Tab`).addEventListener("click", () => { tab = kind; render(); });

requireRoles(["student", "teacher", "parent", "school_admin", "admin", "super_admin"], async (user, profile) => {
  currentUser = user; currentProfile = profile;
  renderRoleNav(profile, "My Learning");
  editable = profile.role === "student" && !schoolLinked(profile);
  placement = schoolPlacement(profile);
  if (editable) {
    try { const preference = await getDoc(doc(db, "learningPreferences", user.uid)); if (preference.exists() && validPlacement(preference.data())) placement = preference.data(); }
    catch { show("Your saved learning level could not be loaded. You can choose it again.", true); }
  }
  renderPlacement();
  const results = await Promise.allSettled([getDocs(collection(db, "courses")), getDocs(collection(db, "books"))]);
  const rows = result => { const items = []; result.value.forEach(snapshot => items.push({ ...snapshot.data(), id: snapshot.id })); return items; };
  if (results[0].status === "fulfilled") courses = rows(results[0]).filter(isPublicCourse); else catalogueErrors.push("courses");
  if (results[1].status === "fulfilled") materials = rows(results[1]).filter(isPublicBook); else catalogueErrors.push("materials");
  courses.sort((a,b) => String(a.title).localeCompare(String(b.title)));
  materials.sort((a,b) => String(a.title).localeCompare(String(b.title)));
  if (placement) show("Your learning section is ready."); else show(editable ? "Choose your education level and class to get started." : "Choose a class, or ask your school to update your learner record.");
  render();
});
