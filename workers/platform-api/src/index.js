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

async function sha1Base64Url(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-1", bytes);
  let binary = "";
  for (const byte of new Uint8Array(digest)) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function deterministicVerificationCode(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].slice(0, 8).map(byte => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
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

const databaseUrl = env =>
  `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)`;
const documentUrl = (env, path) => `${databaseUrl(env)}/documents/${path}`;

async function firestoreRequest(env, url, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${await firebaseAccessToken(env)}`, "content-type": "application/json", ...(init.headers || {}) }
  });
  if (response.status === 404) return null;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body?.error?.message || "Firestore request failed.");
    error.firestoreStatus = body?.error?.status;
    error.status = response.status;
    throw error;
  }
  return body;
}

async function getDocument(env, path, transaction = "") {
  const url = new URL(documentUrl(env, path));
  if (transaction) url.searchParams.set("transaction", transaction);
  const doc = await firestoreRequest(env, url.toString());
  return doc ? { id: doc.name.split("/").pop(), ...decodeFields(doc.fields) } : null;
}

async function listDocuments(env, collectionPath, limit = 1000) {
  const documents = [];
  let pageToken = "";
  do {
    const url = new URL(documentUrl(env, collectionPath));
    url.searchParams.set("pageSize", String(Math.min(100, limit - documents.length)));
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const page = await firestoreRequest(env, url.toString());
    for (const doc of page?.documents || []) {
      documents.push({ id: doc.name.split("/").pop(), ...decodeFields(doc.fields) });
      if (documents.length >= limit) break;
    }
    pageToken = page?.nextPageToken || "";
  } while (pageToken && documents.length < limit);
  return { documents, truncated: Boolean(pageToken) };
}

function documentWrite(env, path, data) {
  return { update: { name: `${databaseUrl(env)}/documents/${path}`, fields: encodeFields(data) } };
}

async function rollbackTransaction(env, transaction) {
  await firestoreRequest(env, `${databaseUrl(env)}/documents:rollback`, {
    method: "POST",
    body: JSON.stringify({ transaction })
  }).catch(() => null);
}

async function runTransaction(env, operation, maxAttempts = 4) {
  let lastError;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const started = await firestoreRequest(env, `${databaseUrl(env)}/documents:beginTransaction`, {
      method: "POST",
      body: JSON.stringify({ options: { readWrite: {} } })
    });
    const transaction = started.transaction;
    const writes = [];
    try {
      const result = await operation({
        get: path => getDocument(env, path, transaction),
        set: (path, data) => writes.push(documentWrite(env, path, data))
      });
      await firestoreRequest(env, `${databaseUrl(env)}/documents:commit`, {
        method: "POST",
        body: JSON.stringify({ writes, transaction })
      });
      return result;
    } catch (error) {
      lastError = error;
      await rollbackTransaction(env, transaction);
      if (error.firestoreStatus !== "ABORTED" || attempt === maxAttempts - 1) throw error;
    }
  }
  throw lastError;
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

async function learningContext(env, user, courseId, reader = path => getDocument(env, path)) {
  const course = await reader(`courses/${courseId}`);
  if (!course) throw Object.assign(new Error("Course not found."), { status: 404 });
  const progressPath = `userProgress/${user.uid}_${courseId}`;
  const progress = await reader(progressPath) || emptyProgress(user.uid, courseId, course);
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

async function assessmentContext(env, user, courseId, type, mi, reader = path => getDocument(env, path)) {
  const ctx = await learningContext(env, user, courseId, reader);
  if (!["module", "final"].includes(type)) throw Object.assign(new Error("Invalid assessment type."), { status: 400 });
  if (type === "module") {
    if (!Number.isInteger(mi) || !ctx.modules[mi]) throw Object.assign(new Error("Invalid module."), { status: 400 });
    if (!previousModulesComplete(courseId, ctx.modules, mi, ctx.progress)) throw Object.assign(new Error("Complete the previous module first."), { status: 409 });
    const done = new Set(ctx.progress.completedLessons || []);
    if (!lessonsOf(ctx.modules[mi]).every((lesson, li) => done.has(lessonId(courseId, mi, lesson, li)))) {
      throw Object.assign(new Error("Complete all lessons in this module first."), { status: 409 });
    }
  } else if (counts(courseId, ctx.course, ctx.progress).percent !== 100) {
    throw Object.assign(new Error("Complete all course requirements first."), { status: 409 });
  }
  const assessment = await reader(`courseAssessments/${assessmentId(courseId, type, mi)}`);
  if (!assessment) throw Object.assign(new Error("Secure assessment unavailable."), { status: 404 });
  return { ...ctx, assessment };
}

async function authenticatedEvidenceResponse(env, record) {
  const publicId = clean(record.evidencePublicId);
  const ownerId = safeId(record.userId, "evidence owner identifier");
  const version = Number(record.evidenceVersion);
  const format = normalized(record.evidenceFormat || "jpg");
  const resourceType = normalized(record.evidenceResourceType || "image");
  const expectedPrefix = `speakout/private-evidence/${ownerId}/`;
  const assetName = publicId.slice(expectedPrefix.length);
  if (!publicId.startsWith(expectedPrefix) || !/^[A-Za-z0-9-]{8,80}$/.test(assetName) || !Number.isInteger(version) || version < 1 || !/^[a-z0-9]{2,12}$/.test(format) || resourceType !== "image") {
    throw Object.assign(new Error("This evidence record needs migration before it can be viewed securely."), { status: 409 });
  }
  const encodedPublicId = publicId.split("/").map(encodeURIComponent).join("/");
  const deliveryTail = `v${version}/${encodedPublicId}.${format}`;
  const signature = (await sha1Base64Url(`${deliveryTail}${env.CLOUDINARY_API_SECRET}`)).slice(0, 8);
  const response = await fetch(`https://res.cloudinary.com/${encodeURIComponent(env.CLOUDINARY_CLOUD_NAME)}/${resourceType}/authenticated/s--${signature}--/${deliveryTail}`);
  if (!response.ok || !response.body) {
    throw Object.assign(new Error("Secure evidence retrieval failed."), { status: response.status === 404 ? 404 : 502 });
  }
  return new Response(response.body, {
    status: 200,
    headers: {
      "content-type": response.headers.get("content-type") || `image/${format}`,
      "content-disposition": `inline; filename=\"evidence.${format}\"`,
      "cache-control": "private, no-store, max-age=0",
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex, nofollow"
    }
  });
}

async function route(request, env, path, data) {
  const user = await authenticatedUser(request, env);
  const courseId = path.startsWith("/v1/learning/") ? safeId(data.courseId, "course identifier") : clean(data.courseId);

  if (path === "/v1/admin/media/evidence") {
    requireAdmin(user);
    const recordId = safeId(data.recordId, "record identifier");
    const record = await getDocument(env, `externalLearningRecords/${recordId}`);
    if (!record) throw Object.assign(new Error("Evidence record not found."), { status: 404 });
    return authenticatedEvidenceResponse(env, record);
  }

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
    return {
      assetId: result.asset_id,
      publicId: result.public_id,
      version: result.version,
      format: result.format,
      resourceType: result.resource_type
    };
  }

  if (path === "/v1/learning/state") {
    const ctx = await learningContext(env, user, courseId);
    return { progress: publicProgress(ctx.progress, ctx.course) };
  }

  if (path === "/v1/learning/lessons/complete") {
    return runTransaction(env, async tx => {
      const ctx = await learningContext(env, user, courseId, tx.get);
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
      tx.set(ctx.progressPath, updated);
      return { progress: updated };
    });
  }

  if (path === "/v1/learning/assessments/get" || path === "/v1/learning/assessments/submit") {
    const type = normalized(data.type);
    const mi = Number(data.moduleIndex);
    if (path.endsWith("/get")) {
      const ctx = await assessmentContext(env, user, courseId, type, mi);
      return { assessment: safeAssessment(ctx.assessment) };
    }
    return runTransaction(env, async tx => {
      const ctx = await assessmentContext(env, user, courseId, type, mi, tx.get);
      const answers = Array.isArray(data.answers) ? data.answers : [];
      const questions = ctx.assessment.questions || [];
      if (!questions.length || answers.length !== questions.length) throw Object.assign(new Error("Answer every question."), { status: 400 });
      let correct = 0;
      questions.forEach((question, index) => {
        const key = answerIndex(question);
        if (key === null) throw Object.assign(new Error("Assessment configuration error."), { status: 500 });
        if (Number(answers[index]) === key) correct++;
      });
      const score = Math.round(correct / questions.length * 100);
      const passMark = Number(ctx.assessment.passMark || 70);
      const passed = score >= passMark;
      const now = new Date().toISOString();
      const updated = { ...ctx.progress, passedModuleQuizzes: { ...(ctx.progress.passedModuleQuizzes || {}) }, moduleQuizScores: { ...(ctx.progress.moduleQuizScores || {}) }, updatedAt: now };
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
          const existing = await tx.get(`certificates/${id}`);
          if (!existing) {
            const verificationCode = await deterministicVerificationCode(`course:${id}`);
            const record = { id, userId: user.uid, recipientName: user.profile.fullName || user.email, courseId, courseTitle: ctx.course.title || "Course", type: "course", status: "active", finalScore: score, verificationCode, issueDate: now.slice(0, 10), createdAt: now };
            tx.set(`certificates/${id}`, record);
            tx.set(`publicCertificateVerifications/${verificationCode}`, { recipientName: record.recipientName, awardTitle: record.courseTitle, issuer: "SpeakOut Mental Health Outreach", issueDate: record.issueDate, status: record.status, certificateNumber: id });
            certificate = { id, verificationCode };
          } else certificate = { id, verificationCode: existing.verificationCode };
          updated.certificateId = id;
        }
      }
      const finalProgress = publicProgress(updated, ctx.course);
      tx.set(ctx.progressPath, finalProgress);
      return { score, passMark, passed, progress: finalProgress, certificate };
    });
  }

  if (path === "/v1/admin/assessments/migrate") {
    requireAdmin(user);
    if (data.dryRun !== true) throw Object.assign(new Error("Only dry-run migration inventory is enabled."), { status: 409 });
    const [coursesPage, assessmentsPage, certificatesPage, projectionsPage, evidencePage] = await Promise.all([
      listDocuments(env, "courses"),
      listDocuments(env, "courseAssessments"),
      listDocuments(env, "certificates"),
      listDocuments(env, "publicCertificateVerifications"),
      listDocuments(env, "externalLearningRecords")
    ]);
    const assessmentIds = new Set(assessmentsPage.documents.map(item => item.id));
    let embeddedModuleAssessments = 0;
    let embeddedFinalAssessments = 0;
    let missingSecureAssessments = 0;
    for (const course of coursesPage.documents) {
      modulesOf(course).forEach((module, mi) => {
        if (!module.quiz) return;
        embeddedModuleAssessments++;
        if (!assessmentIds.has(assessmentId(course.id, "module", mi))) missingSecureAssessments++;
      });
      if (course.finalAssessment || course.finalQuiz) {
        embeddedFinalAssessments++;
        if (!assessmentIds.has(assessmentId(course.id, "final", 0))) missingSecureAssessments++;
      }
    }
    const certificateCodes = new Map();
    let certificatesMissingCode = 0;
    let duplicateVerificationCodes = 0;
    let missingPublicProjections = 0;
    const projectionIds = new Set(projectionsPage.documents.map(item => item.id));
    for (const certificate of certificatesPage.documents) {
      const code = clean(certificate.verificationCode);
      if (!code) certificatesMissingCode++;
      else {
        certificateCodes.set(code, (certificateCodes.get(code) || 0) + 1);
        if (!projectionIds.has(code)) missingPublicProjections++;
      }
    }
    certificateCodes.forEach(count => { if (count > 1) duplicateVerificationCodes += count - 1; });
    const orphanPublicProjections = projectionsPage.documents.filter(item => !certificateCodes.has(item.id)).length;
    const evidenceMetadataIncomplete = evidencePage.documents.filter(item => {
      const hasLegacyEvidence = Boolean(item.proofData || item.proofUrl || item.evidenceUrl || item.secureUrl);
      const hasAnySecureMetadata = Boolean(item.evidenceAssetId || item.evidencePublicId || item.evidenceVersion || item.evidenceFormat || item.evidenceResourceType);
      const hasCompleteSecureMetadata = Boolean(item.evidenceAssetId && item.evidencePublicId && item.evidenceVersion && item.evidenceFormat && item.evidenceResourceType);
      return hasLegacyEvidence || (hasAnySecureMetadata && !hasCompleteSecureMetadata);
    }).length;
    return {
      dryRun: true,
      generatedAt: new Date().toISOString(),
      writesPerformed: 0,
      assessments: {
        coursesScanned: coursesPage.documents.length,
        secureAssessments: assessmentsPage.documents.length,
        embeddedModuleAssessments,
        embeddedFinalAssessments,
        missingSecureAssessments
      },
      certificates: {
        certificatesScanned: certificatesPage.documents.length,
        publicProjections: projectionsPage.documents.length,
        certificatesMissingCode,
        duplicateVerificationCodes,
        missingPublicProjections,
        orphanPublicProjections
      },
      evidence: { recordsScanned: evidencePage.documents.length, evidenceMetadataIncomplete },
      truncated: [coursesPage, assessmentsPage, certificatesPage, projectionsPage, evidencePage].some(page => page.truncated),
      safeToMigrate: missingSecureAssessments === 0 && certificatesMissingCode === 0 && duplicateVerificationCodes === 0 && evidenceMetadataIncomplete === 0,
      message: "Inventory only. No data was changed. Back up Firestore and review every reported exception before enabling a migration write path."
    };
  }

  if (path === "/v1/admin/book-submissions/review") {
    requireAdmin(user);
    const submissionId = safeId(data.submissionId, "submission identifier");
    const decision = normalized(data.decision);
    if (!submissionId || !["approved", "rejected"].includes(decision)) throw Object.assign(new Error("Invalid review request."), { status: 400 });
    return runTransaction(env, async tx => {
      const submission = await tx.get(`bookSubmissions/${submissionId}`);
      if (!submission) throw Object.assign(new Error("Submission not found."), { status: 404 });
      if (normalized(submission.status) !== "pending") throw Object.assign(new Error("This submission has already been reviewed."), { status: 409 });
      const now = new Date().toISOString();
      tx.set(`bookSubmissions/${submissionId}`, { ...submission, status: decision, reviewerFeedback: clean(data.note), reviewedBy: user.uid, reviewedAt: now, updatedAt: now });
      let bookId = null;
      if (decision === "approved") {
        bookId = safeId(clean(submission.bookId) || `submitted-${submissionId}`, "book identifier");
        tx.set(`books/${bookId}`, {
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
    });
  }

  if (path === "/v1/admin/external-learning/review") {
    requireAdmin(user);
    const recordId = safeId(data.recordId, "record identifier");
    const decision = normalized(data.decision);
    if (!recordId || !["approved", "rejected", "resubmission_required"].includes(decision)) throw Object.assign(new Error("Invalid review request."), { status: 400 });
    return runTransaction(env, async tx => {
      const record = await tx.get(`externalLearningRecords/${recordId}`);
      if (!record) throw Object.assign(new Error("Submission not found."), { status: 404 });
      if (!["pending_review", "pending", "submitted"].includes(normalized(record.status))) throw Object.assign(new Error("This submission is not awaiting review."), { status: 409 });
      const now = new Date().toISOString();
      tx.set(`externalLearningRecords/${recordId}`, { ...record, status: decision, verificationStatus: decision === "approved" ? "verified" : decision, reviewerFeedback: clean(data.note), reviewedBy: user.uid, reviewedAt: now, updatedAt: now });
      let certificate = null;
      if (decision === "approved") {
        const recordCourseId = safeId(record.courseId, "course identifier");
        const recordUserId = safeId(record.userId, "user identifier");
        const id = `external_${recordUserId}_${recordCourseId}`;
        const existing = await tx.get(`certificates/${id}`);
        if (!existing) {
          const verificationCode = await deterministicVerificationCode(`external:${id}`);
          const certificateRecord = { id, userId: recordUserId, recipientName: record.learnerName || "Learner", courseId: recordCourseId, courseTitle: record.courseTitle || "External course", externalProvider: record.provider || "External Provider", sourceRecordId: recordId, type: "external-completion", status: "active", verificationCode, issueDate: now.slice(0, 10), createdAt: now };
          tx.set(`certificates/${id}`, certificateRecord);
          tx.set(`publicCertificateVerifications/${verificationCode}`, { recipientName: certificateRecord.recipientName, awardTitle: certificateRecord.courseTitle, issuer: "SpeakOut Mental Health Outreach", issueDate: certificateRecord.issueDate, status: certificateRecord.status, certificateNumber: id, achievementType: "externally-completed course verified by SpeakOut" });
          certificate = { id, verificationCode };
        } else certificate = { id, verificationCode: existing.verificationCode };
      }
      return { ok: true, decision, certificate };
    });
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
      const result = await route(request, env, new URL(request.url).pathname, data);
      if (result instanceof Response) {
        const responseHeaders = new Headers(result.headers);
        Object.entries(headers).forEach(([key, value]) => responseHeaders.set(key, value));
        return new Response(result.body, { status: result.status, statusText: result.statusText, headers: responseHeaders });
      }
      return json(result, 200, headers);
    } catch (error) {
      console.error(error);
      return json({ error: error.message || "Request failed." }, error.status || 500, headers);
    }
  }
};
