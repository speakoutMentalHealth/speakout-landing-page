
import { auth, db } from "./firebase-config.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

function setText(selector, value, fallback = "—") {
  document.querySelectorAll(selector).forEach(el => {
    el.textContent = value || fallback;
  });
}

function setCount(selector, value) {
  document.querySelectorAll(selector).forEach(el => {
    el.textContent = Number(value || 0).toLocaleString();
  });
}

function progressBar(value) {
  const safe = Math.max(0, Math.min(100, Number(value || 0)));
  return `<div class="progress-bar"><span style="width:${safe}%"></span></div>`;
}

function courseCard(course) {
  return `
    <article class="student-card course-card">
      <div class="course-thumb">${course.icon || "🎓"}</div>
      <span class="badge">${course.category || "Course"}</span>
      <h3>${course.title || "Untitled Course"}</h3>
      <p>${course.description || "Continue your learning pathway."}</p>
      ${progressBar(course.progress || 0)}
      <a class="btn primary" href="courses.html">Continue</a>
    </article>
  `;
}

function resourceCard(resource) {
  return `
    <article class="student-card">
      <div class="course-thumb">${resource.icon || "📚"}</div>
      <span class="badge">${resource.category || "Resource"}</span>
      <h3>${resource.title || "Student Resource"}</h3>
      <p>${resource.description || "Helpful student support material."}</p>
      <a class="btn soft" href="library.html">Open</a>
    </article>
  `;
}

async function fetchCollection(name, constraints = []) {
  try {
    const q = query(collection(db, name), ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
  } catch (error) {
    console.warn(`Could not load ${name}:`, error);
    return [];
  }
}

async function loadStudentDashboard(user) {
  const profileSnap = await getDoc(doc(db, "users", user.uid));
  const profile = profileSnap.exists() ? profileSnap.data() : {};

  setText("[data-student-name]", profile.fullName || user.displayName || "Student");
  setText("[data-student-school]", profile.schoolName || profile.schoolId || "SpeakOut");
  setText("[data-student-role]", (profile.role || "student").replace("_", " "));

  const courses = await fetchCollection("courses", [
    where("audience", "in", ["student", "all"]),
    limit(6)
  ]);

  const resources = await fetchCollection("resources", [
    where("audience", "in", ["student", "all"]),
    limit(6)
  ]);

  const certificates = await fetchCollection("certificates", [
    where("userId", "==", user.uid),
    limit(20)
  ]);

  const fallbackCourses = [
    { title: "Coding for Beginners", category: "Technology", icon: "💻", progress: 68, description: "Build logic, creativity and digital confidence." },
    { title: "Stress & Exam Pressure", category: "Wellbeing", icon: "🧠", progress: 45, description: "Learn how to manage academic pressure safely." },
    { title: "Confidence & Public Speaking", category: "Leadership", icon: "🎤", progress: 25, description: "Practice communication and self-expression." }
  ];

  const fallbackResources = [
    { title: "Understanding Stress", category: "Guide", icon: "🧘", description: "Simple student guide to stress and coping." },
    { title: "When to Ask for Help", category: "Safety", icon: "🛡️", description: "Know when to speak to a trusted adult." },
    { title: "Digital Pressure", category: "Online Safety", icon: "📱", description: "Social media, comparison and boundaries." }
  ];

  const coursesToRender = courses.length ? courses : fallbackCourses;
  const resourcesToRender = resources.length ? resources : fallbackResources;

  const courseTarget = document.querySelector("[data-student-courses]");
  if (courseTarget) courseTarget.innerHTML = coursesToRender.map(courseCard).join("");

  const resourceTarget = document.querySelector("[data-student-resources]");
  if (resourceTarget) resourceTarget.innerHTML = resourcesToRender.map(resourceCard).join("");

  setCount("[data-count-courses]", coursesToRender.length);
  setCount("[data-count-resources]", resourcesToRender.length);
  setCount("[data-count-certificates]", certificates.length);

  const avgProgress = coursesToRender.length
    ? Math.round(coursesToRender.reduce((sum, course) => sum + Number(course.progress || 0), 0) / coursesToRender.length)
    : 0;

  setText("[data-count-progress]", `${avgProgress}%`, "0%");
}

onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  try {
    await loadStudentDashboard(user);
  } catch (error) {
    console.error("Student dashboard error:", error);
  }
});

