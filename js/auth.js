import { auth, db } from "./firebase-config.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const ROLE_DASHBOARDS = {
  student: "../dashboards/student/",
  ambassador: "../dashboards/student/",
  volunteer: "../dashboards/student/",
  parent: "../dashboards/parent/",
  teacher: "../dashboards/teacher/",
  school: "../dashboards/school/",
  school_admin: "../dashboards/school/",
  admin: "../dashboards/admin/",
  super_admin: "../dashboards/admin/"
};

function clean(value) {
  return (value || "").toString().trim();
}

function normalizeRole(role) {
  return clean(role).toLowerCase().replace(/\s+/g, "_");
}

function dashboardForRole(role) {
  return ROLE_DASHBOARDS[normalizeRole(role)] || "../auth/auth.html";
}

function getValue(...selectors) {
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el) return clean(el.value);
  }
  return "";
}

function showMessage(message) {
  const box =
    document.querySelector("[data-auth-message]") ||
    document.querySelector("#authMessage");

  if (box) {
    box.textContent = message;
    box.style.display = "block";
  } else {
    alert(message);
  }
}

async function redirectUser(user) {
  const snap = await getDoc(doc(db, "users", user.uid));

  if (!snap.exists()) {
    await signOut(auth);
    showMessage("Profile not found. Please contact SpeakOut admin.");
    return;
  }

  const profile = snap.data();
  const role = normalizeRole(profile.role);
  const status = normalizeRole(profile.status);
  const approved = profile.approved === true;

  if (!approved || status !== "approved") {
    await signOut(auth);
    showMessage("Your account is pending approval.");
    return;
  }

  window.location.href = dashboardForRole(role);
}

async function loginUser(event) {
  event?.preventDefault();

  const email = getValue(
    "[data-login-email]",
    "#loginEmail",
    "#email",
    "input[type='email']"
  );

  const password = getValue(
    "[data-login-password]",
    "#loginPassword",
    "#password",
    "input[type='password']"
  );

  if (!email || !password) {
    showMessage("Enter your email and password.");
    return;
  }

  try {
    showMessage("Signing in...");
    const result = await signInWithEmailAndPassword(auth, email, password);
    await redirectUser(result.user);
  } catch (error) {
    console.error(error);
    showMessage("Login failed. Check your email and password.");
  }
}

async function registerUser(event) {
  event?.preventDefault();

  const fullName = getValue(
    "[data-register-name]",
    "#fullName",
    "#name",
    "input[name='fullName']"
  );

  const email = getValue(
    "[data-register-email]",
    "#registerEmail",
    "#email",
    "input[type='email']"
  );

  const password = getValue(
    "[data-register-password]",
    "#registerPassword",
    "#password",
    "input[type='password']"
  );

  const role = normalizeRole(
    getValue("[data-register-role]", "#role", "select[name='role']") ||
    "student"
  );

  const schoolName = getValue(
    "[data-register-school]",
    "#schoolName",
    "input[name='schoolName']"
  );

  if (!fullName || !email || !password) {
    showMessage("Enter your full name, email and password.");
    return;
  }

  try {
    showMessage("Creating account...");

    const result = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db, "users", result.user.uid), {
      uid: result.user.uid,
      fullName,
      email,
      role,
      schoolName,
      approved: false,
      status: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    await signOut(auth);
    showMessage("Account created. Your access is pending approval.");
  } catch (error) {
    console.error(error);
    showMessage("Registration failed. Please try again.");
  }
}

document
  .querySelectorAll("[data-login-form], #loginForm")
  .forEach((form) => form.addEventListener("submit", loginUser));

document
  .querySelectorAll("[data-login-button], #loginButton")
  .forEach((btn) => btn.addEventListener("click", loginUser));

document
  .querySelectorAll("[data-register-form], #registerForm")
  .forEach((form) => form.addEventListener("submit", registerUser));

document
  .querySelectorAll("[data-register-button], #registerButton")
  .forEach((btn) => btn.addEventListener("click", registerUser));
