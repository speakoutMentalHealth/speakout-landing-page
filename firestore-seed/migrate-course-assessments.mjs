import fs from "node:fs/promises";

const projectId = process.env.FIREBASE_PROJECT_ID || "speaakout-portal";
const token = process.env.FIREBASE_TOKEN || "";
const sourcePath = process.env.SOURCE_PACK || "firestore-seed/priority-courses.json";
if (!token) throw new Error("FIREBASE_TOKEN is required.");

const toFirestore = value => {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === "string") return { stringValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestore) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toFirestore(item)])) } };
};

const fields = data => Object.fromEntries(Object.entries(data).map(([key, value]) => [key, toFirestore(value)]));
const documentName = path => `projects/${projectId}/databases/(default)/documents/${path}`;
const courses = JSON.parse(await fs.readFile(sourcePath, "utf8"));
const now = new Date().toISOString();
const writes = [];
let assessmentCount = 0;

for (const course of courses) {
  if (!Array.isArray(course.modules) || !course.modules.length) continue;
  const safeModules = course.modules.map((module, moduleIndex) => {
    if (!module.quiz) return module;
    const id = `${course.id}__module__${moduleIndex}`;
    const questions = Array.isArray(module.quiz.questions) ? module.quiz.questions : [];
    writes.push({ update: { name: documentName(`courseAssessments/${id}`), fields: fields({ id, courseId: course.id, type: "module", moduleIndex, title: module.quiz.title || `Module ${moduleIndex + 1} Quiz`, passMark: Number(module.quiz.passMark || 70), questions, updatedAt: now }) } });
    assessmentCount++;
    return { ...module, quiz: { id, title: module.quiz.title || `Module ${moduleIndex + 1} Quiz`, passMark: Number(module.quiz.passMark || 70), questionCount: questions.length } };
  });
  let safeFinal = null;
  if (course.finalAssessment || course.finalQuiz) {
    const source = course.finalAssessment || course.finalQuiz;
    const id = `${course.id}__final`;
    const questions = Array.isArray(source.questions) ? source.questions : [];
    writes.push({ update: { name: documentName(`courseAssessments/${id}`), fields: fields({ id, courseId: course.id, type: "final", title: source.title || "Final Assessment", passMark: Number(source.passMark || 70), questions, updatedAt: now }) } });
    assessmentCount++;
    safeFinal = { id, title: source.title || "Final Assessment", passMark: Number(source.passMark || 70), questionCount: questions.length };
  }
  const updateFields = { modules: safeModules, assessmentSecurityVersion: 1, updatedAt: now };
  if (safeFinal) updateFields.finalAssessment = safeFinal;
  writes.push({
    update: { name: documentName(`courses/${course.id}`), fields: fields(updateFields) },
    updateMask: { fieldPaths: Object.keys(updateFields) }
  });
}

const response = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit`, {
  method: "POST",
  headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
  body: JSON.stringify({ writes })
});
const result = await response.json().catch(() => ({}));
if (!response.ok) throw new Error(result?.error?.message || `Firestore migration failed (${response.status}).`);
console.log(JSON.stringify({ projectId, assessmentsWritten: assessmentCount, coursesSanitized: writes.length - assessmentCount }));
