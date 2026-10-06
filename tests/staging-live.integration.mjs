import assert from "node:assert/strict";
import { createHash, createSign, randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";

const projectId = "speakout-portal-staging";
const apiKey = "AIzaSyAfe0T3E__vQBxZKQHpoiABrSXOfXkh7FA";
const workerBase = "https://speakout-platform-api-staging.speakout-platform-api.workers.dev";
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_FILE;
const cloudinaryPath = process.env.CLOUDINARY_CREDENTIALS_FILE;

if (!serviceAccountPath || !cloudinaryPath) {
  throw new Error("Set FIREBASE_SERVICE_ACCOUNT_FILE and CLOUDINARY_CREDENTIALS_FILE to temporary staging credential files.");
}

const serviceAccount = JSON.parse(await readFile(serviceAccountPath, "utf8"));
const cloudinary = JSON.parse(await readFile(cloudinaryPath, "utf8"));
assert.equal(serviceAccount.project_id, projectId);

const suffix = `${Date.now()}-${randomBytes(3).toString("hex")}`;
const courseId = `integration-${suffix}`;
const externalCourseId = `external-${suffix}`;
const password = `Stage-${randomBytes(18).toString("base64url")}!9a`;
const authUrl = operation => `https://identitytoolkit.googleapis.com/v1/accounts:${operation}?key=${apiKey}`;
const firestoreBase = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
const cleanupPaths = [];
const authUsers = [];
let evidencePublicId = "";
let academicResultPublicId = "";
let academicResultResourceType = "image";
let academicResultId = "";

function base64Url(value) {
  return Buffer.from(value).toString("base64url");
}

async function serviceAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const encodedHeader = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const encodedPayload = base64Url(JSON.stringify({
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: "https://oauth2.googleapis.com/token",
    scope: "https://www.googleapis.com/auth/datastore",
    iat: now,
    exp: now + 3500
  }));
  const unsigned = `${encodedHeader}.${encodedPayload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  const assertion = `${unsigned}.${signer.sign(serviceAccount.private_key).toString("base64url")}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion })
  });
  const body = await response.json();
  assert.equal(response.ok, true, "service account OAuth exchange failed");
  return body.access_token;
}

function encode(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === "string") return { stringValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encode(item)])) } };
}

function decode(value) {
  if (!value) return null;
  for (const [type, item] of Object.entries(value)) {
    if (type === "nullValue") return null;
    if (type === "integerValue" || type === "doubleValue") return Number(item);
    if (type === "stringValue" || type === "timestampValue" || type === "booleanValue") return item;
    if (type === "arrayValue") return (item.values || []).map(decode);
    if (type === "mapValue") return Object.fromEntries(Object.entries(item.fields || {}).map(([key, field]) => [key, decode(field)]));
  }
  return null;
}

const fields = object => Object.fromEntries(Object.entries(object).map(([key, value]) => [key, encode(value)]));
const decodedFields = object => Object.fromEntries(Object.entries(object || {}).map(([key, value]) => [key, decode(value)]));

async function firestore(path, { method = "GET", data, token = adminToken } = {}) {
  const response = await fetch(`${firestoreBase}/${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: data ? JSON.stringify({ fields: fields(data) }) : undefined
  });
  const body = await response.json().catch(() => ({}));
  return { response, body, data: decodedFields(body.fields) };
}

async function signup(label) {
  const response = await fetch(authUrl("signUp"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: `${label}.${suffix}@example.test`, password, returnSecureToken: true })
  });
  const body = await response.json();
  assert.equal(response.ok, true, `${label} staging signup failed`);
  authUsers.push(body);
  return body;
}

async function worker(path, token, data, form = false) {
  const response = await fetch(`${workerBase}${path}`, {
    method: "POST",
    headers: form ? { authorization: `Bearer ${token}` } : { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: form ? data : JSON.stringify(data)
  });
  const body = response.headers.get("content-type")?.includes("application/json") ? await response.json() : await response.arrayBuffer();
  return { response, body };
}

const adminToken = await serviceAccessToken();

try {
  const [learner, admin, schoolAdmin, parent] = await Promise.all([
    signup("learner"),
    signup("admin"),
    signup("schooladmin"),
    signup("parent")
  ]);
  const learnerProfile = `users/${learner.localId}`;
  const adminProfile = `users/${admin.localId}`;
  const schoolAdminProfile = `users/${schoolAdmin.localId}`;
  const parentProfile = `users/${parent.localId}`;
  const schoolId = `stage-school-${suffix}`;
  const schoolCode = `STAGE-${randomBytes(3).toString("hex").toUpperCase()}`;
  const parentLinkId = createHash("sha256").update(`${parent.localId}:${learner.localId}`).digest("hex");

  for (const [path, data] of [
    [`schools/${schoolId}`, {
      schoolName: "Staging Acceptance School",
      schoolCode,
      schoolType: "secondary",
      city: "Keffi",
      state: "Nasarawa",
      country: "Nigeria",
      status: "active"
    }],
    [learnerProfile, {
      uid: learner.localId,
      email: learner.email,
      fullName: "Staging Learner",
      firstName: "Staging",
      lastName: "Learner",
      studentId: `STAGE-STU-${randomBytes(3).toString("hex").toUpperCase()}`,
      classLevel: "SS2",
      role: "student",
      status: "approved",
      approved: true,
      schoolId,
      schoolCode,
      schoolName: "Staging Acceptance School"
    }],
    [adminProfile, { uid: admin.localId, email: admin.email, fullName: "Staging Admin", role: "admin", status: "approved", approved: true }],
    [schoolAdminProfile, {
      uid: schoolAdmin.localId,
      email: schoolAdmin.email,
      fullName: "Staging School Admin",
      role: "school_admin",
      status: "approved",
      approved: true,
      schoolId,
      schoolCode,
      schoolName: "Staging Acceptance School"
    }],
    [parentProfile, {
      uid: parent.localId,
      email: parent.email,
      fullName: "Staging Parent",
      role: "parent",
      status: "approved",
      approved: true,
      schoolId,
      schoolCode,
      schoolName: "Staging Acceptance School"
    }],
    [`parentStudentLinks/${parentLinkId}`, {
      parentId: parent.localId,
      parentName: "Staging Parent",
      parentEmail: parent.email,
      studentId: learner.localId,
      studentName: "Staging Learner",
      studentCode: "STAGING",
      studentClass: "SS2",
      relationship: "Guardian",
      schoolId,
      schoolCode,
      status: "approved",
      approvalRequired: true,
      approvedAt: new Date().toISOString(),
      reviewedAt: new Date().toISOString(),
      reviewedBy: schoolAdmin.localId,
      reviewSource: "school",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }],
    [`courses/${courseId}`, { title: "Staging Integration Course", status: "active", modules: [{ title: "Module 1", lessons: [{ id: "lesson-1", title: "Lesson 1" }], quiz: { id: `${courseId}__module__0`, title: "Module Quiz", passMark: 70, questionCount: 1 } }], finalAssessment: { id: `${courseId}__final`, title: "Final", passMark: 70, questionCount: 1 } }],
    [`courses/${externalCourseId}`, { title: "Staging External Course", status: "active", courseType: "external", completionMethod: "certificate-upload", provider: "Staging Provider", externalUrl: "https://example.com/staging-course" }],
    [`courseAssessments/${courseId}__module__0`, { id: `${courseId}__module__0`, courseId, type: "module", moduleIndex: 0, title: "Module Quiz", passMark: 70, questions: [{ question: "Choose A", options: ["A", "B"], answer: 0 }] }],
    [`courseAssessments/${courseId}__final`, { id: `${courseId}__final`, courseId, type: "final", title: "Final", passMark: 70, questions: [{ question: "Choose A", options: ["A", "B"], answer: 0 }] }]
  ]) {
    const created = await firestore(path, { method: "PATCH", data });
    assert.equal(created.response.ok, true, `failed to seed ${path}`);
    cleanupPaths.push(path);
  }

  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
  const denied = await firestore(`certificates/forged-${suffix}`, { method: "PATCH", data: { userId: learner.localId, status: "active" }, token: learner.idToken });
  assert.equal(denied.response.status, 403, "learner certificate forgery was not denied by live rules");

  let initialResultState = null;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = await worker("/v1/academic-results/school/list", schoolAdmin.idToken, {});
    if (candidate.response.ok && candidate.body?.policy?.defaultAccessMode) {
      initialResultState = candidate;
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert.ok(initialResultState, "staging Worker did not serve the academic-result policy API after deployment");
  assert.equal(initialResultState.body.policy.defaultAccessMode, "fee_and_pin");
  assert.equal(initialResultState.body.policy.allowImmediatePublish, false);
  assert.equal(initialResultState.body.policy.managerAuthority, "school_admin_only");

  const savedPolicy = await worker("/v1/academic-results/policy", schoolAdmin.idToken, {
    defaultAccessMode: "fee_and_pin",
    allowImmediatePublish: false,
    parentReleaseMessage: "Contact the school accounts office if a cleared result remains locked."
  });
  assert.equal(savedPolicy.response.ok, true, "school could not save academic-result policy");
  assert.equal(savedPolicy.body.policy.pinDeliveryMethod, "school_issued_manual");

  const blockedPublishForm = new FormData();
  blockedPublishForm.append("file", new File([png], "blocked-result.png", { type: "image/png" }));
  blockedPublishForm.append("studentId", learner.localId);
  blockedPublishForm.append("academicSession", "2026/2027");
  blockedPublishForm.append("academicPeriod", "Policy Guard");
  blockedPublishForm.append("title", "Policy Guard Result");
  blockedPublishForm.append("status", "published");
  const blockedPublish = await worker("/v1/academic-results/upload", schoolAdmin.idToken, blockedPublishForm, true);
  assert.equal(blockedPublish.response.status, 409, "draft-first institution policy did not block immediate publication");

  const resultForm = new FormData();
  resultForm.append("file", new File([png], "result.png", { type: "image/png" }));
  resultForm.append("studentId", learner.localId);
  resultForm.append("academicSession", "2026/2027");
  resultForm.append("academicPeriod", "First Term");
  resultForm.append("title", "First Term Result");
  resultForm.append("accessMode", "fee_and_pin");
  resultForm.append("status", "draft");

  const resultUpload = await worker("/v1/academic-results/upload", schoolAdmin.idToken, resultForm, true);
  assert.equal(resultUpload.response.ok, true, `result upload failed (${resultUpload.response.status}): ${JSON.stringify(resultUpload.body)}`);
  academicResultId = resultUpload.body.result.id;
  assert.ok(academicResultId, "academic result id missing after upload");
  cleanupPaths.push(`academicResults/${academicResultId}`);

  const storedResult = await firestore(`academicResults/${academicResultId}`);
  assert.equal(storedResult.response.ok, true, "uploaded academic result metadata missing");
  assert.equal(storedResult.data.status, "draft");
  assert.equal(storedResult.data.feeClearanceStatus, "pending");
  assert.ok(storedResult.data.filePublicId, "private academic-result file metadata missing");
  academicResultPublicId = storedResult.data.filePublicId;
  academicResultResourceType = storedResult.data.fileResourceType || "image";

  const parentBeforePublish = await worker("/v1/academic-results/parent/list", parent.idToken, {});
  assert.equal(parentBeforePublish.response.ok, true);
  assert.equal(parentBeforePublish.body.results.length, 0, "draft result leaked to parent");

  const publish = await worker("/v1/academic-results/publication", schoolAdmin.idToken, { resultId: academicResultId, status: "published" });
  assert.equal(publish.response.ok, true, "school could not publish academic result");

  const parentPendingFees = await worker("/v1/academic-results/parent/list", parent.idToken, {});
  assert.equal(parentPendingFees.response.ok, true);
  assert.equal(parentPendingFees.body.results.length, 1);
  assert.equal(parentPendingFees.body.results[0].unlocked, false);
  assert.equal(parentPendingFees.body.results[0].feeClearanceStatus, "pending");

  const prematureUnlock = await worker("/v1/academic-results/parent/unlock", parent.idToken, { resultId: academicResultId, pin: "12345678" });
  assert.equal(prematureUnlock.response.status, 409, "parent unlocked result before fee clearance");

  const cleared = await worker("/v1/academic-results/fee-clearance", schoolAdmin.idToken, { resultId: academicResultId, status: "cleared" });
  assert.equal(cleared.response.ok, true, "school could not confirm fee clearance");

  const pinIssue = await worker("/v1/academic-results/pin/generate", schoolAdmin.idToken, { resultId: academicResultId });
  assert.equal(pinIssue.response.ok, true, "school could not generate result PIN");
  assert.match(pinIssue.body.pin || "", /^\d{8}$/u, "result PIN was not an 8-digit code");

  const wrongPin = pinIssue.body.pin === "00000000" ? "99999999" : "00000000";
  const wrongUnlock = await worker("/v1/academic-results/parent/unlock", parent.idToken, { resultId: academicResultId, pin: wrongPin });
  assert.equal(wrongUnlock.response.status, 403, "incorrect result PIN was accepted");

  const unlock = await worker("/v1/academic-results/parent/unlock", parent.idToken, { resultId: academicResultId, pin: pinIssue.body.pin });
  assert.equal(unlock.response.ok, true, "valid result PIN did not unlock result");
  assert.equal(unlock.body.result.unlocked, true);

  const parentUnlockId = createHash("sha256").update(`${academicResultId}|${parent.localId}`).digest("hex");
  const parentAttemptId = parentUnlockId;
  cleanupPaths.push(`academicResultUnlocks/${parentUnlockId}`, `academicResultPinAttempts/${parentAttemptId}`);

  const download = await worker("/v1/academic-results/download", parent.idToken, { resultId: academicResultId });
  assert.equal(download.response.ok, true, "authorized parent result download failed");
  assert.match(download.response.headers.get("cache-control") || "", /no-store/u);
  assert.match(download.response.headers.get("content-disposition") || "", /attachment/u);
  assert.ok(download.body.byteLength > 0, "downloaded academic result was empty");

  const newPin = await worker("/v1/academic-results/pin/generate", schoolAdmin.idToken, { resultId: academicResultId });
  assert.equal(newPin.response.ok, true, "school could not rotate result PIN");
  assert.notEqual(newPin.body.pin, pinIssue.body.pin, "result PIN rotation unexpectedly reused the same PIN");

  const parentAfterRotation = await worker("/v1/academic-results/parent/list", parent.idToken, {});
  assert.equal(parentAfterRotation.response.ok, true);
  assert.equal(parentAfterRotation.body.results[0].unlocked, false, "PIN rotation did not invalidate prior parent unlock");

  const oldPinAfterRotation = await worker("/v1/academic-results/parent/unlock", parent.idToken, { resultId: academicResultId, pin: pinIssue.body.pin });
  assert.equal(oldPinAfterRotation.response.status, 403, "old PIN remained valid after rotation");

  const unlockRotated = await worker("/v1/academic-results/parent/unlock", parent.idToken, { resultId: academicResultId, pin: newPin.body.pin });
  assert.equal(unlockRotated.response.ok, true, "rotated result PIN did not unlock result");

  const resetFees = await worker("/v1/academic-results/fee-clearance", schoolAdmin.idToken, { resultId: academicResultId, status: "pending" });
  assert.equal(resetFees.response.ok, true, "school could not reset fee clearance");

  const downloadAfterFeeReset = await worker("/v1/academic-results/download", parent.idToken, { resultId: academicResultId });
  assert.equal(downloadAfterFeeReset.response.status, 403, "parent retained result download after fee clearance reset");


  const enrollment = await worker("/v1/learning/enroll", learner.idToken, { courseId });
  assert.equal(enrollment.response.ok, true, `enrollment failed (${enrollment.response.status}): ${JSON.stringify(enrollment.body)}`);
  assert.equal(enrollment.body.created, true);
  const preQuiz = await worker("/v1/learning/assessments/get", learner.idToken, { courseId, type: "module", moduleIndex: 0 });
  assert.equal(preQuiz.response.status, 409);
  const lesson = await worker("/v1/learning/lessons/complete", learner.idToken, { courseId, lessonId: "lesson-1" });
  assert.equal(lesson.response.ok, true, `lesson completion failed (${lesson.response.status}): ${JSON.stringify(lesson.body)}`);
  assert.equal(lesson.body.progress.percent, 50);
  const quiz = await worker("/v1/learning/assessments/get", learner.idToken, { courseId, type: "module", moduleIndex: 0 });
  assert.equal(quiz.response.ok, true);
  assert.equal("answer" in quiz.body.assessment.questions[0], false);
  const quizResult = await worker("/v1/learning/assessments/submit", learner.idToken, { courseId, type: "module", moduleIndex: 0, answers: [0] });
  assert.equal(quizResult.body.passed, true);
  assert.equal(quizResult.body.progress.percent, 100);
  const finalResult = await worker("/v1/learning/assessments/submit", learner.idToken, { courseId, type: "final", moduleIndex: null, answers: [0] });
  assert.equal(finalResult.body.passed, true);
  assert.ok(finalResult.body.certificate?.verificationCode);
  const courseCertificateId = `${learner.localId}_${courseId}`;
  cleanupPaths.push(`userProgress/${courseCertificateId}`, `certificates/${courseCertificateId}`, `publicCertificateVerifications/${finalResult.body.certificate.verificationCode}`);
  const [certificate, projection] = await Promise.all([
    firestore(`certificates/${courseCertificateId}`),
    firestore(`publicCertificateVerifications/${finalResult.body.certificate.verificationCode}`)
  ]);
  assert.equal(certificate.response.ok && projection.response.ok, true, "atomic course certificate/projection write missing");
  assert.equal("userId" in projection.data, false);


  const submissionForm = new FormData();
  submissionForm.append("file", new File([png], "evidence.png", { type: "image/png" }));
  submissionForm.append("courseId", externalCourseId);
  submissionForm.append("completionDate", new Date().toISOString().slice(0, 10));
  submissionForm.append("certificateNumber", `STAGE-${suffix}`);
  submissionForm.append("verificationUrl", "https://example.com/verify/staging");
  submissionForm.append("learnerNote", "Staging integration evidence");
  const submission = await worker("/v1/external-learning/submit", learner.idToken, submissionForm, true);
  assert.equal(submission.response.ok, true, `authenticated external submission failed (${submission.response.status}): ${JSON.stringify(submission.body)}`);
  evidencePublicId = submission.body.record.evidencePublicId;
  const externalId = `${learner.localId}_${externalCourseId}`;
  cleanupPaths.push(`externalLearningRecords/${externalId}`);
  const evidence = await worker("/v1/admin/media/evidence", admin.idToken, { recordId: externalId });
  assert.equal(evidence.response.ok, true, "protected evidence retrieval failed");
  assert.match(evidence.response.headers.get("cache-control") || "", /no-store/);
  assert.ok(evidence.body.byteLength > 0);
  const review = await worker("/v1/admin/external-learning/review", admin.idToken, { recordId: externalId, decision: "approved", note: "staging integration" });
  assert.equal(review.response.ok, true);
  assert.ok(review.body.certificate?.verificationCode);
  cleanupPaths.push(`certificates/${review.body.certificate.id}`, `publicCertificateVerifications/${review.body.certificate.verificationCode}`);
  const [externalCertificate, externalProjection] = await Promise.all([
    firestore(`certificates/${review.body.certificate.id}`),
    firestore(`publicCertificateVerifications/${review.body.certificate.verificationCode}`)
  ]);
  assert.equal(externalCertificate.response.ok && externalProjection.response.ok, true, "atomic external certificate/projection write missing");

  const inventory = await worker("/v1/admin/assessments/migrate", admin.idToken, { dryRun: true });
  assert.equal(inventory.response.ok, true);
  assert.equal(inventory.body.writesPerformed, 0);
  assert.equal(inventory.body.truncated, false);

  console.log(JSON.stringify({
    ok: true,
    liveRules: true,
    atomicLearning: true,
    atomicCertificates: true,
    protectedEvidence: true,
    academicResults: true,
    resultFeeGate: true,
    resultPinRotation: true,
    resultParentDownload: true,
    dryRunWrites: inventory.body.writesPerformed
  }));
} finally {
  for (const path of [...cleanupPaths].reverse()) await firestore(path, { method: "DELETE" }).catch(() => null);
  if (evidencePublicId) {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createHash("sha1").update(`public_id=${evidencePublicId}&timestamp=${timestamp}&type=authenticated${cloudinary.apiSecret}`).digest("hex");
    const form = new URLSearchParams({ public_id: evidencePublicId, timestamp: String(timestamp), type: "authenticated", api_key: cloudinary.apiKey, signature });
    await fetch(`https://api.cloudinary.com/v1_1/${cloudinary.cloudName}/image/destroy`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: form }).catch(() => null);
  }

  if (academicResultId) {
    const auditResponse = await fetch(`${firestoreBase}/academicResultAuditLogs?pageSize=100`, {
      headers: { authorization: `Bearer ${adminToken}` }
    }).catch(() => null);
    if (auditResponse?.ok) {
      const body = await auditResponse.json().catch(() => ({}));
      for (const document of body.documents || []) {
        const data = decodedFields(document.fields);
        if (data.resultId === academicResultId) {
          const relative = document.name.split("/documents/")[1];
          if (relative) await firestore(relative, { method: "DELETE" }).catch(() => null);
        }
      }
    }
  }

  if (academicResultPublicId) {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createHash("sha1").update(
      `public_id=${academicResultPublicId}&timestamp=${timestamp}&type=authenticated${cloudinary.apiSecret}`
    ).digest("hex");
    const form = new URLSearchParams({
      public_id: academicResultPublicId,
      timestamp: String(timestamp),
      type: "authenticated",
      api_key: cloudinary.apiKey,
      signature
    });
    await fetch(
      `https://api.cloudinary.com/v1_1/${cloudinary.cloudName}/${academicResultResourceType}/destroy`,
      { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: form }
    ).catch(() => null);
  }
  for (const user of authUsers) {
    await fetch(authUrl("delete"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idToken: user.idToken }) }).catch(() => null);
  }
}
