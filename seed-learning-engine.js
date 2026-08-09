/**
 * SpeakHub Academy - Production Learning Engine Seeder
 * ----------------------------------------------------
 * Purpose:
 * - Seeds/updates SpeakHub learning content in Firestore without duplicates.
 * - Supports internal, external and instructor-led courses.
 * - Loads data from the existing JSON seed files instead of keeping hundreds
 *   of kilobytes of content embedded inside this JavaScript file.
 * - Uses deterministic document IDs wherever possible.
 * - Uses merge:true so existing admin-added fields are preserved.
 * - Validates and normalizes legacy course records before writing.
 * - Supports dry-run validation and collection-by-collection reporting.
 *
 * Expected project files:
 *   ./firestore-seed/all-starter-content.json
 *   ./firestore-seed/books-starter.json
 *   ./firestore-seed/courses-starter.json
 *   ./courses-seed.json
 *   ./firestore-seed/student-wellbeing-book.json
 *   ./firestore-seed/student-wellbeing-course.json
 *   ./firestore-seed/student-wellbeing-quiz-bank.json
 *   ./firestore-seed/student-wellbeing-workbook.json
 *
 * The seeder is safe to run more than once because deterministic IDs and
 * Firestore merge writes are used.
 */

import { auth, db } from "./firebase-config.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  writeBatch,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";


/* =========================================================
   CONFIGURATION
========================================================= */

const CONFIG = {
  batchLimit: 450,

  paths: {
    allStarter: "./firestore-seed/all-starter-content.json",
    booksStarter: "./firestore-seed/books-starter.json",
    coursesStarter: "./firestore-seed/courses-starter.json",
    coursesSeed: "./courses-seed.json",

    studentWellbeingBook:
      "./firestore-seed/student-wellbeing-book.json",

    studentWellbeingCourse:
      "./firestore-seed/student-wellbeing-course.json",

    studentWellbeingQuizBank:
      "./firestore-seed/student-wellbeing-quiz-bank.json",

    studentWellbeingWorkbook:
      "./firestore-seed/student-wellbeing-workbook.json"
  },

  collections: {
    books: "books",
    courses: "courses",
    lessons: "lessons",
    quizzes: "quizzes",
    workbooks: "workbooks",
    announcements: "announcements",
    events: "events",
    media: "media",
    kiddies: "kiddiesResources"
  }
};


/* =========================================================
   BASIC HELPERS
========================================================= */

function normalize(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}


function slugify(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}


function unique(values) {
  return [...new Set(
    (values || [])
      .map(v => String(v || "").trim())
      .filter(Boolean)
  )];
}


function asArray(value) {
  if(Array.isArray(value)) {
    return value;
  }

  if(
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return [];
  }

  return [value];
}


function stripUndefined(value) {
  if(Array.isArray(value)) {
    return value
      .map(stripUndefined)
      .filter(v => v !== undefined);
  }

  if(
    value &&
    typeof value === "object" &&
    !(value instanceof Date)
  ) {
    const output = {};

    Object.entries(value).forEach(([key, item]) => {
      const clean = stripUndefined(item);

      if(clean !== undefined) {
        output[key] = clean;
      }
    });

    return output;
  }

  return value === undefined
    ? undefined
    : value;
}


function safeDocumentId(row, prefix = "item") {
  if(row?.id) {
    return String(row.id);
  }

  const candidate =
    row?.certificateId ||
    row?.courseId ||
    row?.bookId ||
    row?.quizId ||
    row?.lessonId ||
    row?.slug ||
    row?.title ||
    row?.name;

  const slug = slugify(candidate);

  return slug ||
    `${prefix}-${crypto.randomUUID()}`;
}


async function fetchJson(path, {
  optional = true
} = {}) {
  try {
    const response = await fetch(
      `${path}?seed=${Date.now()}`,
      {
        cache: "no-store"
      }
    );

    if(!response.ok) {
      if(optional) {
        console.info(
          `[SpeakHub Seeder] Optional file unavailable: ${path}`
        );

        return null;
      }

      throw new Error(
        `Could not load ${path}. HTTP ${response.status}`
      );
    }

    return await response.json();

  } catch(error) {
    if(optional) {
      console.info(
        `[SpeakHub Seeder] Optional file skipped: ${path}`,
        error
      );

      return null;
    }

    throw error;
  }
}


/* =========================================================
   ADMIN ACCESS
========================================================= */

async function getAdminProfile(user) {
  if(!user) {
    return null;
  }

  const snap =
    await getDoc(
      doc(
        db,
        "users",
        user.uid
      )
    );

  if(!snap.exists()) {
    return null;
  }

  return {
    uid: user.uid,
    ...snap.data()
  };
}


async function isAdmin(user) {
  const profile =
    await getAdminProfile(user);

  if(!profile) {
    return false;
  }

  const role =
    normalize(profile.role);

  const status =
    normalize(profile.status);

  return (
    (
      role === "admin" ||
      role === "super_admin"
    ) &&
    (
      profile.approved === true ||
      status === "approved"
    )
  );
}


/* =========================================================
   COURSE NORMALIZATION
========================================================= */

const AUDIENCE_ALIASES = {
  student: "secondary",
  students: "secondary",
  parent: "parents",
  teacher: "teachers",
  ambassador: "ambassadors",
  adult: "adults",
  "young professional": "young-professionals",
  "young-professional": "young-professionals",
  ngo: "ngo-professionals"
};


function normalizeAudience(value) {
  const source =
    asArray(value);

  const mapped =
    source.map(item => {
      const key =
        normalize(item);

      return (
        AUDIENCE_ALIASES[key] ||
        key
      );
    });

  return unique(
    mapped.length
      ? mapped
      : ["general"]
  );
}


function normalizeDifficulty(value) {
  const level =
    normalize(value);

  if(
    level === "advanced" ||
    level === "intermediate" ||
    level === "beginner"
  ) {
    return level;
  }

  if(
    level === "introductory" ||
    level === "intro" ||
    level === "foundation" ||
    level === "foundational"
  ) {
    return "beginner";
  }

  if(
    level === "coordinator" ||
    level === "professional"
  ) {
    return "intermediate";
  }

  return "beginner";
}


function normalizeCourseType(course) {
  const type =
    normalize(course.courseType);

  if(
    type === "external" ||
    type === "instructor-led" ||
    type === "internal"
  ) {
    return type;
  }

  if(
    course.externalUrl ||
    normalize(course.completionMethod) === "certificate-upload"
  ) {
    return "external";
  }

  return "internal";
}


function normalizeCertificate(course, provider) {
  const raw =
    course.certificate;

  if(
    raw &&
    typeof raw === "object" &&
    !Array.isArray(raw)
  ) {
    return {
      available:
        raw.available !== false,

      issuer:
        raw.issuer ||
        course.certificateIssuer ||
        provider,

      verificationRequired:
        Boolean(raw.verificationRequired),

      uploadRequired:
        Boolean(raw.uploadRequired)
    };
  }

  const available =
    course.certificateEligible === true ||
    raw === true;

  return {
    available,

    issuer:
      course.certificateIssuer ||
      provider,

    verificationRequired:
      normalizeCourseType(course) === "external",

    uploadRequired:
      normalizeCourseType(course) === "external"
  };
}


function countCourseLessons(course) {
  if(
    Number.isFinite(
      Number(course.lessonCount)
    ) &&
    Number(course.lessonCount) >= 0
  ) {
    return Number(course.lessonCount);
  }

  if(!Array.isArray(course.modules)) {
    return 0;
  }

  return course.modules.reduce(
    (total, module) =>
      total +
      (
        Array.isArray(module.lessons)
          ? module.lessons.length
          : 0
      ),
    0
  );
}


function normalizeCourse(rawCourse) {
  const course =
    structuredClone(rawCourse || {});

  const courseType =
    normalizeCourseType(course);

  const provider =
    course.provider ||
    (
      normalize(course.category) === "mental-health"
        ? "SpeakOut Mental Health"
        : "SpeakHub Academy"
    );

  const certificate =
    normalizeCertificate(
      course,
      provider
    );

  const free =
    course.free !== undefined
      ? Boolean(course.free)
      : normalize(course.accessType || "free") === "free";

  const id =
    course.id ||
    slugify(course.title);

  const normalized = {
    ...course,

    id,

    title:
      course.title ||
      "Untitled Course",

    courseType,

    provider,

    providerLogo:
      course.providerLogo || "",

    category:
      normalize(course.category || "general"),

    audience:
      normalizeAudience(
        course.audience
      ),

    difficulty:
      normalizeDifficulty(
        course.difficulty ||
        course.level
      ),

    duration:
      course.duration ||
      course.estimatedDuration ||
      "Self-paced",

    description:
      course.description ||
      course.shortDescription ||
      "",

    status:
      normalize(
        course.status ||
        "active"
      ),

    featured:
      Boolean(course.featured),

    free,

    accessType:
      free
        ? "free"
        : "premium",

    certificateEligible:
      certificate.available,

    certificate,

    completionMethod:
      course.completionMethod ||
      (
        courseType === "external"
          ? "certificate-upload"
          : courseType === "instructor-led"
            ? "instructor-led"
            : "internal"
      ),

    lessonCount:
      countCourseLessons(course)
  };


  if(courseType === "external") {
    normalized.externalUrl =
      course.externalUrl || "";

    normalized.certificate.verificationRequired =
      course.certificate?.verificationRequired !== undefined
        ? Boolean(
            course.certificate.verificationRequired
          )
        : true;

    normalized.certificate.uploadRequired =
      course.certificate?.uploadRequired !== undefined
        ? Boolean(
            course.certificate.uploadRequired
          )
        : true;
  }


  /*
    Legacy fields are kept intentionally for backwards compatibility.
    New pages should use difficulty, free, provider and certificate.
  */

  normalized.level =
    normalized.difficulty;

  return stripUndefined(
    normalized
  );
}


/* =========================================================
   BOOK / RESOURCE NORMALIZATION
========================================================= */

function normalizeBook(rawBook) {
  const book =
    structuredClone(rawBook || {});

  return stripUndefined({
    ...book,

    id:
      book.id ||
      slugify(book.title),

    title:
      book.title ||
      "Untitled Resource",

    category:
      normalize(
        book.category ||
        "general"
      ),

    audience:
      unique(
        asArray(
          book.audience
        )
        .map(normalize)
      ),

    author:
      book.author ||
      "SpeakOut Mental Health Outreach",

    status:
      normalize(
        book.status ||
        "active"
      ),

    accessType:
      normalize(
        book.accessType ||
        "free"
      ),

    featured:
      Boolean(book.featured),

    tags:
      unique(
        asArray(book.tags)
      )
  });
}


/* =========================================================
   GENERIC CONTENT NORMALIZATION
========================================================= */

function normalizeGeneric(raw, prefix) {
  const item =
    structuredClone(raw || {});

  return stripUndefined({
    ...item,

    id:
      item.id ||
      slugify(
        item.title ||
        `${prefix}-${crypto.randomUUID()}`
      )
  });
}


/* =========================================================
   MODULE / LESSON EXTRACTION
========================================================= */

function extractLessonsFromCourses(courseRows) {
  const lessons = [];

  courseRows.forEach(course => {
    if(!Array.isArray(course.modules)) {
      return;
    }

    course.modules.forEach(
      (module, moduleIndex) => {

        const moduleTitle =
          module.title ||
          `Module ${moduleIndex + 1}`;

        const moduleId =
          module.id ||
          `${course.id}-module-${moduleIndex + 1}`;


        asArray(module.lessons)
          .forEach(
            (lesson, lessonIndex) => {

              const lessonId =
                lesson.id ||
                `${course.id}-m${moduleIndex + 1}-l${lessonIndex + 1}`;

              lessons.push(
                stripUndefined({
                  ...lesson,

                  id: lessonId,

                  courseId:
                    course.id,

                  moduleId,

                  moduleTitle,

                  moduleIndex,

                  lessonIndex,

                  order:
                    lesson.order ??
                    lessonIndex + 1,

                  title:
                    lesson.title ||
                    `Lesson ${lessonIndex + 1}`,

                  status:
                    lesson.status ||
                    "active"
                })
              );
            }
          );
      }
    );
  });

  return lessons;
}


function extractQuizzesFromCourses(courseRows) {
  const quizzes = [];

  courseRows.forEach(course => {
    if(!Array.isArray(course.modules)) {
      return;
    }

    course.modules.forEach(
      (module, moduleIndex) => {

        if(module.quiz) {
          quizzes.push(
            stripUndefined({
              ...module.quiz,

              id:
                module.quiz.id ||
                `${course.id}-module-${moduleIndex + 1}-quiz`,

              courseId:
                course.id,

              moduleIndex,

              moduleTitle:
                module.title ||
                `Module ${moduleIndex + 1}`,

              assessmentType:
                "module-quiz",

              status:
                module.quiz.status ||
                "active"
            })
          );
        }


        if(module.finalAssessment) {
          quizzes.push(
            stripUndefined({
              ...module.finalAssessment,

              id:
                module.finalAssessment.id ||
                `${course.id}-final-assessment`,

              courseId:
                course.id,

              moduleIndex,

              moduleTitle:
                module.title ||
                `Module ${moduleIndex + 1}`,

              assessmentType:
                "final-assessment",

              status:
                module.finalAssessment.status ||
                "active"
            })
          );
        }

      }
    );
  });

  return quizzes;
}


/* =========================================================
   FIRESTORE WRITE ENGINE
========================================================= */

async function getExistingIds(
  collectionName
) {
  const snap =
    await getDocs(
      collection(
        db,
        collectionName
      )
    );

  return new Set(
    snap.docs.map(
      document =>
        document.id
    )
  );
}


async function seedCollection(
  collectionName,
  rows,
  {
    dryRun = false,
    preserveCreatedAt = true
  } = {}
) {
  const cleanRows =
    (rows || [])
      .filter(Boolean);

  if(!cleanRows.length) {
    return {
      collection:
        collectionName,

      total: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      dryRun
    };
  }


  const existingIds =
    await getExistingIds(
      collectionName
    );


  let created = 0;
  let updated = 0;
  let skipped = 0;


  if(dryRun) {
    cleanRows.forEach(row => {
      const id =
        safeDocumentId(
          row,
          collectionName
        );

      if(existingIds.has(id)) {
        updated++;
      } else {
        created++;
      }
    });

    return {
      collection:
        collectionName,

      total:
        cleanRows.length,

      created,
      updated,
      skipped,
      dryRun: true
    };
  }


  /*
    Firestore write batches are limited. Keep a margin below 500.
  */

  for(
    let offset = 0;
    offset < cleanRows.length;
    offset += CONFIG.batchLimit
  ) {
    const chunk =
      cleanRows.slice(
        offset,
        offset + CONFIG.batchLimit
      );

    const batch =
      writeBatch(db);


    chunk.forEach(row => {
      try {
        const id =
          safeDocumentId(
            row,
            collectionName
          );

        const ref =
          doc(
            db,
            collectionName,
            id
          );

        const exists =
          existingIds.has(id);

        const payload =
          stripUndefined({
            ...row,

            id,

            updatedAt:
              serverTimestamp(),

            ...(
              !exists &&
              preserveCreatedAt
                ? {
                    createdAt:
                      serverTimestamp()
                  }
                : {}
            )
          });


        batch.set(
          ref,
          payload,
          {
            merge: true
          }
        );


        if(exists) {
          updated++;
        } else {
          created++;
          existingIds.add(id);
        }

      } catch(error) {
        skipped++;

        console.error(
          `[SpeakHub Seeder] Could not prepare ${collectionName} row`,
          row,
          error
        );
      }
    });


    await batch.commit();
  }


  return {
    collection:
      collectionName,

    total:
      cleanRows.length,

    created,
    updated,
    skipped,
    dryRun: false
  };
}


/* =========================================================
   SOURCE LOADING
========================================================= */

async function loadSeedSources() {
  const [
    allStarter,
    booksStarter,
    coursesStarter,
    coursesSeed,
    studentWellbeingBook,
    studentWellbeingCourse,
    studentWellbeingQuizBank,
    studentWellbeingWorkbook
  ] = await Promise.all([
    fetchJson(
      CONFIG.paths.allStarter
    ),

    fetchJson(
      CONFIG.paths.booksStarter
    ),

    fetchJson(
      CONFIG.paths.coursesStarter
    ),

    fetchJson(
      CONFIG.paths.coursesSeed
    ),

    fetchJson(
      CONFIG.paths.studentWellbeingBook
    ),

    fetchJson(
      CONFIG.paths.studentWellbeingCourse
    ),

    fetchJson(
      CONFIG.paths.studentWellbeingQuizBank
    ),

    fetchJson(
      CONFIG.paths.studentWellbeingWorkbook
    )
  ]);


  const rawBooks = [
    ...asArray(
      allStarter?.books
    ),

    ...asArray(
      booksStarter
    ),

    ...asArray(
      studentWellbeingBook
    )
  ];


  const rawCourses = [
    ...asArray(
      allStarter?.courses
    ),

    ...asArray(
      coursesStarter
    ),

    ...asArray(
      coursesSeed
    ),

    ...asArray(
      studentWellbeingCourse
    )
  ];


  /*
    Deduplicate by deterministic ID.
    Later sources win, which allows courses-seed.json to override
    starter/demo records.
  */

  const courseMap =
    new Map();

  rawCourses
    .filter(Boolean)
    .forEach(raw => {
      const normalized =
        normalizeCourse(raw);

      if(normalized.id) {
        courseMap.set(
          normalized.id,
          normalized
        );
      }
    });


  const courses =
    [...courseMap.values()];


  const bookMap =
    new Map();

  rawBooks
    .filter(Boolean)
    .forEach(raw => {
      const normalized =
        normalizeBook(raw);

      if(normalized.id) {
        bookMap.set(
          normalized.id,
          normalized
        );
      }
    });


  const books =
    [...bookMap.values()];


  const embeddedLessons =
    extractLessonsFromCourses(
      courses
    );


  const embeddedQuizzes =
    extractQuizzesFromCourses(
      courses
    );


  const quizBank =
    asArray(
      studentWellbeingQuizBank
    )
    .map(
      item =>
        normalizeGeneric(
          item,
          "quiz"
        )
    );


  const workbooks =
    asArray(
      studentWellbeingWorkbook
    )
    .map(
      item =>
        normalizeGeneric(
          item,
          "workbook"
        )
    );


  const announcements =
    asArray(
      allStarter?.announcements
    )
    .map(
      item =>
        normalizeGeneric(
          item,
          "announcement"
        )
    );


  const events =
    asArray(
      allStarter?.events
    )
    .map(
      item =>
        normalizeGeneric(
          item,
          "event"
        )
    );


  const media =
    asArray(
      allStarter?.media
    )
    .map(
      item =>
        normalizeGeneric(
          item,
          "media"
        )
    );


  return {
    books,
    courses,
    lessons:
      embeddedLessons,

    quizzes: [
      ...embeddedQuizzes,
      ...quizBank
    ],

    workbooks,
    announcements,
    events,
    media
  };
}


/* =========================================================
   VALIDATION
========================================================= */

function validateCourse(course) {
  const problems = [];

  if(!course.id) {
    problems.push(
      "Missing course ID."
    );
  }

  if(!course.title) {
    problems.push(
      "Missing title."
    );
  }

  if(
    ![
      "internal",
      "external",
      "instructor-led"
    ].includes(
      course.courseType
    )
  ) {
    problems.push(
      "Invalid courseType."
    );
  }

  if(
    ![
      "beginner",
      "intermediate",
      "advanced"
    ].includes(
      course.difficulty
    )
  ) {
    problems.push(
      "Invalid difficulty."
    );
  }

  if(
    !Array.isArray(
      course.audience
    )
  ) {
    problems.push(
      "Audience must be an array."
    );
  }

  if(
    course.courseType === "external" &&
    !course.externalUrl
  ) {
    problems.push(
      "External course has no externalUrl."
    );
  }

  return problems;
}


function validateSeedData(data) {
  const errors = [];
  const warnings = [];


  data.courses.forEach(course => {
    const issues =
      validateCourse(course);

    issues.forEach(issue => {
      const entry = {
        collection:
          "courses",

        id:
          course.id,

        issue
      };

      if(
        issue ===
        "External course has no externalUrl."
      ) {
        warnings.push(entry);
      } else {
        errors.push(entry);
      }
    });
  });


  const duplicateCheck = [
    ["books", data.books],
    ["courses", data.courses],
    ["lessons", data.lessons],
    ["quizzes", data.quizzes],
    ["workbooks", data.workbooks]
  ];


  duplicateCheck.forEach(
    ([name, rows]) => {

      const ids =
        new Set();

      rows.forEach(row => {
        const id =
          safeDocumentId(
            row,
            name
          );

        if(ids.has(id)) {
          errors.push({
            collection:
              name,

            id,

            issue:
              "Duplicate document ID in seed data."
          });
        }

        ids.add(id);
      });

    }
  );


  return {
    valid:
      errors.length === 0,

    errors,
    warnings
  };
}


/* =========================================================
   MAIN SEED OPERATION
========================================================= */

async function runLearningSeed({
  dryRun = false
} = {}) {
  const user =
    auth.currentUser;


  if(
    !await isAdmin(user)
  ) {
    throw new Error(
      "Only approved admins or super admins can seed learning content."
    );
  }


  const data =
    await loadSeedSources();


  const validation =
    validateSeedData(data);


  if(!validation.valid) {
    console.error(
      "[SpeakHub Seeder] Validation failed:",
      validation.errors
    );

    throw new Error(
      `Seed validation failed with ${validation.errors.length} error(s). Check the browser console.`
    );
  }


  if(validation.warnings.length) {
    console.warn(
      "[SpeakHub Seeder] Validation warnings:",
      validation.warnings
    );
  }


  const results = {
    dryRun,
    validation,

    books:
      await seedCollection(
        CONFIG.collections.books,
        data.books,
        { dryRun }
      ),

    courses:
      await seedCollection(
        CONFIG.collections.courses,
        data.courses,
        { dryRun }
      ),

    lessons:
      await seedCollection(
        CONFIG.collections.lessons,
        data.lessons,
        { dryRun }
      ),

    quizzes:
      await seedCollection(
        CONFIG.collections.quizzes,
        data.quizzes,
        { dryRun }
      ),

    workbooks:
      await seedCollection(
        CONFIG.collections.workbooks,
        data.workbooks,
        { dryRun }
      ),

    announcements:
      await seedCollection(
        CONFIG.collections.announcements,
        data.announcements,
        { dryRun }
      ),

    events:
      await seedCollection(
        CONFIG.collections.events,
        data.events,
        { dryRun }
      ),

    media:
      await seedCollection(
        CONFIG.collections.media,
        data.media,
        { dryRun }
      )
  };


  console.table(
    Object.entries(results)
      .filter(
        ([, value]) =>
          value &&
          typeof value === "object" &&
          "collection" in value
      )
      .map(
        ([key, value]) => ({
          key,
          collection:
            value.collection,
          total:
            value.total,
          created:
            value.created,
          updated:
            value.updated,
          skipped:
            value.skipped,
          dryRun:
            value.dryRun
        })
      )
  );


  return results;
}


/* =========================================================
   PUBLIC FUNCTIONS
========================================================= */

/*
  Existing HTML can continue calling:
      await window.seedLearningEngine();

  Optional validation-only run:
      await window.previewLearningSeed();
*/

window.seedLearningEngine =
  async function() {
    return await runLearningSeed({
      dryRun: false
    });
  };


window.previewLearningSeed =
  async function() {
    return await runLearningSeed({
      dryRun: true
    });
  };


window.validateLearningSeed =
  async function() {
    const data =
      await loadSeedSources();

    return validateSeedData(
      data
    );
  };


/* =========================================================
   OPTIONAL PAGE UI INTEGRATION
========================================================= */

function setStatus(
  message,
  type = "info"
) {
  const status =
    document.getElementById(
      "seedStatus"
    );

  if(!status) {
    return;
  }

  status.textContent =
    message;

  status.dataset.status =
    type;
}


function setButtonBusy(
  busy,
  text
) {
  const btn =
    document.getElementById(
      "seedButton"
    );

  if(!btn) {
    return;
  }

  btn.disabled =
    Boolean(busy);

  if(text) {
    btn.textContent =
      text;
  }
}


async function seedFromPage() {
  setButtonBusy(
    true,
    "Seeding..."
  );

  setStatus(
    "Validating and seeding SpeakHub learning content...",
    "loading"
  );


  try {
    const result =
      await window.seedLearningEngine();


    const summary =
      [
        result.books,
        result.courses,
        result.lessons,
        result.quizzes,
        result.workbooks,
        result.announcements,
        result.events,
        result.media
      ]
      .filter(Boolean)
      .reduce(
        (acc, item) => {
          acc.total +=
            item.total || 0;

          acc.created +=
            item.created || 0;

          acc.updated +=
            item.updated || 0;

          acc.skipped +=
            item.skipped || 0;

          return acc;
        },
        {
          total: 0,
          created: 0,
          updated: 0,
          skipped: 0
        }
      );


    setStatus(
      `Seed complete. ${summary.created} created, ${summary.updated} updated, ${summary.skipped} skipped across ${summary.total} records.`,
      "success"
    );


  } catch(error) {
    console.error(
      "[SpeakHub Seeder]",
      error
    );


    setStatus(
      error.message ||
      "Learning seed failed.",
      "error"
    );


  } finally {
    setButtonBusy(
      false,
      "Seed Learning Engine"
    );
  }
}


/* =========================================================
   AUTH STATE
========================================================= */

onAuthStateChanged(
  auth,
  async user => {

    const btn =
      document.getElementById(
        "seedButton"
      );


    if(!user) {
      setStatus(
        "Login as an approved admin first.",
        "error"
      );

      if(btn) {
        btn.disabled = true;
      }

      return;
    }


    if(
      !await isAdmin(user)
    ) {
      setStatus(
        "This page is admin-only.",
        "error"
      );

      if(btn) {
        btn.disabled = true;
      }

      return;
    }


    setStatus(
      "Admin verified. The learning engine is ready to seed.",
      "success"
    );


    if(btn) {
      btn.disabled = false;

      /*
        Only attach the listener if inline onclick is not already used.
      */

      if(
        !btn.dataset.seedListenerAttached &&
        !btn.getAttribute("onclick")
      ) {
        btn.addEventListener(
          "click",
          seedFromPage
        );

        btn.dataset.seedListenerAttached =
          "true";
      }
    }

  }
);
