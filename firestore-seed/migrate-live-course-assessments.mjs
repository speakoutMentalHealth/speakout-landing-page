const projectId = process.env.FIREBASE_PROJECT_ID || "speaakout-portal";
const token = process.env.FIREBASE_TOKEN || "";
const dryRun = process.env.DRY_RUN === "true";
if (!token) throw new Error("FIREBASE_TOKEN is required.");

const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)`;
const headers = { authorization: `Bearer ${token}`, "content-type": "application/json" };
const decodeFields = fields => Object.fromEntries(Object.entries(fields || {}).map(([key, value]) => [key, fromFirestore(value)]));
function fromFirestore(value) {
  if (!value) return null;
  if ("nullValue" in value) return null;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("stringValue" in value) return value.stringValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(fromFirestore);
  if ("mapValue" in value) return decodeFields(value.mapValue.fields);
  return null;
}
function toFirestore(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === "string") return { stringValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestore) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toFirestore(item)])) } };
}
const fields = data => Object.fromEntries(Object.entries(data).map(([key, value]) => [key, toFirestore(value)]));
const name = path => `projects/${projectId}/databases/(default)/documents/${path}`;

async function listCourses() {
  const courses = [];
  let pageToken = "";
  do {
    const url = new URL(`${base}/documents/courses`);
    url.searchParams.set("pageSize", "100");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const response = await fetch(url, { headers });
    const page = await response.json();
    if (!response.ok) throw new Error(page?.error?.message || "Could not list courses.");
    for (const document of page.documents || []) courses.push({ id: document.name.split("/").pop(), ...decodeFields(document.fields) });
    pageToken = page.nextPageToken || "";
  } while (pageToken);
  return courses;
}

const now = new Date().toISOString();
const writes = [];
let assessmentsWritten = 0;
let coursesSanitized = 0;
const affectedCourseIds = [];
for (const course of await listCourses()) {
  if (!Array.isArray(course.modules)) continue;
  let changed = false;
  const modules = course.modules.map((module, moduleIndex) => {
    const source = module?.quiz;
    if (!source || !Array.isArray(source.questions) || !source.questions.length) return module;
    changed = true;
    const id = `${course.id}__module__${moduleIndex}`;
    writes.push({ update: { name: name(`courseAssessments/${id}`), fields: fields({ id, courseId: course.id, type: "module", moduleIndex, title: source.title || `Module ${moduleIndex + 1} Quiz`, passMark: Number(source.passMark || 70), questions: source.questions, updatedAt: now }) } });
    assessmentsWritten++;
    return { ...module, quiz: { id, title: source.title || `Module ${moduleIndex + 1} Quiz`, passMark: Number(source.passMark || 70), questionCount: source.questions.length } };
  });
  const finalSource = course.finalAssessment || course.finalQuiz;
  let finalAssessment = course.finalAssessment;
  if (finalSource && Array.isArray(finalSource.questions) && finalSource.questions.length) {
    changed = true;
    const id = `${course.id}__final`;
    writes.push({ update: { name: name(`courseAssessments/${id}`), fields: fields({ id, courseId: course.id, type: "final", title: finalSource.title || "Final Assessment", passMark: Number(finalSource.passMark || 70), questions: finalSource.questions, updatedAt: now }) } });
    assessmentsWritten++;
    finalAssessment = { id, title: finalSource.title || "Final Assessment", passMark: Number(finalSource.passMark || 70), questionCount: finalSource.questions.length };
  }
  if (!changed) continue;
  const data = { modules, finalAssessment, assessmentSecurityVersion: 1, updatedAt: now };
  writes.push({
    update: { name: name(`courses/${course.id}`), fields: fields(data) },
    updateMask: { fieldPaths: ["modules", "finalAssessment", "finalQuiz", "assessmentSecurityVersion", "updatedAt"] }
  });
  coursesSanitized++;
  affectedCourseIds.push(course.id);
}

if (!dryRun) {
  for (let start = 0; start < writes.length; start += 400) {
    const response = await fetch(`${base}/documents:commit`, { method: "POST", headers, body: JSON.stringify({ writes: writes.slice(start, start + 400) }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result?.error?.message || `Firestore migration failed (${response.status}).`);
  }
}
console.log(JSON.stringify({ projectId, dryRun, assessmentsWritten, coursesSanitized, affectedCourseIds }));
