/**
 * SpeakOut E-Library - One-time duplicate/stub book cleanup
 * -----------------------------------------------------------
 * Deletes book documents in the `books` collection that have no real
 * content: no `content`, `contentHtml`, `purchaseUrl`, `downloadUrl`,
 * `bookSlides`, `slides`, or non-empty `chapters` field. These are
 * leftover placeholder/stub entries seeded before real content existed.
 *
 * Safe to run more than once - it re-checks live data each time and
 * only ever deletes documents matching that exact definition of "empty".
 */

import { auth, db } from "./firebase-config.js";

import {
  collection,
  getDocs,
  writeBatch,
  doc
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";


async function getAdminProfile(user) {
  if (!user) return null;

  const { getDoc, doc: docRef } = await import(
    "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js"
  );

  const snap = await getDoc(docRef(db, "users", user.uid));
  if (!snap.exists()) return null;

  return { uid: user.uid, ...snap.data() };
}


function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}


async function isAdmin(user) {
  const profile = await getAdminProfile(user);
  if (!profile) return false;

  const role = normalize(profile.role);
  const status = normalize(profile.status);

  return (
    (role === "admin" || role === "super_admin") &&
    (profile.approved === true || status === "approved")
  );
}


function hasRealContent(data) {
  return !!(
    data.content ||
    data.contentHtml ||
    data.purchaseUrl ||
    data.downloadUrl ||
    (Array.isArray(data.bookSlides) && data.bookSlides.length) ||
    (Array.isArray(data.slides) && data.slides.length) ||
    (Array.isArray(data.chapters) && data.chapters.some(c => c && (c.content || c.body)))
  );
}


async function findStubBooks() {
  const snap = await getDocs(collection(db, "books"));
  const stubs = [];

  snap.forEach(d => {
    const data = d.data();
    if (!hasRealContent(data)) {
      stubs.push({ id: d.id, title: data.title || "(untitled)" });
    }
  });

  return { total: snap.size, stubs };
}


async function previewCleanup() {
  const user = auth.currentUser;
  if (!await isAdmin(user)) {
    throw new Error("Only approved admins or super admins can run this cleanup.");
  }

  return await findStubBooks();
}


async function runCleanup() {
  const user = auth.currentUser;
  if (!await isAdmin(user)) {
    throw new Error("Only approved admins or super admins can run this cleanup.");
  }

  const { stubs, total } = await findStubBooks();

  let deleted = 0;
  for (let i = 0; i < stubs.length; i += 450) {
    const batch = writeBatch(db);
    const chunk = stubs.slice(i, i + 450);
    for (const stub of chunk) {
      batch.delete(doc(db, "books", stub.id));
    }
    await batch.commit();
    deleted += chunk.length;
  }

  return { totalBefore: total, deleted, remaining: total - deleted };
}


window.previewBookCleanup = previewCleanup;
window.runBookCleanup = runCleanup;
