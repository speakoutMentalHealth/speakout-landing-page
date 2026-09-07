import { createRemoteJWKSet, importPKCS8, jwtVerify, SignJWT } from "jose";

const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", ...headers }
});

function corsHeaders(request, env) {
  const origin = request.headers.get("origin") || "";
  const allowed = String(env.ALLOWED_ORIGINS || "").split(",").map(x => x.trim()).filter(Boolean);
  return allowed.includes(origin) ? {
    "access-control-allow-origin": origin,
    "access-control-allow-headers": "authorization,content-type",
    "access-control-allow-methods": "POST,OPTIONS",
    "vary": "Origin"
  } : {};
}

const clean = value => String(value || "").trim();
const normalized = value => clean(value).toLowerCase();
function safeId(value, label = "identifier") {
  const id = clean(value);
  if (!/^[A-Za-z0-9_-]{1,180}$/.test(id)) throw Object.assign(new Error(`Invalid ${label}.`), { status: 400 });
  return id;
}

async function sha1Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-1", bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function toFirestore(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value)
    ? { integerValue: String(value) }
    : { doubleValue: value };
  if (typeof value === "string") return { stringValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestore) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([k, v]) => [k, toFirestore(v)])) } };
}

function fromFirestore(value) {
  if (!value) return null;
  if ("nullValue" in value) return null;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("stringValue" in value) return value.stringValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(fromFirestore);
  if ("mapValue" in value) return decodeFields(value.mapValue.fields || {});
  return null;
}

function decodeFields(fields = {}) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, fromFirestore(value)]));
}

function encodeFields(data) {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, toFirestore(value)]));
}

async function firebaseAccessToken(env) {
  const cached = await env.TOKEN_CACHE?.get("firebase-access-token", "json");
  if (cached?.token) return cached.token;
  const key = await importPKCS8(String(env.FIREBASE_PRIVATE_KEY).replace(/\\n/g, "\n"), "RS256");
  const now = Math.floor(Date.now() / 1000);
  const assertion = await new SignJWT({ scope: "https://www.googleapis.com/auth/datastore" })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(env.FIREBASE_CLIENT_EMAIL)
    .setSubject(env.FIREBASE_CLIENT_EMAIL)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now).setExpirationTime(now + 3500).sign(key);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion })
  });
  const result = await response.json();
  if (!response.ok || !result.access_token) throw new Error("Firebase service authorization failed.");
  await env.TOKEN_CACHE?.put("firebase-access-token", JSON.stringify({ token: result.access_token }), { expirationTtl: 3300 });
  return result.access_token;
}

const documentUrl = (env, path) =>
  `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`;

async function firestore(env, path, init = {}) {
  const response = await fetch(documentUrl(env, path), {
    ...init,
    headers: { Authorization: `Bearer ${await firebaseAccessToken(env)}`, "content-type": "application/json", ...(init.headers || {}) }
  });
  if (response.status === 404) return null;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error?.message || "Firestore request failed.");
  return body;
}

async function getDocument(env, path) {
  const doc = await firestore(env, path);
  return doc ? { id: doc.name.split("/").pop(), ...decodeFields(doc.fields) } : null;
}

async function setDocument(env, path, data) {
  return firestore(env, path, { method: "PATCH", body: JSON.stringify({ fields: encodeFields(data) }) });
}

async function authenticatedUser(request, env) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) throw Object.assign(new Error("Authentication required."), { status: 401 });
  const issuer = `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`;
  const jwks = createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"));
  const { payload } = await jwtVerify(token, jwks, { issuer, audience: env.FIREBASE_PROJECT_ID });
  const uid = clean(payload.sub);
  const profile = await getDocument(env, `users/${uid}`);
  if (!profile || normalized(profile.status) !== "approved") {
    throw Object.assign(new Error("Approved account required."), { status: 403 });
  }
  return { uid, email: clean(payload.email), profile };
}

function requireAdmin(user) {
  if (!["admin", "super_admin"].includes(normalized(user.profile.role))) {
    throw Object.assign(new Error("Administrator access required."), { status: 403 });
  }
}

const modulesOf = course => Array.isArray(course.modules) ? course.modules : [];
const lessonsOf = module => Array.isArray(module?.lessons) ? module.lessons : [];
const lessonId = (courseId, mi, lesson, li) => lesson?.id || `${courseId}-m${mi + 1}-l${li + 1}`;
const assessmentId = (courseId, type, mi) => type === "final" ? `${courseId}__final` : `${courseId}__module__${mi}`;

function emptyProgress(uid, courseId, course) {
  return { userId: uid, courseId, courseTitle: course.title || "", completedLessons: [], passedModuleQuizzes: {}, moduleQuizScores: {}, finalAssessmentPassed: false, finalAssessmentScore: 0, percent: 0, progress: 0, status: "in_progress" };
}

function counts(courseId, course, progress) {
  const done = new Set(progress.completedLessons || []);
  let total = 0, complete = 0;
  modulesOf(course).forEach((module, mi) => {
    const ids = lessonsOf(module).map((lesson, li) => lessonId(courseId, mi, lesson, li));
    total += ids.length + (module.quiz ? 1 : 0);
    complete += ids.filter(id => done.has(id)).length + (module.quiz && progress.passedModuleQuizzes?.[String(mi)] === true ? 1 : 0);
  });
  return { total, complete, percent: total ? Math.round(complete / total * 100) : 0 };
}

function moduleComplete(courseId, modules, mi, progress) {
  const done = new Set(progress.completedLessons || []);
  return lessonsOf(modules[mi]).every((lesson, li) => done.has(lessonId(courseId, mi, lesson, li))) &&
    (!modules[mi].quiz || progress.passedModuleQuizzes?.[String(mi)] === true);
}

function previousModulesComplete(courseId, modules, target, progress) {
  for (let i = 0; i < target; i++) if (!moduleComplete(courseId, modules, i, progress)) return false;
  return true;
}

function publicProgress(progress, course) {
  const result = counts(progress.courseId, course, progress);
  return { ...progress, percent: result.percent, progress: result.percent };
}

async function learningContext(env, user, courseId) {
  const course = await getDocument(env, `courses/${courseId}`);
  if (!course) throw Object.assign(new Error("Course not found."), { status: 404 });
  const progressPath = `userProgress/${user.uid}_${courseId}`;
  const progress = await getDocument(env, progressPath) || emptyProgress(user.uid, courseId, course);
  return { course, progress, progressPath, modules: modulesOf(course) };
}

function safeAssessment(assessment) {
  return {
    id: assessment.id,
    type: assessment.type,
    title: assessment.title || "Assessment",
    passMark: Number(assessment.passMark || 70),
    questions: (assessment.questions || []).map((q, index) => ({ index, question: q.question || q.text || `Question ${index + 1}`, options: (q.options || []).map(x => typeof x === "object" ? x.text || x.label || "" : x) }))
  };
}

function answerIndex(question) {
  if (Number.isInteger(question.answer)) return question.answer;
  if (Number.isInteger(question.correctAnswer)) return question.correctAnswer;
  return null;
}

async function route(request, env, path, data) {
  const user = await authenticatedUser(request, env);
  const courseId = path.startsWith("/v1/learning/") ? safeId(data.courseId, "course identifier") : clean(data.courseId);

  if (path === "/v1/media/evidence") {
    const file = data.file;
    if (!(file instanceof File)) throw Object.assign(new Error("Select an evidence image."), { status: 400 });
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 8 * 1024 * 1024) {
      throw Object.assign(new Error("Evidence must be a JPG, PNG or WebP image below 8 MB."), { status: 400 });
    }
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = `speakout/private-evidence/${user.uid}`;
    const publicId = crypto.randomUUID();
    const signatureBase = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}&type=authenticated${env.CLOUDINARY_API_SECRET}`;
    const upload = new FormData();
    upload.append("file", file);
    upload.append("api_key", env.CLOUDINARY_API_KEY);
    upload.append("timestamp", String(timestamp));
    upload.append("folder", folder);
    upload.append("public_id", publicId);
    upload.append("type", "authenticated");
    upload.append("signature", await sha1Hex(signatureBase));
    const response = await fetch(`https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: upload });
    const result = await response.json();
    if (!response.ok) throw Object.assign(new Error("Secure evidence upload failed."), { status: 502 });
    return { assetId: result.public_id, version: result.version, resourceType: result.resource_type };
  }

  if (path === "/v1/learning/state") {
    const ctx = await learningContext(env, user, courseId);
    return { progress: publicProgress(ctx.progress, ctx.course) };
  }

  if (path === "/v1/learning/lessons/complete") {
    const ctx = await learningContext(env, user, courseId);
    const target = clean(data.lessonId);
    let found;
    ctx.modules.forEach((module, mi) => lessonsOf(module).forEach((lesson, li) => {
      if (lessonId(courseId, mi, lesson, li) === target) found = { mi, li };
    }));
    if (!found) throw Object.assign(new Error("Lesson not found."), { status: 404 });
    if (!previousModulesComplete(courseId, ctx.modules, found.mi, ctx.progress)) throw Object.assign(new Error("Complete the previous module first."), { status: 409 });
    if (found.li > 0) {
      const prior = lessonId(courseId, found.mi, ctx.modules[found.mi].lessons[found.li - 1], found.li - 1);
      if (!(ctx.progress.completedLessons || []).includes(prior)) throw Object.assign(new Error("Complete the previous lesson first."), { status: 409 });
    }
    const completed = [...new Set([...(ctx.progress.completedLessons || []), target])];
    const updated = publicProgress({ ...ctx.progress, completedLessons: completed, updatedAt: new Date().toISOString() }, ctx.course);
    await setDocument(env, ctx.progressPath, updated);
    return { progress: updated };
  }

  if (path === "/v1/learning/assessments/get" || path === "/v1/learning/assessments/submit") {
    const ctx = await learningContext(env, user, courseId);
    const type = normalized(data.type);
    const mi = Number(data.moduleIndex);
    if (!["module", "final"].includes(type)) throw Object.assign(new Error("Invalid assessment type."), { status: 400 });
    if (type === "module") {
      if (!Number.isInteger(mi) || !ctx.modules[mi]) throw Object.assign(new Error("Invalid module."), { status: 400 });
      if (!previousModulesComplete(courseId, ctx.modules, mi, ctx.progress)) throw Object.assign(new Error("Complete the previous module first."), { status: 409 });
      const done = new Set(ctx.progress.completedLessons || []);
      if (!lessonsOf(ctx.modules[mi]).every((lesson, li) => done.has(lessonId(courseId, mi, lesson, li)))) throw Object.assign(new Error("Complete all lessons in this module first."), { status: 409 });
    } else if (counts(courseId, ctx.course, ctx.progress).percent !== 100) {
      throw Object.assign(new Error("Complete all course requirements first."), { status: 409 });
    }
    const assessment = await getDocument(env, `courseAssessments/${assessmentId(courseId, type, mi)}`);
    if (!assessment) throw Object.assign(new Error("Secure assessment unavailable."), { status: 404 });
    if (path.endsWith("/get")) return { assessment: safeAssessment(assessment) };
    const answers = Array.isArray(data.answers) ? data.answers : [];
    const questions = assessment.questions || [];
    if (!questions.length || answers.length !== questions.length) throw Object.assign(new Error("Answer every question."), { status: 400 });
    let correct = 0;
    questions.forEach((question, index) => { const key = answerIndex(question); if (key === null) throw Object.assign(new Error("Assessment configuration error."), { status: 500 }); if (Number(answers[index]) === key) correct++; });
    const score = Math.round(correct / questions.length * 100);
    const passMark = Number(assessment.passMark || 70);
    const passed = score >= passMark;
    const updated = { ...ctx.progress, passedModuleQuizzes: { ...(ctx.progress.passedModuleQuizzes || {}) }, moduleQuizScores: { ...(ctx.progress.moduleQuizScores || {}) }, updatedAt: new Date().toISOString() };
    let certificate = null;
    if (type === "module") {
      updated.moduleQuizScores[String(mi)] = Math.max(Number(updated.moduleQuizScores[String(mi)] || 0), score);
      if (passed) updated.passedModuleQuizzes[String(mi)] = true;
    } else {
      updated.finalAssessmentScore = Math.max(Number(updated.finalAssessmentScore || 0), score);
      if (passed) {
        updated.finalAssessmentPassed = true;
        updated.status = "completed";
        const id = `${user.uid}_${courseId}`;
        const existing = await getDocument(env, `certificates/${id}`);
        if (!existing) {
          const verificationCode = crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase();
          const record = { id, userId: user.uid, recipientName: user.profile.fullName || user.email, courseId, courseTitle: ctx.course.title || "Course", type: "course", status: "active", finalScore: score, verificationCode, issueDate: new Date().toISOString().slice(0, 10), createdAt: new Date().toISOString() };
          await setDocument(env, `certificates/${id}`, record);
          await setDocument(env, `publicCertificateVerifications/${verificationCode}`, { recipientName: record.recipientName, awardTitle: record.courseTitle, issuer: "SpeakOut Mental Health Outreach", issueDate: record.issueDate, status: record.status, certificateNumber: id });
          certificate = { id, verificationCode };
        } else certificate = { id, verificationCode: existing.verificationCode };
        updated.certificateId = id;
      }
    }
    const finalProgress = publicProgress(updated, ctx.course);
    await setDocument(env, ctx.progressPath, finalProgress);
    return { score, passMark, passed, progress: finalProgress, certificate };
  }

  if (path === "/v1/admin/assessments/migrate") {
    requireAdmin(user);
    if (data.dryRun !== true) throw Object.assign(new Error("Only dry-run migration inventory is enabled."), { status: 409 });
    return { dryRun: true, message: "No data was changed. Enable the reviewed migration only after a Firestore backup." };
  }

  if (path === "/v1/admin/book-submissions/review") {
    requireAdmin(user);
    const submissionId = safeId(data.submissionId, "submission identifier");
    const decision = normalized(data.decision);
    if (!submissionId || !["approved", "rejected"].includes(decision)) throw Object.assign(new Error("Invalid review request."), { status: 400 });
    const submission = await getDocument(env, `bookSubmissions/${submissionId}`);
    if (!submission) throw Object.assign(new Error("Submission not found."), { status: 404 });
    if (normalized(submission.status) !== "pending") throw Object.assign(new Error("This submission has already been reviewed."), { status: 409 });
    const now = new Date().toISOString();
    await setDocument(env, `bookSubmissions/${submissionId}`, { ...submission, status: decision, reviewerFeedback: clean(data.note), reviewedBy: user.uid, reviewedAt: now, updatedAt: now });
    let bookId = null;
    if (decision === "approved") {
      bookId = clean(submission.bookId) || `submitted-${submissionId}`;
      await setDocument(env, `books/${bookId}`, {
        title: submission.title || "Untitled resource", author: submission.authorName || "Independent contributor",
        category: submission.category || "general", audience: submission.audience || ["general"],
        shortDescription: submission.shortDescription || "", description: submission.description || "",
        coverUrl: submission.coverUrl || "", accessType: submission.accessType || "free",
        price: Number(submission.price || 0), currency: submission.currency || "₦",
        purchasePlatform: submission.purchasePlatform || "", purchaseUrl: submission.purchaseUrl || "",
        status: "active", source: "approved-submission", sourceSubmissionId: submissionId,
        createdAt: now, updatedAt: now
      });
    }
    return { ok: true, decision, bookId };
  }

  if (path === "/v1/admin/external-learning/review") {
    requireAdmin(user);
    const recordId = safeId(data.recordId, "record identifier");
    const decision = normalized(data.decision);
    if (!recordId || !["approved", "rejected", "resubmission_required"].includes(decision)) throw Object.assign(new Error("Invalid review request."), { status: 400 });
    const record = await getDocument(env, `externalLearningRecords/${recordId}`);
    if (!record) throw Object.assign(new Error("Submission not found."), { status: 404 });
    if (!["pending_review", "pending", "submitted"].includes(normalized(record.status))) throw Object.assign(new Error("This submission is not awaiting review."), { status: 409 });
    const now = new Date().toISOString();
    await setDocument(env, `externalLearningRecords/${recordId}`, { ...record, status: decision, verificationStatus: decision === "approved" ? "verified" : decision, reviewerFeedback: clean(data.note), reviewedBy: user.uid, reviewedAt: now, updatedAt: now });
    let certificate = null;
    if (decision === "approved") {
      const id = `external_${record.userId}_${record.courseId}`;
      const existing = await getDocument(env, `certificates/${id}`);
      if (!existing) {
        const verificationCode = crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase();
        const certificateRecord = { id, userId: record.userId, recipientName: record.learnerName || "Learner", courseId: record.courseId, courseTitle: record.courseTitle || "External course", externalProvider: record.provider || "External Provider", sourceRecordId: recordId, type: "external-completion", status: "active", verificationCode, issueDate: now.slice(0, 10), createdAt: now };
        await setDocument(env, `certificates/${id}`, certificateRecord);
        await setDocument(env, `publicCertificateVerifications/${verificationCode}`, { recipientName: certificateRecord.recipientName, awardTitle: certificateRecord.courseTitle, issuer: "SpeakOut Mental Health Outreach", issueDate: certificateRecord.issueDate, status: certificateRecord.status, certificateNumber: id, achievementType: "externally-completed course verified by SpeakOut" });
        certificate = { id, verificationCode };
      } else certificate = { id, verificationCode: existing.verificationCode };
    }
    return { ok: true, decision, certificate };
  }

  if (path.startsWith("/v1/admin/")) {
    throw Object.assign(new Error("This privileged endpoint is not enabled until its Phase 1 audit implementation is complete."), { status: 501 });
  }

  throw Object.assign(new Error("Endpoint not found."), { status: 404 });
}

export default {
  async fetch(request, env) {
    const headers = corsHeaders(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method !== "POST") return json({ error: "Method not allowed." }, 405, headers);
    const origin = request.headers.get("origin") || "";
    if (origin && !headers["access-control-allow-origin"]) return json({ error: "Origin not allowed." }, 403);
    try {
      const type = request.headers.get("content-type") || "";
      let data = {};
      if (type.includes("application/json")) data = await request.json();
      else if (type.includes("multipart/form-data")) {
        const form = await request.formData();
        data = Object.fromEntries(form.entries());
      }
      return json(await route(request, env, new URL(request.url).pathname, data), 200, headers);
    } catch (error) {
      console.error(error);
      return json({ error: error.message || "Request failed." }, error.status || 500, headers);
    }
  }
};
