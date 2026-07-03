import { auth, db } from "./firebase-config.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const ROLE_DASHBOARDS = {
  student: "../dashboards/student/",
  parent: "../dashboards/parent/",
  teacher: "../dashboards/teacher/",
  school: "../dashboards/school/",
  school_admin: "../dashboards/school/",
  admin: "../dashboards/admin/",
  super_admin: "../dashboards/admin/",
  ambassador: "../dashboards/student/",
  volunteer: "../dashboards/student/"
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

function getInput(...selectors) {
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el) return el;
  }
  return null;
}

function getValue(...selectors) {
  return clean(getInput(...selectors)?.value);
}

function showAuthMessage(message, type = "info") {
  const target =
    document.querySelector("[data-auth-message]") ||
    document.querySelector("#authMessage") ||
    document.querySelector(".auth-message");

  if (target) {
    target.textContent = message;
    target.dataset.type = type;
    target.style.display = "block";
    return;
  }

  alert(message);
}

async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return snap.data();
}

async function redirectByUserRole(user) {
  const profile = await getUserProfile(user.uid);

  if (!profile) {
    showAuthMessage("Your account exists, but your profile was not found. Please contact SpeakOut admin.", "error");
    await signOut(auth);
    return;
  }

  const role = normalizeRole(profile.role);
  const status = normalizeRole(profile.status);

  if (status !== "approved") {
    showAuthMessage("Your account is pending approval. Please contact SpeakOut admin if this is urgent.", "warning");
    await signOut(auth);
    return;
  }

  window.location.replace(dashboardForRole(role));
}

async function handleLogin(event) {
  event?.preventDefault();

  const email = getValue(
    "[data-login-email]",
    "#loginEmail",
    "#email",
    "input[type='email']",
    "input[name='email']"
  );

  const password = getValue(
    "[data-login-password]",
    "#loginPassword",
    "#password",
    "input[type='password']",
    "input[name='password']"
  );

  if (!email || !password) {
    showAuthMessage("Enter your email and password.", "error");
    return;
  }

  try {
    sessionStorage.removeItem("speakoutManualLogout");
    showAuthMessage("Signing you in...", "info");

    const credential = await signInWithEmailAndPassword(auth, email, password);
    await redirectByUserRole(credential.user);
  } catch (error) {
    console.error("Login error:", error);
    showAuthMessage("Login failed. Please check your email and password.", "error");
  }
}

async function handleRegister(event) {
  event?.preventDefault();

  const fullName = getValue(
    "[data-register-name]",
    "#fullName",
    "#name",
    "input[name='fullName']",
    "input[name='name']"
  );

  const email = getValue(
    "[data-register-email]",
    "#registerEmail",
    "#email",
    "input[type='email']",
    "input[name='email']"
  );

  const password = getValue(
    "[data-register-password]",
    "#registerPassword",
    "#password",
    "input[type='password']",
    "input[name='password']"
  );

  const role = normalizeRole(getValue(
    "[data-register-role]",
    "#role",
    "select[name='role']"
  ) || "student");

  const schoolName = getValue(
    "[data-register-school]",
    "#schoolName",
    "input[name='schoolName']"
  );

  if (!fullName || !email || !password) {
    showAuthMessage("Enter your name, email and password.", "error");
    return;
  }

  try {
    showAuthMessage("Creating your account...", "info");

    const credential = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db, "users", credential.user.uid), {
      uid: credential.user.uid,
      fullName,
      email,
      role,
      schoolName,
      status: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });

    sessionStorage.setItem("speakoutManualLogout", "true");
    await signOut(auth);

    showAuthMessage("Account created. Your access is pending SpeakOut approval.", "success");
  } catch (error) {
    console.error("Registration error:", error);
    showAuthMessage(error.message || "Registration failed.", "error");
  }
}

async function handleLogout(event) {
  event?.preventDefault();

  try {
    sessionStorage.setItem("speakoutManualLogout", "true");

    localStorage.removeItem("speakoutRole");
    localStorage.removeItem("speakoutUser");
    localStorage.removeItem("speakoutSchoolCode");
    localStorage.removeItem("speakoutSchoolName");

    await signOut(auth);

    window.location.replace("../auth/auth.html?loggedOut=1");
  } catch (error) {
    console.error("Logout error:", error);
    showAuthMessage("Logout failed. Please try again.", "error");
  }
}

document.querySelectorAll("[data-login-form], #loginForm, form.login-form").forEach(form => {
  form.addEventListener("submit", handleLogin);
});

document.querySelectorAll("[data-login-button], #loginButton").forEach(btn => {
  btn.addEventListener("click", handleLogin);
});

document.querySelectorAll("[data-register-form], #registerForm, form.register-form").forEach(form => {
  form.addEventListener("submit", handleRegister);
});

document.querySelectorAll("[data-register-button], #registerButton").forEach(btn => {
  btn.addEventListener("click", handleRegister);
});

document.querySelectorAll("[data-logout], #logoutButton, .logout").forEach(btn => {
  btn.addEventListener("click", handleLogout);
});

document.querySelectorAll("[data-demo-login]").forEach(btn => {
  btn.addEventListener("click", handleLogin);
});

document.querySelectorAll("[data-role]").forEach(card => {
  card.addEventListener("click", () => {
    localStorage.setItem("speakoutRole", card.dataset.role);
  });
});

const pageType = document.body?.dataset?.authPage || "";

if (pageType === "login" || pageType === "auth") {
  onAuthStateChanged(auth, async (user) => {
    const params = new URLSearchParams(window.location.search);

    const justLoggedOut =
      params.get("loggedOut") === "1" ||
      sessionStorage.getItem("speakoutManualLogout") === "true";

    if (justLoggedOut) {
      sessionStorage.removeItem("speakoutManualLogout");
      return;
    }

    if (user) {
      await redirectByUserRole(user);
    }
  });
}

