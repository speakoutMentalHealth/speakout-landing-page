
"use strict";

/**
 * SpeakHub Secure Learning Backend
 * --------------------------------
 * Server-side guided progression, assessment scoring, and certificate issuance.
 *
 * SECURITY MODEL
 * - Learners cannot write userProgress directly.
 * - Learners cannot create certificates directly.
 * - Assessment answer keys live only in /courseAssessments.
 * - Public /courses documents contain lesson content + assessment metadata only.
 * - Scores are calculated only inside Cloud Functions.
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const { initializeApp } = require("firebase-admin/app");
const {
  getFirestore,
  FieldValue
} = require("firebase-admin/firestore");
const crypto = require("crypto");

initializeApp();
const db = getFirestore();

function norm(v) {
  return String(v || "").trim().toLowerCase();
}

function requireAuth(request) {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError("unauthenticated", "You must be signed in.");
  }
  return request.auth.uid;
}

async function approvedProfile(uid) {
  const snap = await db.doc(`users/${uid}`).get();
  if (!snap.exists) {
    throw new HttpsError("failed-precondition", "Learner profile not found.");
  }
  const p = { uid, ...snap.data() };
  if (!(norm(p.status) === "approved" || p.approved === true)) {
    throw new HttpsError("permission-denied", "Your account must be approved.");
  }
  return p;
}

async function requireAdmin(uid) {
  const p = await approvedProfile(uid);
  const role = norm(p.role);
  if (role !== "admin" && role !== "super_admin") {
    throw new HttpsError("permission-denied", "Admin access required.");
  }
  return p;
}

function assessmentId(courseId, type, moduleIndex = null) {
  return type === "final"
    ? `${courseId}__final`
    : `${courseId}__module__${Number(moduleIndex)}`;
}

function getModules(course) {
  return Array.isArray(course.modules) ? course.modules : [];
}

function getLessons(module) {
  return Array.isArray(module?.lessons) ? module.lessons : [];
}

function lessonId(courseId, moduleIndex, lesson, lessonIndex) {
  return lesson?.id || `${courseId}-m${moduleIndex + 1}-l${lessonIndex + 1}`;
}

function emptyProgress(uid, courseId, title = "") {
  return {
    userId: uid,
    courseId,
    courseTitle: title,
    completedLessons: [],
    passedModuleQuizzes: {},
    moduleQuizScores: {},
    finalAssessmentPassed: false,
    finalAssessmentScore: 0,
    percent: 0,
    progress: 0,
    status: "in_progress"
  };
}

function moduleQuizRequired(module) {
  return !!module?.quiz;
}

function moduleLessonIds(courseId, module, mi) {
  return getLessons(module).map((l, li) => lessonId(courseId, mi, l, li));
}

function moduleLessonsComplete(courseId, module, mi, progress) {
  const done = new Set(Array.isArray(progress.completedLessons) ? progress.completedLessons : []);
  return moduleLessonIds(courseId, module, mi).every(id => done.has(id));
}

function modulePassed(courseId, modules, mi, progress) {
  if (!moduleLessonsComplete(courseId, modules[mi], mi, progress)) return false;
  if (!moduleQuizRequired(modules[mi])) return true;
  return progress.passedModuleQuizzes?.[mi] === true ||
         progress.passedModuleQuizzes?.[String(mi)] === true;
}

function priorModulesPassed(courseId, modules, targetMi, progress) {
  for (let mi = 0; mi < targetMi; mi++) {
    if (!modulePassed(courseId, modules, mi, progress)) return false;
  }
  return true;
}

function counts(courseId, course, progress) {
  const modules = getModules(course);
  const done = new Set(Array.isArray(progress.completedLessons) ? progress.completedLessons : []);
  let lessonTotal = 0, lessonDone = 0, quizTotal = 0, quizDone = 0;

  modules.forEach((m, mi) => {
    const ids = moduleLessonIds(courseId, m, mi);
    lessonTotal += ids.length;
    lessonDone += ids.filter(id => done.has(id)).length;
    if (m.quiz) {
      quizTotal += 1;
      if (
        progress.passedModuleQuizzes?.[mi] === true ||
        progress.passedModuleQuizzes?.[String(mi)] === true
      ) quizDone += 1;
    }
  });

  const total = lessonTotal + quizTotal;
  const complete = lessonDone + quizDone;
  const percent = total ? Math.round((complete / total) * 100) : 0;
  return { lessonTotal, lessonDone, quizTotal, quizDone, total, complete, percent };
}

function publicProgress(progress, course) {
  const c = counts(progress.courseId, course, progress);
  return {
    ...progress,
    completedLessons: Array.isArray(progress.completedLessons) ? progress.completedLessons : [],
    passedModuleQuizzes: progress.passedModuleQuizzes || {},
    moduleQuizScores: progress.moduleQuizScores || {},
    percent: c.percent,
    progress: c.percent,
    counts: c
  };
}

function sanitizeQuestions(assessment) {
  const questions = Array.isArray(assessment.questions) ? assessment.questions : [];
  return questions.map((q, index) => ({
    index,
    question: q.question || q.text || `Question ${index + 1}`,
    type: q.type || "multiple-choice",
    options: Array.isArray(q.options)
      ? q.options.map(op => typeof op === "object" ? (op.text || op.label || "") : op)
      : []
  }));
}

function answerIndex(q) {
  if (Number.isInteger(q.answer)) return q.answer;
  if (Number.isInteger(q.correctAnswer)) return q.correctAnswer;
  if (typeof q.answer === "string" && Array.isArray(q.options)) {
    const idx = q.options.findIndex(op => {
      const text = typeof op === "object" ? (op.text || op.label || "") : op;
      return String(text) === q.answer;
    });
    if (idx >= 0) return idx;
  }
  return null;
}

function scoreAssessment(assessment, answers) {
  const qs = Array.isArray(assessment.questions) ? assessment.questions : [];
  if (!qs.length) {
    throw new HttpsError("failed-precondition", "Assessment has no questions.");
  }
  if (!Array.isArray(answers) || answers.length !== qs.length) {
    throw new HttpsError("invalid-argument", "Answer every question before submitting.");
  }

  let correct = 0;
  qs.forEach((q, i) => {
    const key = answerIndex(q);
    if (key === null) {
      throw new HttpsError(
        "failed-precondition",
        "This assessment is missing a server-side answer key."
      );
    }
    if (Number(answers[i]) === Number(key)) correct++;
  });

  const score = Math.round((correct / qs.length) * 100);
  const passMark = Number(assessment.passMark || 70);
  return { score, passMark, passed: score >= passMark, correct, total: qs.length };
}

function certificateCode(courseId) {
  const initials = String(courseId || "COURSE")
    .split("-")
    .map(x => x[0] || "")
    .join("")
    .toUpperCase()
    .slice(0, 5) || "CRS";
  const random = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `SO-${new Date().getFullYear()}-${initials}-${random}`;
}

function verificationCode() {
  return crypto.randomBytes(6).toString("hex").toUpperCase();
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

/**
 * One-time migration:
 * 1) Extracts answer-bearing assessments from public course docs.
 * 2) Saves them in private /courseAssessments.
 * 3) Replaces public quiz/finalAssessment objects with metadata only.
 */
exports.syncCourseAssessments = onCall(async request => {
  const uid = requireAuth(request);
  await requireAdmin(uid);

  const snap = await db.collection("courses").get();
  let coursesUpdated = 0;
  let assessmentsCreated = 0;

  for (const courseDoc of snap.docs) {
    const course = courseDoc.data();
    const courseId = courseDoc.id;
    const modules = getModules(course);
    const publicModules = JSON.parse(JSON.stringify(modules));

    const writes = [];

    modules.forEach((module, mi) => {
      if (module.quiz && Array.isArray(module.quiz.questions) && module.quiz.questions.length) {
        const id = assessmentId(courseId, "module", mi);
        writes.push({
          ref: db.doc(`courseAssessments/${id}`),
          data: {
            id,
            courseId,
            type: "module",
            moduleIndex: mi,
            title: module.quiz.title || `${module.title || `Module ${mi + 1}`} Quiz`,
            passMark: Number(module.quiz.passMark || 70),
            questions: module.quiz.questions,
            updatedAt: FieldValue.serverTimestamp()
          }
        });
        publicModules[mi].quiz = {
          id,
          title: module.quiz.title || `${module.title || `Module ${mi + 1}`} Quiz`,
          passMark: Number(module.quiz.passMark || 70),
          questionCount: module.quiz.questions.length
        };
      }
    });

    let publicFinal = course.finalAssessment || null;
    if (
      course.finalAssessment &&
      Array.isArray(course.finalAssessment.questions) &&
      course.finalAssessment.questions.length
    ) {
      const id = assessmentId(courseId, "final");
      writes.push({
        ref: db.doc(`courseAssessments/${id}`),
        data: {
          id,
          courseId,
          type: "final",
          title: course.finalAssessment.title || "Final Assessment",
          passMark: Number(course.finalAssessment.passMark || 70),
          questions: course.finalAssessment.questions,
          updatedAt: FieldValue.serverTimestamp()
        }
      });
      publicFinal = {
        id,
        title: course.finalAssessment.title || "Final Assessment",
        passMark: Number(course.finalAssessment.passMark || 70),
        questionCount: course.finalAssessment.questions.length
      };
    }

    if (writes.length) {
      let batch = db.batch();
      let opCount = 0;
      for (const w of writes) {
        batch.set(w.ref, w.data, { merge: true });
        opCount++;
        assessmentsCreated++;
        if (opCount >= 400) {
          await batch.commit();
          batch = db.batch();
          opCount = 0;
        }
      }
      if (opCount) await batch.commit();

      await courseDoc.ref.set({
        modules: publicModules,
        finalAssessment: publicFinal,
        secureAssessmentVersion: 1,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });

      coursesUpdated++;
    }
  }

  logger.info("Secure assessment migration complete", { coursesUpdated, assessmentsCreated });
  return { ok: true, coursesUpdated, assessmentsCreated };
});


exports.getLearningState = onCall(async request => {
  const uid = requireAuth(request);
  await approvedProfile(uid);

  const courseId = String(request.data?.courseId || "").trim();
  if (!courseId) throw new HttpsError("invalid-argument", "courseId is required.");

  const [courseSnap, progressSnap] = await Promise.all([
    db.doc(`courses/${courseId}`).get(),
    db.doc(`userProgress/${uid}_${courseId}`).get()
  ]);

  if (!courseSnap.exists) throw new HttpsError("not-found", "Course not found.");
  const course = { id: courseSnap.id, ...courseSnap.data() };
  const progress = progressSnap.exists
    ? progressSnap.data()
    : emptyProgress(uid, courseId, course.title || "");

  return { progress: publicProgress(progress, course) };
});


exports.markLessonComplete = onCall(async request => {
  const uid = requireAuth(request);
  await approvedProfile(uid);

  const courseId = String(request.data?.courseId || "").trim();
  const targetLessonId = String(request.data?.lessonId || "").trim();
  if (!courseId || !targetLessonId) {
    throw new HttpsError("invalid-argument", "courseId and lessonId are required.");
  }

  const courseRef = db.doc(`courses/${courseId}`);
  const progressRef = db.doc(`userProgress/${uid}_${courseId}`);

  return await db.runTransaction(async tx => {
    const [courseSnap, progressSnap] = await Promise.all([
      tx.get(courseRef),
      tx.get(progressRef)
    ]);

    if (!courseSnap.exists) throw new HttpsError("not-found", "Course not found.");
    const course = { id: courseSnap.id, ...courseSnap.data() };
    const modules = getModules(course);
    let found = null;

    modules.forEach((m, mi) => {
      getLessons(m).forEach((l, li) => {
        const id = lessonId(courseId, mi, l, li);
        if (id === targetLessonId) found = { moduleIndex: mi, lessonIndex: li, id };
      });
    });

    if (!found) throw new HttpsError("not-found", "Lesson not found in this course.");

    const p = progressSnap.exists
      ? progressSnap.data()
      : emptyProgress(uid, courseId, course.title || "");

    if (!priorModulesPassed(courseId, modules, found.moduleIndex, p)) {
      throw new HttpsError("failed-precondition", "Complete and pass the previous module first.");
    }

    if (found.lessonIndex > 0) {
      const previous = getLessons(modules[found.moduleIndex])[found.lessonIndex - 1];
      const previousId = lessonId(courseId, found.moduleIndex, previous, found.lessonIndex - 1);
      if (!(p.completedLessons || []).includes(previousId)) {
        throw new HttpsError("failed-precondition", "Complete the previous lesson first.");
      }
    }

    const completed = new Set(Array.isArray(p.completedLessons) ? p.completedLessons : []);
    completed.add(targetLessonId);

    const updated = {
      ...p,
      userId: uid,
      courseId,
      courseTitle: course.title || "",
      completedLessons: [...completed],
      updatedAt: FieldValue.serverTimestamp()
    };
    const c = counts(courseId, course, updated);
    updated.percent = c.percent;
    updated.progress = c.percent;
    updated.status = c.percent === 100 ? "final_assessment_unlocked" : "in_progress";

    tx.set(progressRef, updated, { merge: true });
    return { ok: true, progress: publicProgress(updated, course) };
  });
});


exports.getAssessment = onCall(async request => {
  const uid = requireAuth(request);
  await approvedProfile(uid);

  const courseId = String(request.data?.courseId || "").trim();
  const type = norm(request.data?.type);
  const moduleIndex = Number(request.data?.moduleIndex);
  if (!courseId || !["module", "final"].includes(type)) {
    throw new HttpsError("invalid-argument", "Valid courseId and assessment type are required.");
  }

  const [courseSnap, progressSnap] = await Promise.all([
    db.doc(`courses/${courseId}`).get(),
    db.doc(`userProgress/${uid}_${courseId}`).get()
  ]);
  if (!courseSnap.exists) throw new HttpsError("not-found", "Course not found.");

  const course = { id: courseSnap.id, ...courseSnap.data() };
  const modules = getModules(course);
  const progress = progressSnap.exists
    ? progressSnap.data()
    : emptyProgress(uid, courseId, course.title || "");

  if (type === "module") {
    if (!Number.isInteger(moduleIndex) || !modules[moduleIndex]) {
      throw new HttpsError("invalid-argument", "Invalid module index.");
    }
    if (!priorModulesPassed(courseId, modules, moduleIndex, progress)) {
      throw new HttpsError("failed-precondition", "Complete the previous module first.");
    }
    if (!moduleLessonsComplete(courseId, modules[moduleIndex], moduleIndex, progress)) {
      throw new HttpsError("failed-precondition", "Complete every lesson in this module first.");
    }
  } else {
    const c = counts(courseId, course, progress);
    if (c.percent !== 100) {
      throw new HttpsError("failed-precondition", "Reach 100% course progress before the final assessment.");
    }
  }

  const id = assessmentId(courseId, type, type === "module" ? moduleIndex : null);
  const assessmentSnap = await db.doc(`courseAssessments/${id}`).get();
  if (!assessmentSnap.exists) {
    throw new HttpsError("not-found", "Secure assessment record not found. Run the assessment migration.");
  }

  const a = assessmentSnap.data();
  return {
    assessment: {
      id,
      type,
      title: a.title || (type === "final" ? "Final Assessment" : "Module Quiz"),
      passMark: Number(a.passMark || 70),
      questions: sanitizeQuestions(a)
    }
  };
});


exports.submitAssessment = onCall(async request => {
  const uid = requireAuth(request);
  const profile = await approvedProfile(uid);

  const courseId = String(request.data?.courseId || "").trim();
  const type = norm(request.data?.type);
  const moduleIndex = Number(request.data?.moduleIndex);
  const answers = request.data?.answers;

  if (!courseId || !["module", "final"].includes(type)) {
    throw new HttpsError("invalid-argument", "Valid courseId and type are required.");
  }

  const courseRef = db.doc(`courses/${courseId}`);
  const progressRef = db.doc(`userProgress/${uid}_${courseId}`);
  const aid = assessmentId(courseId, type, type === "module" ? moduleIndex : null);
  const assessmentRef = db.doc(`courseAssessments/${aid}`);

  return await db.runTransaction(async tx => {
    const [courseSnap, progressSnap, assessmentSnap] = await Promise.all([
      tx.get(courseRef),
      tx.get(progressRef),
      tx.get(assessmentRef)
    ]);

    if (!courseSnap.exists) throw new HttpsError("not-found", "Course not found.");
    if (!assessmentSnap.exists) throw new HttpsError("not-found", "Assessment not found.");

    const course = { id: courseSnap.id, ...courseSnap.data() };
    const modules = getModules(course);
    const p = progressSnap.exists
      ? progressSnap.data()
      : emptyProgress(uid, courseId, course.title || "");

    if (type === "module") {
      if (!Number.isInteger(moduleIndex) || !modules[moduleIndex]) {
        throw new HttpsError("invalid-argument", "Invalid module index.");
      }
      if (!priorModulesPassed(courseId, modules, moduleIndex, p)) {
        throw new HttpsError("failed-precondition", "Complete the previous module first.");
      }
      if (!moduleLessonsComplete(courseId, modules[moduleIndex], moduleIndex, p)) {
        throw new HttpsError("failed-precondition", "Complete every lesson in this module first.");
      }
    } else {
      const c = counts(courseId, course, p);
      if (c.percent !== 100) {
        throw new HttpsError("failed-precondition", "Reach 100% before the final assessment.");
      }
    }

    const assessment = assessmentSnap.data();
    const result = scoreAssessment(assessment, answers);

    const updated = {
      ...p,
      userId: uid,
      courseId,
      courseTitle: course.title || "",
      passedModuleQuizzes: { ...(p.passedModuleQuizzes || {}) },
      moduleQuizScores: { ...(p.moduleQuizScores || {}) },
      updatedAt: FieldValue.serverTimestamp()
    };

    let certificate = null;

    if (type === "module") {
      const key = String(moduleIndex);
      updated.moduleQuizScores[key] = Math.max(
        Number(updated.moduleQuizScores[key] || 0),
        result.score
      );
      if (result.passed) updated.passedModuleQuizzes[key] = true;

      const c = counts(courseId, course, updated);
      updated.percent = c.percent;
      updated.progress = c.percent;
      updated.status = c.percent === 100 ? "final_assessment_unlocked" : "in_progress";
    } else {
      updated.finalAssessmentScore = Math.max(
        Number(p.finalAssessmentScore || 0),
        result.score
      );
      if (result.passed) {
        updated.finalAssessmentPassed = true;
        updated.status = "completed";

        const certId = `${uid}_${courseId}`;
        const certRef = db.doc(`certificates/${certId}`);
        const existingCert = await tx.get(certRef);

        if (existingCert.exists) {
          certificate = { id: certId, ...existingCert.data() };
          updated.certificateId = certId;
        } else {
          const recipientName =
            profile.fullName ||
            `${profile.firstName || ""} ${profile.lastName || ""}`.trim() ||
            request.auth?.token?.name ||
            "Learner";

          certificate = {
            id: certId,
            recipientId: uid,
            recipientName,
            recipientEmail: profile.email || request.auth?.token?.email || "",
            courseId,
            courseTitle: course.title || "",
            issuer: course.certificate?.issuer || course.provider || "SpeakHub Academy",
            provider: course.provider || "SpeakHub Academy",
            finalScore: result.score,
            passMark: result.passMark,
            issueDate: new Date().toISOString().slice(0, 10),
            certificateNumber: certificateCode(courseId),
            verificationCode: verificationCode(),
            status: "active",
            type: "course",
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
          };
          tx.set(certRef, certificate);
          updated.certificateId = certId;
        }
      }
    }

    tx.set(progressRef, updated, { merge: true });

    return {
      ok: true,
      score: result.score,
      passMark: result.passMark,
      passed: result.passed,
      progress: publicProgress(updated, course),
      certificate: certificate ? {
        id: certificate.id,
        certificateNumber: certificate.certificateNumber,
        verificationCode: certificate.verificationCode
      } : null
    };
  });
});


/**
 * External-course certificate review (admin only).
 *
 * Learners submit proof of an externally-completed course into
 * /externalLearningRecords (see external-learning-submit.html). Nothing
 * previously reviewed those submissions, so they were permanently stuck
 * "pending". This callable lets an approved admin/super_admin approve,
 * reject, or request resubmission. On approval it idempotently issues a
 * SEPARATE SpeakOut "Certificate of Completion" verifying the learner's
 * evidence — it never claims SpeakOut delivered the external course.
 */
const EXTERNAL_REVIEW_DECISIONS = {
  approved: { status: "approved", verificationStatus: "approved" },
  rejected: { status: "rejected", verificationStatus: "rejected" },
  resubmission_required: { status: "resubmission_required", verificationStatus: "rejected" }
};

exports.reviewExternalCertificate = onCall(async request => {
  const uid = requireAuth(request);
  const reviewer = await requireAdmin(uid);

  const recordId = String(request.data?.recordId || "").trim();
  const decision = norm(request.data?.decision);
  const note = String(request.data?.note || "").trim();

  if (!recordId) {
    throw new HttpsError("invalid-argument", "recordId is required.");
  }
  const mapped = EXTERNAL_REVIEW_DECISIONS[decision];
  if (!mapped) {
    throw new HttpsError("invalid-argument", "decision must be approved, rejected or resubmission_required.");
  }

  const recordRef = db.doc(`externalLearningRecords/${recordId}`);

  return await db.runTransaction(async tx => {
    const recordSnap = await tx.get(recordRef);
    if (!recordSnap.exists) throw new HttpsError("not-found", "Submission not found.");
    const record = recordSnap.data();

    const learnerUid = record.userId;
    const courseId = record.courseId;
    if (!learnerUid || !courseId) {
      throw new HttpsError("failed-precondition", "Submission is missing learner or course reference.");
    }

    const progressRef = db.doc(`userProgress/${learnerUid}_external_${courseId}`);
    const certId = `${learnerUid}_external_${courseId}`;
    const certRef = db.doc(`certificates/${certId}`);

    const [progressSnap, existingCertSnap] = await Promise.all([
      tx.get(progressRef),
      decision === "approved" ? tx.get(certRef) : Promise.resolve(null)
    ]);

    let certificate = null;

    if (decision === "approved") {
      if (existingCertSnap && existingCertSnap.exists) {
        certificate = { id: certId, ...existingCertSnap.data() };
      } else {
        certificate = {
          id: certId,
          recipientId: learnerUid,
          recipientName: record.learnerName || "Learner",
          recipientEmail: record.userEmail || "",
          type: "external-completion",
          title: "Certificate of Completion — External Learning Verified",
          courseId,
          courseTitle: record.courseTitle || "",
          externalProvider: record.provider || "External Provider",
          externalProviderCourseUrl: record.providerCourseUrl || "",
          externalCertificateNumber: record.certificateNumber || "",
          externalCompletionDate: record.completionDate || "",
          issuer: "SpeakOut Mental Health Outreach",
          statement: `This certifies that SpeakOut Mental Health Outreach has verified proof that the recipient completed "${record.courseTitle || "an external learning course"}", provided by ${record.provider || "an external provider"} (not by SpeakOut).`,
          issueDate: new Date().toISOString().slice(0, 10),
          certificateNumber: certificateCode(`ext-${courseId}`),
          verificationCode: verificationCode(),
          status: "active",
          verifiedBy: uid,
          verifiedByName: reviewer.fullName || reviewer.email || "SpeakOut Admin",
          verifiedAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        };
        tx.set(certRef, certificate);
      }
    }

    tx.set(recordRef, {
      status: mapped.status,
      verificationStatus: mapped.verificationStatus,
      reviewerFeedback: note,
      reviewedBy: uid,
      reviewedByName: reviewer.fullName || reviewer.email || "SpeakOut Admin",
      reviewedAt: FieldValue.serverTimestamp(),
      certificateId: certificate ? certificate.id : (record.certificateId || null),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    if (progressSnap.exists) {
      tx.set(progressRef, {
        status: decision === "approved" ? "completed" : mapped.status,
        verificationStatus: mapped.verificationStatus,
        certificateId: certificate ? certificate.id : (progressSnap.data().certificateId || null),
        reviewerFeedback: note,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
    }

    return {
      ok: true,
      decision,
      certificate: certificate ? {
        id: certificate.id,
        certificateNumber: certificate.certificateNumber,
        verificationCode: certificate.verificationCode
      } : null
    };
  });
});


/**
 * Book-submission review (admin only).
 *
 * Anyone signed in can submit a book (free or paid/external) into
 * /bookSubmissions via submit-book.html. This callable lets an approved
 * admin/super_admin approve or reject it. On approval it idempotently
 * creates the public /books document the E-Library reads from, reusing
 * the same document across re-approvals instead of duplicating it.
 */
const BOOK_REVIEW_DECISIONS = {
  approved: "approved",
  rejected: "rejected"
};

exports.reviewBookSubmission = onCall(async request => {
  const uid = requireAuth(request);
  const reviewer = await requireAdmin(uid);

  const submissionId = String(request.data?.submissionId || "").trim();
  const decision = norm(request.data?.decision);
  const note = String(request.data?.note || "").trim();

  if (!submissionId) {
    throw new HttpsError("invalid-argument", "submissionId is required.");
  }
  const mappedStatus = BOOK_REVIEW_DECISIONS[decision];
  if (!mappedStatus) {
    throw new HttpsError("invalid-argument", "decision must be approved or rejected.");
  }

  const submissionRef = db.doc(`bookSubmissions/${submissionId}`);

  return await db.runTransaction(async tx => {
    const submissionSnap = await tx.get(submissionRef);
    if (!submissionSnap.exists) throw new HttpsError("not-found", "Submission not found.");
    const submission = submissionSnap.data();

    if (!submission.title) {
      throw new HttpsError("failed-precondition", "Submission is missing a title.");
    }

    let bookId = submission.bookId || null;
    let book = null;

    if (decision === "approved") {
      bookId = bookId || `${slugify(submission.title)}-${submissionId.slice(0, 6)}`;
      const bookRef = db.doc(`books/${bookId}`);
      const isPaid = norm(submission.accessType) === "paid";

      book = {
        id: bookId,
        title: submission.title,
        author: submission.authorName || "Independent Author",
        category: submission.category || "general",
        audience: Array.isArray(submission.audience) ? submission.audience : ["all"],
        shortDescription: submission.shortDescription || "",
        description: submission.description || submission.shortDescription || "",
        coverUrl: submission.coverUrl || "",
        accessType: isPaid ? "paid" : "free",
        price: isPaid ? Number(submission.price || 0) : 0,
        currency: isPaid ? (submission.currency || "₦") : "₦",
        purchasePlatform: isPaid ? (submission.purchasePlatform || "") : "",
        purchaseUrl: isPaid ? (submission.purchaseUrl || "") : "",
        tags: Array.isArray(submission.tags) ? submission.tags : [],
        status: "active",
        featured: false,
        source: "community",
        submittedBy: submission.submittedBy || "",
        contactEmail: submission.contactEmail || "",
        verifiedBy: uid,
        verifiedByName: reviewer.fullName || reviewer.email || "SpeakOut Admin",
        verifiedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        ...(submission.bookId ? {} : { createdAt: FieldValue.serverTimestamp() })
      };

      tx.set(bookRef, book, { merge: true });
    }

    tx.set(submissionRef, {
      status: mappedStatus,
      bookId: decision === "approved" ? bookId : (submission.bookId || null),
      reviewerFeedback: note,
      reviewedBy: uid,
      reviewedByName: reviewer.fullName || reviewer.email || "SpeakOut Admin",
      reviewedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    return {
      ok: true,
      decision,
      bookId: book ? book.id : null
    };
  });
});
