import { auth } from "./firebase-config.js";
import { PLATFORM_API_BASE as configuredApiBase } from "./platform-config.js";

/* Public, non-secret deployment setting. Set this to the production
   Cloudflare Worker origin only after that Worker has been deployed. */
export const PLATFORM_API_BASE = String(configuredApiBase || "").replace(/\/$/, "");

function endpoint(path) {
  if (!PLATFORM_API_BASE) {
    throw new Error(
      "Secure learning is temporarily unavailable while the production API is being configured."
    );
  }
  return `${PLATFORM_API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

async function authorizationHeader() {
  const user = auth.currentUser;
  if (!user) throw new Error("You must be signed in.");
  return `Bearer ${await user.getIdToken()}`;
}

async function parseResponse(response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || body.message || "The secure service could not complete this request.");
  }
  return body;
}

export async function platformRequest(path, payload = {}) {
  const response = await fetch(endpoint(path), {
    method: "POST",
    headers: {
      Authorization: await authorizationHeader(),
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload),
    credentials: "omit"
  });
  return parseResponse(response);
}

export async function submitExternalLearning(file, fields) {
  if (!(file instanceof File)) throw new Error("Select a file to upload.");
  const form = new FormData();
  form.append("file", file);
  for (const [key, value] of Object.entries(fields || {})) form.append(key, String(value ?? ""));
  const response = await fetch(endpoint("/v1/external-learning/submit"), {
    method: "POST",
    headers: { Authorization: await authorizationHeader() },
    body: form,
    credentials: "omit"
  });
  return parseResponse(response);
}

export const externalLearningApi = {
  status: courseId => platformRequest("/v1/external-learning/status", { courseId }),
  submit: submitExternalLearning
};

export async function retrieveEvidence(recordId) {
  const response = await fetch(endpoint("/v1/admin/media/evidence"), {
    method: "POST",
    headers: {
      Authorization: await authorizationHeader(),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ recordId }),
    credentials: "omit",
    cache: "no-store"
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || body.message || "The evidence could not be retrieved securely.");
  }
  return response.blob();
}

export const learningApi = {
  dashboard: () => platformRequest("/v1/learning/dashboard"),
  enroll: courseId => platformRequest("/v1/learning/enroll", { courseId }),
  state: courseId => platformRequest("/v1/learning/state", { courseId }),
  completeLesson: (courseId, lessonId) =>
    platformRequest("/v1/learning/lessons/complete", { courseId, lessonId }),
  assessment: (courseId, type, moduleIndex = null) =>
    platformRequest("/v1/learning/assessments/get", { courseId, type, moduleIndex }),
  submitAssessment: (courseId, type, moduleIndex, answers) =>
    platformRequest("/v1/learning/assessments/submit", { courseId, type, moduleIndex, answers })
};

export const adminApi = {
  retrieveEvidence,
  listExternalLearning: () => platformRequest("/v1/admin/external-learning/list"),
  reviewBook: (submissionId, decision, note) =>
    platformRequest("/v1/admin/book-submissions/review", { submissionId, decision, note }),
  reviewExternalCertificate: (recordId, decision, note) =>
    platformRequest("/v1/admin/external-learning/review", { recordId, decision, note }),
  upsertContent: (collection, id, record) =>
    platformRequest("/v1/admin/content/upsert", { collection, id, record }),
  setContentStatus: (collection, id, status) =>
    platformRequest("/v1/admin/content/status", { collection, id, status }),
  deleteContent: (collection, id) =>
    platformRequest("/v1/admin/content/delete", { collection, id })
};
