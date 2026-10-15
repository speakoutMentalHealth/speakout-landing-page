import fs from "node:fs/promises";

const projectId = process.env.FIREBASE_PROJECT_ID || "speaakout-portal";
const token = process.env.FIREBASE_TOKEN || "";
const sourcePath = process.env.SOURCE_PACK || "";
if (!sourcePath) throw new Error("SOURCE_PACK must explicitly point to a reviewed private assessment source; the public priority-courses.json is unsafe.");
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
// Refuse the public, sanitized catalogue: it stores question counts, not private questions.
// Validation happens before any Firestore write so an incorrect SOURCE_PACK cannot erase quizzes.
let validatedAssessments = 0;
for (const course of courses) {
  if (!Array.isArray(course.modules) || !course.modules.length) continue;
  for (const [index, module] of course.modules.entries()) {
    if (!module.quiz) continue;
    const questions = module.quiz.questions;
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error(`Unsafe SOURCE_PACK: ${course.id} module ${index + 1} has quiz metadata without answer-bearing questions. Use a securely prepared private source pack, never priority-courses.json.`);
    }
    validatedAssessments++;
  }
  const final = course.finalAssessment || course.finalQuiz;
  if (final) {
    if (!Array.isArray(final.questions) || final.questions.length === 0) {
      throw new Error(`Unsafe SOURCE_PACK: ${course.id} final assessment has no answer-bearing questions. Refusing to overwrite protected assessments.`);
    }
    validatedAssessments++;
  }
}
if (!validatedAssessments) throw new Error("SOURCE_PACK has no validated assessments; refusing migration.");
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
