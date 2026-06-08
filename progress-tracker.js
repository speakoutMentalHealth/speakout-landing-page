// progress-tracker.js
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import {
  doc,
  setDoc,
  updateDoc,
  increment,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

let currentUser = null;

onAuthStateChanged(auth, (user) => {
  currentUser = user;
});

function cleanId(value){
  return String(value || "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 120);
}

export async function trackBookOpen(book){
  if(!currentUser || !book || !book.id) return;

  const userId = currentUser.uid;
  const bookId = cleanId(book.id);

  await setDoc(doc(db, "userProgress", `${userId}_book_${bookId}`), {
    userId,
    userEmail: currentUser.email,
    type: "book",
    itemId: book.id,
    title: book.title || "",
    category: book.category || "",
    audience: book.audience || "",
    status: "opened",
    openedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true });

  try{
    await updateDoc(doc(db, "books", book.id), {
      views: increment(1),
      updatedAt: serverTimestamp()
    });
  }catch(e){
    console.warn("Book view increment skipped:", e.message);
  }
}

export async function trackBookDownload(book){
  if(!currentUser || !book || !book.id) return;

  const userId = currentUser.uid;
  const bookId = cleanId(book.id);

  await setDoc(doc(db, "userProgress", `${userId}_book_${bookId}`), {
    userId,
    userEmail: currentUser.email,
    type: "book",
    itemId: book.id,
    title: book.title || "",
    category: book.category || "",
    audience: book.audience || "",
    status: "downloaded",
    downloadedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true });

  try{
    await updateDoc(doc(db, "books", book.id), {
      downloads: increment(1),
      updatedAt: serverTimestamp()
    });
  }catch(e){
    console.warn("Book download increment skipped:", e.message);
  }
}

export async function trackCourseStart(course){
  if(!currentUser || !course || !course.id) return;

  const userId = currentUser.uid;
  const courseId = cleanId(course.id);

  await setDoc(doc(db, "userProgress", `${userId}_course_${courseId}`), {
    userId,
    userEmail: currentUser.email,
    type: "course",
    itemId: course.id,
    title: course.title || "",
    category: course.category || "",
    audience: course.audience || "",
    status: "started",
    startedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true });

  try{
    await updateDoc(doc(db, "courses", course.id), {
      enrollments: increment(1),
      updatedAt: serverTimestamp()
    });
  }catch(e){
    console.warn("Course enrollment increment skipped:", e.message);
  }
}

export async function trackCourseComplete(course){
  if(!currentUser || !course || !course.id) return;

  const userId = currentUser.uid;
  const courseId = cleanId(course.id);

  await setDoc(doc(db, "userProgress", `${userId}_course_${courseId}`), {
    userId,
    userEmail: currentUser.email,
    type: "course",
    itemId: course.id,
    title: course.title || "",
    category: course.category || "",
    audience: course.audience || "",
    status: "completed",
    completedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true });

  try{
    await updateDoc(doc(db, "courses", course.id), {
      completions: increment(1),
      updatedAt: serverTimestamp()
    });
  }catch(e){
    console.warn("Course completion increment skipped:", e.message);
  }
}
