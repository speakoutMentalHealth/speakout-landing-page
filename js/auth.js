import { auth, db } from "./firebase-config.js";

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

function normalizeRole(role) {
  const r = (role || "").toLowerCase().trim().replace(/\s+/g, "_");
  if (r === "school") return "school_admin";
  return r;
}

function val(id) {
  return document.getElementById(id)?.value?.trim() || "";
}

function msg(id, text, type = "ok") {
  const e = document.getElementById(id);
  if (!e) {
    alert(text);
    return;
  }

  e.textContent = text;
  e.className = "message " + type;
  e.style.display = "block";
}

function dashboardForRole(role) {
  const routes = {
    admin: "../dashboards/admin/index.html",
    super_admin: "../dashboards/admin/index.html",

    school_admin: "../dashboards/school/index.html",

    teacher: "../dashboards/teacher/index.html",

    parent: "../dashboards/parent/index.html",

    student: "../dashboards/student/index.html",

    ambassador: "../dashboards/student/index.html",

    contributor: "../dashboards/contributor/index.html"
  };

  return routes[normalizeRole(role)] || "../auth/auth.html";
}

function generateStudentId() {
  return "STU-" + Date.now().toString().slice(-6);
}

async function findSchoolByCode(code, role) {
  if (!code) {
    return {
      schoolId: "",
      schoolName: "",
      schoolCode: ""
    };
  }

  const q = query(
    collection(db, "schools"),
    where("schoolCode", "==", code)
  );

  const snap = await getDocs(q);

  if (snap.empty) {
    if (["student", "parent", "teacher", "school_admin"].includes(role)) {
      throw new Error("School code not found. Please confirm the code from your school.");
    }

    return {
      schoolId: "",
      schoolName: "",
      schoolCode: code
    };
  }

  const schoolDoc = snap.docs[0];
  const school = schoolDoc.data();

  return {
    schoolId: schoolDoc.id,
    schoolName: school.schoolName || school.name || "",
    schoolCode: school.schoolCode || code
  };
}

async function routeUser(user) {
  const snap = await getDoc(doc(db, "users", user.uid));

  if (!snap.exists()) {
    msg("loginMsg", "Your login exists, but your profile is missing. Contact admin.", "bad");
    await signOut(auth);
    return;
  }

  const profile = snap.data();
  const role = normalizeRole(profile.role);
  const status = (profile.status || "").toLowerCase().trim();

  if (!role) {
    msg("loginMsg", "Your role is missing. Contact administrator.", "bad");
    await signOut(auth);
    return;
  }

  if (status !== "approved") {
    msg("loginMsg", "Your account is awaiting approval. Please contact SpeakOut or your school administrator if urgent.", "warn");
    await signOut(auth);
    return;
  }

  window.location.href = dashboardForRole(role);
}

const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.onsubmit = async (e) => {
    e.preventDefault();

    try {
      const result = await signInWithEmailAndPassword(
        auth,
        val("loginEmail"),
        val("loginPassword")
      );

      msg("loginMsg", "Login successful. Checking approval...", "ok");
      await routeUser(result.user);

    } catch (err) {
      console.error(err);
      msg("loginMsg", err.message || "Login failed.", "bad");
    }
  };
}

const forgotPasswordLink = document.getElementById("forgotPasswordLink");

if (forgotPasswordLink) {
  forgotPasswordLink.onclick = async (e) => {
    e.preventDefault();

    const email = val("loginEmail");

    if (!email) {
      msg("loginMsg", "Enter your email first, then click Forgot Password.", "warn");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      msg("loginMsg", "Password reset link sent. Please check your email.", "ok");
    } catch (err) {
      console.error(err);
      msg("loginMsg", err.message || "Could not send password reset email.", "bad");
    }
  };
}

const registerForm = document.getElementById("registerForm");

if (registerForm) {
  registerForm.onsubmit = async (e) => {
    e.preventDefault();

    if (val("password") !== val("confirmPassword")) {
      msg("regMsg", "Passwords do not match.", "bad");
      return;
    }

    if (val("password").length < 6) {
      msg("regMsg", "Password must be at least 6 characters.", "bad");
      return;
    }

    try {
      const cleanEmail = val("email");
      const cleanRole = normalizeRole(val("role"));
      const fullName = `${val("firstName")} ${val("lastName")}`.trim();

      const schoolInfo = await findSchoolByCode(val("schoolCode"), cleanRole);

      const result = await createUserWithEmailAndPassword(
        auth,
        cleanEmail,
        val("password")
      );

      await updateProfile(result.user, {
        displayName: fullName
      });

      const userData = {
        uid: result.user.uid,

        firstName: val("firstName"),
        lastName: val("lastName"),
        fullName,

        email: cleanEmail,
        phone: val("phone"),

        role: cleanRole,
        status: "pending",
        approved: false,

        schoolId: schoolInfo.schoolId,
        schoolCode: schoolInfo.schoolCode,
        schoolName: schoolInfo.schoolName || val("schoolName"),

        location: val("location"),
        reason: val("reason"),
        contentType: val("contentType"),

        bio: "",
        country: "",
        state: "",
        city: "",
        occupation: "",
        photoData: "",

        profileCompleted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      if (cleanRole === "student") {
        userData.studentId = generateStudentId();
      }

      await setDoc(doc(db, "users", result.user.uid), userData);

      await signOut(auth);

      msg(
        "regMsg",
        schoolInfo.schoolId
          ? "Application submitted successfully under " + userData.schoolName + ". Please wait for school approval."
          : "Application submitted successfully. You will receive access once approved by SpeakOut or the relevant school administrator.",
        "ok"
      );

      registerForm.reset();

    } catch (err) {
      console.error(err);

      let cleanMessage = err.message || "Registration failed.";

      if (cleanMessage.includes("email-already-in-use")) {
        cleanMessage = "This email already has an account. Please login instead.";
      }

      msg("regMsg", cleanMessage, "bad");
    }
  };
}

const pageType = document.body?.dataset?.authPage || "";

if (pageType === "auth" || pageType === "login") {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      await routeUser(user);
    }
  });
}
