// Unified SpeakOut authentication and institution onboarding.

import { auth, db } from "./firebase-config.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

import {
  doc,
  getDoc,
  writeBatch,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const ROLE_DASHBOARDS = {
  student: "student-dashboard.html",
  parent: "parent-dashboard.html",
  teacher: "teacher-dashboard.html",
  school: "school-dashboard.html",
  school_admin: "school-dashboard.html",
  admin: "admin-dashboard.html",
  super_admin: "admin-dashboard.html",
  ambassador: "ambassador-dashboard.html",
  contributor: "contributor.html",
  volunteer: "student-dashboard.html"
};

let registrationInProgress = false;
let verifiedSchool = null;

function projectUrl(path) {
  return new URL(
    `../${String(path || "").replace(/^\/+/, "")}`,
    import.meta.url
  ).href;
}

function clean(value) {
  return String(value || "").trim();
}

function normalizeRole(role) {
  return clean(role).toLowerCase().replace(/\s+/g, "_");
}

function normalizeSchoolCode(value) {
  return clean(value).toUpperCase().replace(/\s+/g, "");
}

function normalizeStudentNumber(value) {
  return clean(value).toUpperCase().replace(/\s+/g, "");
}

function dashboardForRole(role) {
  const route = ROLE_DASHBOARDS[normalizeRole(role)];
  return route ? projectUrl(route) : projectUrl("auth.html");
}

function authPageUrl(query = "") {
  const url = projectUrl("auth.html");
  return query ? `${url}${query}` : url;
}

function getInput(...selectors) {
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) return element;
  }
  return null;
}

function getValue(...selectors) {
  return clean(getInput(...selectors)?.value);
}

function setMessage(target, message, type = "info") {
  if (!target) return;
  target.textContent = message;
  target.className = `message ${type === "success" ? "ok" : type === "warning" ? "warn" : type === "error" ? "bad" : ""}`;
  target.style.display = "block";
}

function showLoginMessage(message, type = "info") {
  setMessage(document.querySelector("[data-login-message]") || document.getElementById("loginMsg"), message, type);
}

function showRegisterMessage(message, type = "info") {
  setMessage(document.querySelector("[data-register-message]") || document.getElementById("regMsg"), message, type);
}

function showSchoolMessage(message, type = "info") {
  setMessage(document.getElementById("schoolRegMsg"), message, type);
}

function showSchoolMatch(message, type = "") {
  const target = document.getElementById("schoolMatch");
  if (!target) return;
  target.textContent = message;
  target.className = `school-match ${type}`;
}

async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? { uid, ...snap.data() } : null;
}

async function redirectByUserRole(user) {
  const profile = await getUserProfile(user.uid);
  if (!profile) {
    showLoginMessage("Your account exists, but your SpeakOut profile was not found. Please contact SpeakOut admin.", "error");
    await signOut(auth);
    return;
  }

  const role = normalizeRole(profile.role);
  const status = normalizeRole(profile.status);
  const approved = profile.approved === true || status === "approved";

  if (!approved) {
    const schoolPending = status === "pending_school_approval";
    showLoginMessage(
      schoolPending
        ? "Your account is awaiting verification by your school administrator."
        : "Your account is pending approval. Please contact SpeakOut admin if this is urgent.",
      "warning"
    );
    sessionStorage.setItem("speakoutManualLogout", "true");
    await signOut(auth);
    return;
  }

  window.location.replace(dashboardForRole(role));
}

function activateAccessMode(mode) {
  const allowed = ["login", "join", "school"];
  const selected = allowed.includes(mode) ? mode : "login";

  document.querySelectorAll("[data-access-mode]").forEach(button => {
    const active = button.dataset.accessMode === selected;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  });

  document.querySelectorAll("[data-access-panel]").forEach(panel => {
    panel.classList.toggle("is-active", panel.dataset.accessPanel === selected);
  });

  const url = new URL(window.location.href);
  url.searchParams.set("mode", selected);
  history.replaceState({}, "", `${url.pathname}${url.search}#access`);
}

function setupAccessTabs() {
  document.querySelectorAll("[data-access-mode]").forEach(button => {
    button.addEventListener("click", () => activateAccessMode(button.dataset.accessMode));
  });

  const params = new URLSearchParams(window.location.search);
  if (params.has("school")) {
    activateAccessMode("join");
  } else {
    activateAccessMode(params.get("mode") || "login");
  }
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

async function lookupSchoolByCode(rawCode, { quiet = false } = {}) {
  const code = normalizeSchoolCode(rawCode);

  if (!code) {
    verifiedSchool = null;
    if (!quiet) showSchoolMatch("Enter the school code from your institution or flyer.", "warn");
    return null;
  }

  try {
    if (!quiet) showSchoolMatch("Checking school code...", "warn");

    const snap = await getDoc(doc(db, "schoolDirectory", code));

    if (!snap.exists()) {
      verifiedSchool = null;
      showSchoolMatch("School code not found. Check the code or ask your school administrator.", "bad");
      return null;
    }

    const school = { directoryCode: code, ...snap.data() };
    if (String(school.status || "").toLowerCase() !== "active") {
      verifiedSchool = null;
      showSchoolMatch("This school code is not currently active.", "bad");
      return null;
    }

    verifiedSchool = school;

    const codeInput = document.getElementById("schoolCode");
    if (codeInput) codeInput.value = code;

    showSchoolMatch(`✓ ${school.schoolName || "Verified partner school"}`, "ok");
    updateJoinConditionalFields();

    return school;
  } catch (error) {
    console.error("School lookup failed:", error);
    verifiedSchool = null;
    showSchoolMatch("We could not verify that school code right now. Please try again.", "bad");
    return null;
  }
}

function updateJoinConditionalFields() {
  const role = normalizeRole(getValue("#role"));
  const hasSchoolCode = Boolean(normalizeSchoolCode(getValue("#schoolCode")));
  const studentFields = document.getElementById("studentVerificationFields");
  const staffFields = document.getElementById("staffVerificationFields");

  studentFields?.classList.toggle("is-visible", role === "student" && hasSchoolCode);
  staffFields?.classList.toggle("is-visible", role === "teacher" && hasSchoolCode);
}

function setupJoinFormUX() {
  const role = document.getElementById("role");
  const schoolCode = document.getElementById("schoolCode");
  const verifyButton = document.getElementById("verifySchoolCode");

  role?.addEventListener("change", updateJoinConditionalFields);

  schoolCode?.addEventListener("input", () => {
    const currentCode = normalizeSchoolCode(schoolCode.value);
    if (!verifiedSchool || verifiedSchool.directoryCode !== currentCode) {
      verifiedSchool = null;
      if (currentCode) showSchoolMatch("Verify this school code before creating your account.", "warn");
      else showSchoolMatch("", "");
    }
    updateJoinConditionalFields();
  });

  verifyButton?.addEventListener("click", () => lookupSchoolByCode(schoolCode?.value));

  const params = new URLSearchParams(window.location.search);
  const codeFromUrl = normalizeSchoolCode(params.get("school"));
  const roleFromUrl = normalizeRole(params.get("join"));

  if (roleFromUrl && role && [...role.options].some(option => option.value === roleFromUrl)) {
    role.value = roleFromUrl;
  }

  if (codeFromUrl && schoolCode) {
    schoolCode.value = codeFromUrl;
    lookupSchoolByCode(codeFromUrl);
  }

  updateJoinConditionalFields();
}

async function handleLogin(event) {
  event?.preventDefault();

  const email = getValue("[data-login-email]", "#loginEmail");
  const password = getValue("[data-login-password]", "#loginPassword");

  if (!email || !password) {
    showLoginMessage("Enter your email and password.", "error");
    return;
  }

  try {
    sessionStorage.removeItem("speakoutManualLogout");
    showLoginMessage("Signing you in...", "info");
    const credential = await signInWithEmailAndPassword(auth, email, password);
    await redirectByUserRole(credential.user);
  } catch (error) {
    console.error("Login error:", error);
    let message = "Login failed. Please check your email and password.";
    if (error?.code === "auth/invalid-credential") message = "Incorrect email or password.";
    if (error?.code === "auth/too-many-requests") message = "Too many login attempts. Please wait and try again.";
    showLoginMessage(message, "error");
  }
}

async function handleRegister(event) {
  event?.preventDefault();

  const firstName = getValue("#firstName");
  const lastName = getValue("#lastName");
  const fullName = `${firstName} ${lastName}`.trim();
  const email = getValue("[data-register-email]", "#email").toLowerCase();
  const phone = getValue("#phone");
  const password = getValue("[data-register-password]", "#password");
  const confirmPassword = getValue("#confirmPassword");
  const role = normalizeRole(getValue("[data-register-role]", "#role") || "student");
  const rawSchoolCode = getValue("#schoolCode");
  const schoolCode = normalizeSchoolCode(rawSchoolCode);
  const location = getValue("#location");
  const contentType = getValue("#contentType");
  const reason = getValue("#reason");
  const terms = document.getElementById("terms");

  if (!firstName || !lastName || !email || !password) {
    showRegisterMessage("Enter your first name, last name, email and password.", "error");
    return;
  }

  if (role === "school_admin" || role === "school") {
    showRegisterMessage("Schools must use the Register a School tab so the institution can be verified first.", "error");
    activateAccessMode("school");
    return;
  }

  if (password.length < 6) {
    showRegisterMessage("Your password must contain at least 6 characters.", "error");
    return;
  }

  if (confirmPassword && password !== confirmPassword) {
    showRegisterMessage("Your passwords do not match.", "error");
    return;
  }

  if (terms && !terms.checked) {
    showRegisterMessage("Please confirm the terms before submitting your application.", "error");
    return;
  }

  let school = null;
  if (schoolCode) {
    school = verifiedSchool?.directoryCode === schoolCode
      ? verifiedSchool
      : await lookupSchoolByCode(schoolCode);

    if (!school) {
      showRegisterMessage("Verify a valid partner-school code before continuing.", "error");
      return;
    }
  }

  const studentRegNumber = getValue("#studentRegNumber");
  const studentDepartment = getValue("#studentDepartment");
  const studentLevel = getValue("#studentLevel");
  const staffId = getValue("#staffId");
  const staffDepartment = getValue("#staffDepartment");

  if (school && role === "student" && !studentRegNumber) {
    showRegisterMessage("Enter your official registration or matric number. Your school will use it to verify you.", "error");
    document.getElementById("studentRegNumber")?.focus();
    return;
  }

  try {
    registrationInProgress = true;
    showRegisterMessage("Creating your account...", "info");

    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName: fullName });

    const userId = credential.user.uid;
    const status = school ? "pending_school_approval" : "pending";
    const profileData = {
      uid: userId,
      firstName,
      lastName,
      fullName,
      email,
      phone,
      role,
      location,
      reason,
      status,
      approved: false,
      profileCompleted: false,
      accountSource: school ? "school-code-signup" : "public-signup",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    if (contentType) profileData.contentType = contentType;

    if (school) {
      profileData.schoolId = school.schoolId;
      profileData.schoolCode = school.schoolCode || school.directoryCode;
      profileData.schoolName = school.schoolName || "";
      profileData.schoolVerificationStatus = "pending";

      if (role === "student") {
        const normalizedReg = normalizeStudentNumber(studentRegNumber);
        const registrationHash = await sha256Hex(`${school.schoolId}|${normalizedReg}`);
        const claimId = `${school.schoolId}__${registrationHash}`;

        profileData.studentRegNumber = clean(studentRegNumber);
        profileData.admissionNumber = clean(studentRegNumber);
        profileData.department = studentDepartment;
        profileData.classLevel = studentLevel;
        profileData.studentClaimId = claimId;

        const batch = writeBatch(db);
        batch.set(doc(db, "users", userId), profileData);
        batch.set(doc(db, "studentSchoolClaims", claimId), {
          uid: userId,
          schoolId: school.schoolId,
          schoolCode: school.schoolCode || school.directoryCode,
          registrationHash,
          status: "pending",
          createdAt: serverTimestamp()
        });
        await batch.commit();
      } else {
        if (role === "teacher") {
          profileData.staffId = staffId;
          profileData.department = staffDepartment;
        }
        const batch = writeBatch(db);
        batch.set(doc(db, "users", userId), profileData);
        await batch.commit();
      }
    } else {
      const batch = writeBatch(db);
      batch.set(doc(db, "users", userId), profileData);
      await batch.commit();
    }

    sessionStorage.setItem("speakoutManualLogout", "true");
    await signOut(auth);

    showRegisterMessage(
      school
        ? "Account created. Your school will verify your details before school-linked access is activated."
        : "Account created successfully. Your application is now pending approval.",
      "success"
    );

    document.getElementById("registerForm")?.reset();
    verifiedSchool = null;
    showSchoolMatch("", "");
    updateJoinConditionalFields();
  } catch (error) {
    console.error("Registration error:", error);

    let message = error?.message || "Registration failed.";
    if (error?.code === "auth/email-already-in-use") message = "An account already exists with this email address.";
    if (error?.code === "auth/invalid-email") message = "Enter a valid email address.";
    if (error?.code === "auth/weak-password") message = "Please choose a stronger password.";
    if (error?.code === "permission-denied") message = "We could not securely link this account. Verify the school code and try again.";
    if (/already exists|ALREADY_EXISTS/i.test(message)) {
      message = "That student registration number is already linked to an account for this school. Contact your school administrator if this is an error.";
    }

    showRegisterMessage(message, "error");
  } finally {
    registrationInProgress = false;
  }
}

async function handleSchoolRegister(event) {
  event?.preventDefault();

  const schoolName = getValue("#schoolRegName");
  const schoolType = getValue("#schoolRegType");
  const address = getValue("#schoolRegAddress");
  const city = getValue("#schoolRegCity");
  const state = getValue("#schoolRegState");
  const country = getValue("#schoolRegCountry");
  const schoolWebsite = getValue("#schoolRegWebsite");
  const estimatedStudents = Number(getValue("#schoolRegStudents") || 0);
  const interestArea = getValue("#schoolRegInterest");
  const needs = getValue("#schoolRegNeeds");

  const firstName = getValue("#schoolAdminFirstName");
  const lastName = getValue("#schoolAdminLastName");
  const fullName = `${firstName} ${lastName}`.trim();
  const position = getValue("#schoolAdminPosition");
  const phone = getValue("#schoolAdminPhone");
  const email = getValue("#schoolAdminEmail").toLowerCase();
  const password = getValue("#schoolAdminPassword");
  const confirmPassword = getValue("#schoolAdminConfirmPassword");
  const terms = document.getElementById("schoolTerms");
  const button = document.getElementById("schoolRegisterButton");

  if (!schoolName || !schoolType || !address || !city || !state || !country || !firstName || !lastName || !position || !phone || !email || !password) {
    showSchoolMessage("Complete the required institution and primary administrator fields.", "error");
    return;
  }

  if (password.length < 6) {
    showSchoolMessage("The administrator password must contain at least 6 characters.", "error");
    return;
  }

  if (password !== confirmPassword) {
    showSchoolMessage("The administrator passwords do not match.", "error");
    return;
  }

  if (!terms?.checked) {
    showSchoolMessage("Confirm that you are authorized to submit this institution's details.", "error");
    return;
  }

  try {
    registrationInProgress = true;
    if (button) {
      button.disabled = true;
      button.textContent = "Submitting Registration...";
    }
    showSchoolMessage("Creating the pending institution record...", "info");

    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName: fullName });

    const userId = credential.user.uid;
    const now = serverTimestamp();

    const userProfile = {
      uid: userId,
      firstName,
      lastName,
      fullName,
      email,
      phone,
      position,
      role: "school_admin",
      status: "pending",
      approved: false,
      schoolId: userId,
      schoolName,
      schoolCode: "",
      schoolType,
      location: [city, state, country].filter(Boolean).join(", "),
      profileCompleted: false,
      accountSource: "school-registration",
      createdAt: now,
      updatedAt: now
    };

    const schoolRecord = {
      schoolName,
      schoolType,
      address,
      city,
      state,
      country,
      schoolWebsite,
      estimatedStudents: Number.isFinite(estimatedStudents) ? estimatedStudents : 0,
      interestArea,
      needs,
      adminUid: userId,
      adminName: fullName,
      adminEmail: email,
      adminPhone: phone,
      adminPosition: position,
      schoolCode: "",
      status: "pending",
      activationStatus: "pending",
      partnershipStatus: "application",
      createdAt: now,
      updatedAt: now
    };

    const batch = writeBatch(db);
    batch.set(doc(db, "users", userId), userProfile);
    batch.set(doc(db, "schools", userId), schoolRecord);
    await batch.commit();

    sessionStorage.setItem("speakoutManualLogout", "true");
    await signOut(auth);

    showSchoolMessage("School registration received. SpeakOut will verify the institution and activate the primary administrator after approval.", "success");
    document.getElementById("schoolRegisterForm")?.reset();
    const countryInput = document.getElementById("schoolRegCountry");
    if (countryInput) countryInput.value = "Nigeria";
  } catch (error) {
    console.error("School registration error:", error);
    let message = error?.message || "School registration failed.";
    if (error?.code === "auth/email-already-in-use") message = "An account already exists with this administrator email. Sign in or use the existing account.";
    if (error?.code === "auth/invalid-email") message = "Enter a valid administrator email address.";
    if (error?.code === "permission-denied") message = "The institution registration could not be saved securely. Please try again.";
    showSchoolMessage(message, "error");
  } finally {
    registrationInProgress = false;
    if (button) {
      button.disabled = false;
      button.textContent = "Submit School Registration";
    }
  }
}

async function handleLogout(event) {
  event?.preventDefault();
  try {
    sessionStorage.setItem("speakoutManualLogout", "true");
    ["speakoutRole", "speakoutUser", "speakoutSchoolCode", "speakoutSchoolName"].forEach(key => localStorage.removeItem(key));
    await signOut(auth);
    window.location.replace(authPageUrl("?loggedOut=1"));
  } catch (error) {
    console.error("Logout error:", error);
  }
}

function setupPasswordReset() {
  const link = document.getElementById("forgotPasswordLink");
  if (!link) return;

  link.addEventListener("click", async event => {
    event.preventDefault();
    const email = getValue("[data-login-email]", "#loginEmail");
    if (!email) {
      showLoginMessage("Enter your email address above, then select Forgot password again.", "warning");
      getInput("[data-login-email]", "#loginEmail")?.focus();
      return;
    }

    link.setAttribute("aria-busy", "true");
    showLoginMessage("Sending password reset instructions...", "info");
    try {
      await sendPasswordResetEmail(auth, email);
      showLoginMessage("Password reset instructions have been sent to your email.", "success");
    } catch (error) {
      console.error("Password reset error:", error);
      showLoginMessage("We could not send the password reset email. Check the address and try again.", "error");
    } finally {
      link.removeAttribute("aria-busy");
    }
  });
}

document.getElementById("loginForm")?.addEventListener("submit", handleLogin);
document.getElementById("registerForm")?.addEventListener("submit", handleRegister);
document.getElementById("schoolRegisterForm")?.addEventListener("submit", handleSchoolRegister);
document.querySelectorAll("[data-logout]").forEach(element => element.addEventListener("click", handleLogout));

setupAccessTabs();
setupJoinFormUX();
setupPasswordReset();

onAuthStateChanged(auth, async user => {
  if (!user || registrationInProgress) return;

  const params = new URLSearchParams(window.location.search);
  if (params.get("loggedOut") === "1" || sessionStorage.getItem("speakoutManualLogout") === "true") return;

  try {
    const profile = await getUserProfile(user.uid);
    if (profile?.approved === true || normalizeRole(profile?.status) === "approved") {
      window.location.replace(dashboardForRole(profile.role));
    }
  } catch (error) {
    console.warn("Automatic role routing skipped:", error);
  }
});
