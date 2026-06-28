import { auth, db } from "./firebase-config.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

function $(id) {
  return document.getElementById(id);
}

function clean(value) {
  return (value || "").toString().trim();
}

function showMessage(id, message, type = "ok") {
  const el = $(id);
  if (!el) return;
  el.textContent = message;
  el.className = `message ${type}`;
}

function normalizeRole(role) {
  return clean(role).toLowerCase();
}

function dashboardForRole(role) {
  const map = {
    student: "../dashboards/student/",
    parent: "../dashboards/parent/",
    teacher: "../dashboards/teacher/",
    school_admin: "../dashboards/school/",
    admin: "../dashboards/admin/",
    super_admin: "../dashboards/admin/",
    ambassador: "../dashboards/student/"
  };
  return map[role] || "../auth/auth.html";
}

function friendlyAuthError(error) {
  const code = error?.code || "";
  const messages = {
    "auth/email-already-in-use": "This email is already registered. Please login instead.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/weak-password": "Password should be at least 6 characters.",
    "auth/user-not-found": "No account found with this email.",
    "auth/wrong-password": "Incorrect password. Please try again.",
    "auth/invalid-credential": "Invalid login details. Please check your email and password.",
    "auth/too-many-requests": "Too many attempts. Please wait a little and try again.",
    "permission-denied": "Permission denied. Please contact SpeakOut admin."
  };
  return messages[code] || "Something went wrong. Please try again.";
}

const registerForm = $("registerForm");

if (registerForm) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const fullName = clean($("fullName")?.value);
    const email = clean($("email")?.value).toLowerCase();
    const phone = clean($("phone")?.value);
    const role = normalizeRole($("role")?.value);
    const schoolName = clean($("schoolName")?.value);
    const schoolCode = clean($("schoolCode")?.value);
    const location = clean($("location")?.value);
    const accessPurpose = clean($("accessPurpose")?.value);
    const password = $("password")?.value || "";
    const confirmPassword = $("confirmPassword")?.value || "";
    const reason = clean($("reason")?.value);

    if (!fullName || !email || !role || !password || !confirmPassword) {
      showMessage("regMsg", "Please complete all required fields.", "bad");
      return;
    }

    if (password.length < 6) {
      showMessage("regMsg", "Password must be at least 6 characters.", "bad");
      return;
    }

    if (password !== confirmPassword) {
      showMessage("regMsg", "Passwords do not match.", "bad");
      return;
    }

    try {
      showMessage("regMsg", "Creating your account...", "ok");

      const credential = await createUserWithEmailAndPassword(auth, email, password);
      const user = credential.user;

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        fullName,
        email,
        phone,
        role,
        schoolName,
        schoolCode,
        schoolId: schoolCode || "",
        location,
        accessPurpose,
        reason,
        status: "pending",
        approved: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      await signOut(auth);

      showMessage(
        "regMsg",
        "Application submitted successfully. SpeakOut will review your account before dashboard access opens.",
        "ok"
      );

      registerForm.reset();
    } catch (error) {
      console.error("Registration error:", error);
      showMessage("regMsg", friendlyAuthError(error), "bad");
    }
  });
}

const loginForm = $("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = clean($("loginEmail")?.value).toLowerCase();
    const password = $("loginPassword")?.value || "";

    if (!email || !password) {
      showMessage("loginMsg", "Please enter your email and password.", "bad");
      return;
    }

    try {
      showMessage("loginMsg", "Checking your account...", "ok");

      const credential = await signInWithEmailAndPassword(auth, email, password);
      const user = credential.user;

      const userSnap = await getDoc(doc(db, "users", user.uid));

      if (!userSnap.exists()) {
        await signOut(auth);
        showMessage("loginMsg", "Your profile was not found. Please contact SpeakOut admin.", "bad");
        return;
      }

      const profile = userSnap.data();
      const status = clean(profile.status).toLowerCase();
      const approved = profile.approved === true;
      const role = normalizeRole(profile.role);

      if (!approved || status !== "approved") {
        await signOut(auth);
        showMessage("loginMsg", "Your account is still pending approval. Please contact SpeakOut admin.", "bad");
        return;
      }

      showMessage("loginMsg", "Login successful. Redirecting...", "ok");
      window.location.href = dashboardForRole(role);
    } catch (error) {
      console.error("Login error:", error);
      showMessage("loginMsg", friendlyAuthError(error), "bad");
    }
  });
}

const forgotPasswordLink = $("forgotPasswordLink");

if (forgotPasswordLink) {
  forgotPasswordLink.addEventListener("click", async (event) => {
    event.preventDefault();

    const email = clean($("loginEmail")?.value).toLowerCase();

    if (!email) {
      showMessage("loginMsg", "Enter your email address first, then click forgot password.", "bad");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      showMessage("loginMsg", "Password reset email sent. Please check your inbox.", "ok");
    } catch (error) {
      console.error("Password reset error:", error);
      showMessage("loginMsg", friendlyAuthError(error), "bad");
    }
  });
}
