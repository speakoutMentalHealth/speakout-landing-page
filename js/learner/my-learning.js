import { requireRoles, renderRoleNav } from "../../launch-role-guard.js";
import { db } from "../../firebase-config.js";
import { doc, getDoc, setDoc, collection, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import { EDUCATION_STAGES, validPlacement, schoolPlacement, matchesPlacement, contentStages } from "../education-levels.js";
import { isPublicBook, isPublicCourse } from "../content-visibility.js";
import { contentTrack, contentTrackLabel } from "../content-tracks.js";
import { escapeHtml } from "./ui-utils.js";
import { PHASE2_VERIFIED_COURSES } from "../../phase2-verified-courses.js";

const byId = id => document.getElementById(id);
let placement = null, defaultPlacement = null, currentUser = null, currentProfile = null, editable = false;
let tab = location.hash === "#materials" ? "materials" : "courses", courses = [], materials = [], catalogueErrors = [];
const stageFor = id => EDUCATION_STAGES.find(stage => stage.id === id);
const schoolLinked = profile => Boolean(profile.schoolId || profile.schoolCode);
const show = (text, error = false) => { byId("learningStatus").textContent = text; byId("learningStatus").className = error ? "notice bad" : "notice"; };

function selectedStage() { return document.querySelector('input[name="educationStage"]:checked')?.value || ""; }
function renderClasses(stageId, selected = "") {
  const classes = stageFor(stageId)?.classes || [];
  byId("classChoice").replaceChildren(new Option("All classes / levels", ""), ...classes.map(value => new Option(value, value)));
  byId("classChoice").value = selected;
}
function renderPlacement() {
  const choices = stages => stages.map(stage => `<label class="stage-choice"><input type="radio" name="educationStage" value="${stage.id}" required ${placement?.educationStage === stage.id ? "checked" : ""}><span>${stage.label}</span></label>`).join("");
  byId("stageChoices").innerHTML = `<div class="stage-group"><h3>Kiddies Corner</h3><div class="stage-choices">${choices(EDUCATION_STAGES.slice(0,2))}</div></div><div class="stage-group"><h3>Secondary and tertiary</h3><div class="stage-choices">${choices(EDUCATION_STAGES.slice(2))}</div></div>`;
  renderClasses(placement?.educationStage, placement?.classLevel);
  byId("saveDefaultPlacement").hidden = !editable;
  byId("placementHelp").textContent = schoolLinked(currentProfile)
    ? `Your school’s recorded class${defaultPlacement ? ` (${defaultPlacement.classLevel})` : ""} is your default. Browse any section without changing your school record.`
    : "Browse any education section. Levels describe the content; they do not restrict access. Independent learners can also save a class as their default.";
  byId("learningContent").hidden = false;
  document.querySelectorAll('input[name="educationStage"]').forEach(input => input.addEventListener("change", () => { renderClasses(input.value); byId("catalogue").hidden = true; }));
}
const validBrowse = value => Boolean(stageFor(value?.educationStage) && (!value.classLevel || validPlacement(value)));
function browseSelection() {
  const next = { educationStage: selectedStage(), classLevel: byId("classChoice").value };
  if (!validBrowse(next)) { show("Choose an education section and a supported class, or all classes.", true); return null; }
  placement = next;
  const url = new URL(location.href);
  url.searchParams.set("stage", next.educationStage);
  if (next.classLevel) url.searchParams.set("class", next.classLevel); else url.searchParams.delete("class");
  history.replaceState(null, "", url);
  render();
  return next;
}

function safeUrl(value) { try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) ? url.href : ""; } catch { return ""; } }
function card(item) {
  const external = item.courseType === "external" || item.completionMethod === "certificate-upload";
  const details = external || item.courseType === "instructor-led";
  const href = tab === "courses" ? `${details ? "course-details" : "course-player"}.html?id=${encodeURIComponent(item.id)}` :
    [item.purchaseUrl, item.downloadUrl, item.bookUrl, item.fileUrl, item.readUrl].map(safeUrl).find(Boolean) || `book-reader.html?id=${encodeURIComponent(item.id)}`;
  const classLabel = Array.isArray(item.classLevels) ? item.classLevels.join(", ") : String(item.classLevels || "");
  return `<article class="learning-card"><p class="education-label">${escapeHtml(contentStages(item).map(id => stageFor(id)?.label).filter(Boolean).join(" · "))}</p><p class="learning-meta">${escapeHtml(contentTrackLabel(item))}</p><span class="label">${escapeHtml(item.subject || String(item.category || (tab === "courses" ? "Course" : "Reading material")).replaceAll("-", " "))}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.shortDescription || item.description || "")}</p><p class="learning-meta">${escapeHtml(item.provider || item.author || item.authorName || "SpeakOut")} · ${escapeHtml(classLabel || "Across this education section")}${tab === "courses" && (item.difficulty || item.level) ? `<br>Difficulty: ${escapeHtml(item.difficulty || item.level)}` : ""}</p><a class="btn primary" href="${escapeHtml(href)}">${tab === "courses" ? (external ? "View course pathway" : "Open course") : item.purchaseUrl ? "View purchase options" : "Open material"}</a></article>`;
}

function render() {
  byId("catalogue").hidden = !validBrowse(placement);
  if (!validBrowse(placement)) return;
  const label = stageFor(placement.educationStage).label;
  byId("learningTitle").textContent = `${["nursery", "primary"].includes(placement.educationStage) ? "Kiddies Corner · " : ""}${label} learning`;
  byId("placementLabel").textContent = placement.classLevel || "All classes / levels";
  byId("sectionHeading").textContent = `${label} courses and materials`;
  const track=byId('contentTrackFilter').value;
  const matches=item=>matchesPlacement(item, placement, { allClasses: !placement.classLevel })&&(!track||contentTrack(item)===track);
  const availableCourses = courses.filter(matches);
  const availableMaterials = materials.filter(matches);
  byId("courseCount").textContent = availableCourses.length;
  byId("materialCount").textContent = availableMaterials.length;
  byId("coursesTab").setAttribute("aria-pressed", String(tab === "courses"));
  byId("materialsTab").setAttribute("aria-pressed", String(tab === "materials"));
  const query = byId("learningSearch").value.trim().toLowerCase();
  const items = (tab === "courses" ? availableCourses : availableMaterials).filter(item => `${item.title} ${item.subject || ""} ${item.category || ""} ${item.description || ""}`.toLowerCase().includes(query));
  byId("catalogueNote").textContent = "Education levels and classes are content labels, not access restrictions. Browse any section above. Course difficulty is separate from school class. Provider courses may have their own enrolment requirements.";
  byId("resultCount").textContent = `${items.length} ${tab} shown for ${placement.classLevel || label}`;
  const error = catalogueErrors.includes(tab);
  byId("learningCards").innerHTML = error ? `<div class="learning-empty"><h3>Could not load ${tab}</h3><p>Refresh this page to try again. Your saved learning level is unchanged.</p></div>` : items.length ? items.map(card).join("") : `<div class="learning-empty"><h3>${query ? "No matching titles" : track ? `No ${tab} match this content type` : `No ${tab} ready for this class yet`}</h3><p>${query ? "Try a different subject or clear your search." : track ? "Choose All content types to see other available resources for this section." : "Reviewed content for this section will appear here when ready. You can browse another section above; its courses and materials will clearly show their education level."}</p></div>`;
}

byId("placementForm").addEventListener("submit", event => {
  event.preventDefault();
  if (browseSelection()) show("Showing the selected section. Your default class is unchanged.");
});
byId("saveDefaultPlacement").addEventListener("click", async () => {
  if (!editable) return;
  const next = browseSelection();
  if (!next) return;
  if (!validPlacement(next)) return show("Choose a specific class to save as your default.", true);
  byId("saveDefaultPlacement").disabled = true;
  try {
    await setDoc(doc(db, "learningPreferences", currentUser.uid), { ...next, updatedAt: serverTimestamp() });
    defaultPlacement = next;
    show("Your default learning level has been saved.");
  } catch { show("Could not save your learning level. Please try again.", true); }
  finally { byId("saveDefaultPlacement").disabled = false; }
});
byId("learningSearch").addEventListener("input", render);
byId('contentTrackFilter').addEventListener('change',render);
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
  defaultPlacement = placement;
  const query = new URLSearchParams(location.search);
  const requested = { educationStage: query.get("stage"), classLevel: query.get("class") || "" };
  if (validBrowse(requested)) placement = requested;
  renderPlacement();
  const results = await Promise.allSettled([getDocs(collection(db, "courses")), getDocs(collection(db, "books"))]);
  const rows = result => { const items = []; result.value.forEach(snapshot => items.push({ ...snapshot.data(), id: snapshot.id })); return items; };
  if (results[0].status === "fulfilled") {
    const catalogue = new Map(PHASE2_VERIFIED_COURSES.map(item => [item.id, item]));
    // Stored records override bundled entries, including an explicit withdrawal
    // or empty classification. Do not restore a withdrawn course via fallback.
    rows(results[0]).forEach(item => catalogue.set(item.id, { ...catalogue.get(item.id), ...item }));
    courses = [...catalogue.values()].filter(isPublicCourse);
  } else catalogueErrors.push("courses");
  if (results[1].status === "fulfilled") materials = rows(results[1]).filter(isPublicBook); else catalogueErrors.push("materials");
  courses.sort((a,b) => String(a.title).localeCompare(String(b.title)));
  materials.sort((a,b) => String(a.title).localeCompare(String(b.title)));
  if (placement) show("Your learning section is ready."); else show("Choose your education level and class to get started.");
  render();
});
