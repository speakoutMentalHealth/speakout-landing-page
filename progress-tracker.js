// progress-tracker.js
// SpeakHub Academy unified progress tracking
// Supports books, internal courses, external courses, lesson progress,
// completion state, certificates, local fallback and Firestore analytics.

import { auth, db } from "./firebase-config.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";


let currentUser = null;


onAuthStateChanged(
  auth,
  (user) => {
    currentUser = user || null;
  }
);


/* =========================================================
   HELPERS
========================================================= */

function cleanId(value){
  return String(value || "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 120);
}


function normalize(value){
  return String(value || "")
    .trim()
    .toLowerCase();
}


function asArray(value){
  if(Array.isArray(value)){
    return value;
  }

  if(
    value === null ||
    value === undefined ||
    value === ""
  ){
    return [];
  }

  return [value];
}


function isExternalCourse(course){
  return (
    normalize(course?.courseType) === "external" ||
    normalize(course?.completionMethod) === "certificate-upload"
  );
}


function isInstructorLed(course){
  return normalize(course?.courseType) === "instructor-led";
}


function progressDocId(userId, courseId){
  return `${userId}_${cleanId(courseId)}`;
}


function bookProgressDocId(userId, bookId){
  return `${userId}_book_${cleanId(bookId)}`;
}


function externalProgressDocId(userId, courseId){
  return `${userId}_external_${cleanId(courseId)}`;
}


function localCourseProgressKey(courseId){
  return `speakhub-progress-${courseId}`;
}


function readLocalCourseProgress(courseId){
  try{
    const raw =
      localStorage.getItem(
        localCourseProgressKey(courseId)
      );

    return raw
      ? JSON.parse(raw)
      : null;

  }catch(error){
    console.warn(
      "Could not read local course progress:",
      error
    );

    return null;
  }
}


function writeLocalCourseProgress(courseId, data){
  try{
    localStorage.setItem(
      localCourseProgressKey(courseId),
      JSON.stringify(data)
    );
  }catch(error){
    console.warn(
      "Could not save local course progress:",
      error
    );
  }
}


async function safeIncrement(collectionName, documentId, field){
  try{
    await updateDoc(
      doc(
        db,
        collectionName,
        documentId
      ),
      {
        [field]:
          increment(1),

        updatedAt:
          serverTimestamp()
      }
    );

  }catch(error){
    console.warn(
      `${collectionName}.${field} increment skipped:`,
      error.message
    );
  }
}


function baseUserFields(){
  return {
    userId:
      currentUser?.uid || "",

    userEmail:
      currentUser?.email || ""
  };
}


/* =========================================================
   BOOK TRACKING
========================================================= */

export async function trackBookOpen(book){

  if(
    !currentUser ||
    !book ||
    !book.id
  ){
    return;
  }


  const userId =
    currentUser.uid;


  const progressId =
    bookProgressDocId(
      userId,
      book.id
    );


  const progressRef =
    doc(
      db,
      "userProgress",
      progressId
    );


  const existing =
    await getDoc(
      progressRef
    );


  const alreadyOpened =
    existing.exists() &&
    Boolean(
      existing.data().openedAt
    );


  await setDoc(
    progressRef,
    {
      ...baseUserFields(),

      type:
        "book",

      itemId:
        book.id,

      bookId:
        book.id,

      title:
        book.title || "",

      category:
        book.category || "",

      audience:
        asArray(
          book.audience
        ),

      status:
        "opened",

      openedAt:
        existing.exists()
          ? existing.data().openedAt ||
            serverTimestamp()
          : serverTimestamp(),

      updatedAt:
        serverTimestamp()
    },
    {
      merge:true
    }
  );


  if(!alreadyOpened){
    await safeIncrement(
      "books",
      book.id,
      "views"
    );
  }

}


export async function trackBookDownload(book){

  if(
    !currentUser ||
    !book ||
    !book.id
  ){
    return;
  }


  const userId =
    currentUser.uid;


  const progressId =
    bookProgressDocId(
      userId,
      book.id
    );


  await setDoc(
    doc(
      db,
      "userProgress",
      progressId
    ),
    {
      ...baseUserFields(),

      type:
        "book",

      itemId:
        book.id,

      bookId:
        book.id,

      title:
        book.title || "",

      category:
        book.category || "",

      audience:
        asArray(
          book.audience
        ),

      status:
        "downloaded",

      downloadedAt:
        serverTimestamp(),

      updatedAt:
        serverTimestamp()
    },
    {
      merge:true
    }
  );


  await safeIncrement(
    "books",
    book.id,
    "downloads"
  );

}


/* =========================================================
   COURSE START / ENROLLMENT
========================================================= */

export async function trackCourseStart(course){

  if(
    !currentUser ||
    !course ||
    !course.id
  ){
    return;
  }


  if(isExternalCourse(course)){
    return await trackExternalCourseStart(
      course
    );
  }


  const userId =
    currentUser.uid;


  const progressId =
    progressDocId(
      userId,
      course.id
    );


  const progressRef =
    doc(
      db,
      "userProgress",
      progressId
    );


  const existing =
    await getDoc(
      progressRef
    );


  const alreadyStarted =
    existing.exists() &&
    Boolean(
      existing.data().startedAt
    );


  await setDoc(
    progressRef,
    {
      ...baseUserFields(),

      type:
        "course",

      itemId:
        course.id,

      courseId:
        course.id,

      title:
        course.title || "",

      category:
        course.category || "",

      audience:
        asArray(
          course.audience
        ),

      courseType:
        course.courseType ||
        "internal",

      provider:
        course.provider ||
        "SpeakHub Academy",

      status:
        existing.data()?.status === "completed"
          ? "completed"
          : "started",

      startedAt:
        existing.exists()
          ? existing.data().startedAt ||
            serverTimestamp()
          : serverTimestamp(),

      updatedAt:
        serverTimestamp()
    },
    {
      merge:true
    }
  );


  if(!alreadyStarted){
    await safeIncrement(
      "courses",
      course.id,
      "enrollments"
    );
  }

}


/* =========================================================
   LESSON-LEVEL PROGRESS
========================================================= */

export async function trackLessonComplete(
  course,
  lessonId,
  {
    currentLessonIndex = 0,
    totalLessons = 0
  } = {}
){

  if(
    !course ||
    !course.id ||
    !lessonId
  ){
    return;
  }


  const local =
    readLocalCourseProgress(
      course.id
    ) || {};


  const completedLessons =
    new Set(
      Array.isArray(
        local.completedLessons
      )
      ? local.completedLessons
      : []
    );


  completedLessons.add(
    lessonId
  );


  const completedCount =
    completedLessons.size;


  const percent =
    totalLessons
      ? Math.min(
          100,
          Math.round(
            (
              completedCount /
              totalLessons
            ) * 100
          )
        )
      : Number(
          local.percent || 0
        );


  const payload = {
    completedLessons:
      Array.from(
        completedLessons
      ),

    currentLessonIndex,

    completedCount,

    totalLessons,

    percent,

    progress:
      percent,

    completed:
      percent === 100,

    updatedAt:
      new Date().toISOString()
  };


  writeLocalCourseProgress(
    course.id,
    payload
  );


  if(!currentUser){
    return payload;
  }


  const userId =
    currentUser.uid;


  const progressId =
    progressDocId(
      userId,
      course.id
    );


  await setDoc(
    doc(
      db,
      "userProgress",
      progressId
    ),
    {
      ...baseUserFields(),

      type:
        "course",

      itemId:
        course.id,

      courseId:
        course.id,

      title:
        course.title || "",

      category:
        course.category || "",

      audience:
        asArray(
          course.audience
        ),

      provider:
        course.provider ||
        "SpeakHub Academy",

      courseType:
        course.courseType ||
        "internal",

      status:
        percent === 100
          ? "completed"
          : "in-progress",

      completedLessons:
        Array.from(
          completedLessons
        ),

      currentLessonIndex,

      completedCount,

      totalLessons,

      percent,

      progress:
        percent,

      completed:
        percent === 100,

      updatedAt:
        serverTimestamp()
    },
    {
      merge:true
    }
  );


  return payload;

}


/* =========================================================
   COURSE COMPLETION
========================================================= */

export async function trackCourseComplete(
  course,
  {
    completedLessons = [],
    totalLessons = 0,
    assessmentPassed = null,
    score = null
  } = {}
){

  if(
    !currentUser ||
    !course ||
    !course.id
  ){
    return;
  }


  if(isExternalCourse(course)){
    return await trackExternalCourseComplete(
      course
    );
  }


  const userId =
    currentUser.uid;


  const progressId =
    progressDocId(
      userId,
      course.id
    );


  const progressRef =
    doc(
      db,
      "userProgress",
      progressId
    );


  const existing =
    await getDoc(
      progressRef
    );


  const alreadyCompleted =
    existing.exists() &&
    normalize(
      existing.data().status
    ) === "completed";


  const certificateEnabled =
    (
      course.certificateEligible === true ||
      course.certificate?.available === true
    );


  await setDoc(
    progressRef,
    {
      ...baseUserFields(),

      type:
        "course",

      itemId:
        course.id,

      courseId:
        course.id,

      title:
        course.title || "",

      category:
        course.category || "",

      audience:
        asArray(
          course.audience
        ),

      courseType:
        course.courseType ||
        "internal",

      provider:
        course.provider ||
        "SpeakHub Academy",

      status:
        "completed",

      percent:
        100,

      progress:
        100,

      completed:
        true,

      completedLessons:
        asArray(
          completedLessons
        ),

      completedCount:
        asArray(
          completedLessons
        ).length,

      totalLessons,

      assessmentPassed,

      score,

      certificateEligible:
        certificateEnabled,

      certificateIssuer:
        course.certificate?.issuer ||
        course.certificateIssuer ||
        course.provider ||
        "SpeakHub Academy",

      completedAt:
        existing.exists()
          ? existing.data().completedAt ||
            serverTimestamp()
          : serverTimestamp(),

      updatedAt:
        serverTimestamp()
    },
    {
      merge:true
    }
  );


  writeLocalCourseProgress(
    course.id,
    {
      completedLessons:
        asArray(
          completedLessons
        ),

      currentLessonIndex:
        Math.max(
          Number(totalLessons) - 1,
          0
        ),

      completedCount:
        asArray(
          completedLessons
        ).length,

      totalLessons,

      percent:
        100,

      progress:
        100,

      completed:
        true,

      updatedAt:
        new Date().toISOString()
    }
  );


  if(!alreadyCompleted){
    await safeIncrement(
      "courses",
      course.id,
      "completions"
    );
  }

}


/* =========================================================
   EXTERNAL COURSE TRACKING
========================================================= */

export async function trackExternalCourseStart(course){

  if(
    !currentUser ||
    !course ||
    !course.id
  ){
    return;
  }


  const userId =
    currentUser.uid;


  const progressId =
    externalProgressDocId(
      userId,
      course.id
    );


  const ref =
    doc(
      db,
      "userProgress",
      progressId
    );


  const existing =
    await getDoc(
      ref
    );


  const alreadyStarted =
    existing.exists() &&
    Boolean(
      existing.data().startedAt
    );


  await setDoc(
    ref,
    {
      ...baseUserFields(),

      type:
        "external-course",

      itemId:
        course.id,

      courseId:
        course.id,

      title:
        course.title || "",

      category:
        course.category || "",

      audience:
        asArray(
          course.audience
        ),

      courseType:
        "external",

      provider:
        course.provider ||
        "External Provider",

      externalUrl:
        course.externalUrl || "",

      completionMethod:
        course.completionMethod ||
        "certificate-upload",

      status:
        existing.data()?.status === "completed"
          ? "completed"
          : "started",

      startedAt:
        existing.exists()
          ? existing.data().startedAt ||
            serverTimestamp()
          : serverTimestamp(),

      updatedAt:
        serverTimestamp()
    },
    {
      merge:true
    }
  );


  if(!alreadyStarted){
    await safeIncrement(
      "courses",
      course.id,
      "externalStarts"
    );
  }

}


/* =========================================================
   EXTERNAL COMPLETION / CERTIFICATE SUBMISSION
========================================================= */

export async function trackExternalCourseComplete(
  course,
  {
    certificateId = "",
    certificateUrl = "",
    providerCertificateId = "",
    verificationStatus = "pending"
  } = {}
){

  if(
    !currentUser ||
    !course ||
    !course.id
  ){
    return;
  }


  const userId =
    currentUser.uid;


  const progressId =
    externalProgressDocId(
      userId,
      course.id
    );


  const ref =
    doc(
      db,
      "userProgress",
      progressId
    );


  const existing =
    await getDoc(
      ref
    );


  const alreadyCompleted =
    existing.exists() &&
    normalize(
      existing.data().status
    ) === "completed";


  await setDoc(
    ref,
    {
      ...baseUserFields(),

      type:
        "external-course",

      itemId:
        course.id,

      courseId:
        course.id,

      title:
        course.title || "",

      category:
        course.category || "",

      audience:
        asArray(
          course.audience
        ),

      courseType:
        "external",

      provider:
        course.provider ||
        "External Provider",

      externalUrl:
        course.externalUrl || "",

      completionMethod:
        course.completionMethod ||
        "certificate-upload",

      status:
        "completed",

      completed:
        true,

      percent:
        100,

      progress:
        100,

      certificateId,

      certificateUrl,

      providerCertificateId,

      verificationStatus,

      completedAt:
        existing.exists()
          ? existing.data().completedAt ||
            serverTimestamp()
          : serverTimestamp(),

      updatedAt:
        serverTimestamp()
    },
    {
      merge:true
    }
  );


  if(!alreadyCompleted){
    await safeIncrement(
      "courses",
      course.id,
      "externalCompletions"
    );
  }

}


/* =========================================================
   CERTIFICATE RECORDING
========================================================= */

export async function trackCertificateIssued(
  course,
  certificate
){

  if(
    !currentUser ||
    !course ||
    !course.id ||
    !certificate
  ){
    return;
  }


  const external =
    isExternalCourse(course);


  const progressId =
    external
      ? externalProgressDocId(
          currentUser.uid,
          course.id
        )
      : progressDocId(
          currentUser.uid,
          course.id
        );


  await setDoc(
    doc(
      db,
      "userProgress",
      progressId
    ),
    {
      certificateIssued:
        true,

      certificateId:
        certificate.certificateId ||
        certificate.id ||
        "",

      certificateIssuer:
        certificate.issuer ||
        course.certificate?.issuer ||
        course.provider ||
        "SpeakHub Academy",

      verificationStatus:
        certificate.verificationStatus ||
        certificate.status ||
        "verified",

      certificateIssuedAt:
        serverTimestamp(),

      updatedAt:
        serverTimestamp()
    },
    {
      merge:true
    }
  );

}


/* =========================================================
   GENERIC ACCESSORS
========================================================= */

export function getCurrentUser(){
  return currentUser;
}


export function getLocalCourseProgress(courseId){
  return readLocalCourseProgress(
    courseId
  );
}


export async function syncLocalCourseProgress(
  course
){

  if(
    !currentUser ||
    !course ||
    !course.id
  ){
    return;
  }


  const local =
    readLocalCourseProgress(
      course.id
    );


  if(!local){
    return;
  }


  const progressId =
    progressDocId(
      currentUser.uid,
      course.id
    );


  await setDoc(
    doc(
      db,
      "userProgress",
      progressId
    ),
    {
      ...baseUserFields(),

      type:
        "course",

      itemId:
        course.id,

      courseId:
        course.id,

      title:
        course.title || "",

      category:
        course.category || "",

      audience:
        asArray(
          course.audience
        ),

      provider:
        course.provider ||
        "SpeakHub Academy",

      completedLessons:
        asArray(
          local.completedLessons
        ),

      currentLessonIndex:
        Number(
          local.currentLessonIndex || 0
        ),

      completedCount:
        Number(
          local.completedCount || 0
        ),

      totalLessons:
        Number(
          local.totalLessons || 0
        ),

      percent:
        Number(
          local.percent ||
          local.progress ||
          0
        ),

      progress:
        Number(
          local.progress ||
          local.percent ||
          0
        ),

      completed:
        Boolean(
          local.completed
        ),

      status:
        local.completed
          ? "completed"
          : Number(
              local.percent ||
              local.progress ||
              0
            ) > 0
              ? "in-progress"
              : "started",

      updatedAt:
        serverTimestamp()
    },
    {
      merge:true
    }
  );

}