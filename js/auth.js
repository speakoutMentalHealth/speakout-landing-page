// js/auth.js

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


/* =========================================================
   PROJECT ROUTES
========================================================= */

/*
  auth.js lives inside /js/.

  Using import.meta.url lets us resolve pages from the project root
  correctly even when the site is hosted on GitHub Pages inside a
  repository path.
*/

function projectUrl(path) {
  return new URL(
    `../${String(path || "").replace(/^\/+/, "")}`,
    import.meta.url
  ).href;
}


const ROLE_DASHBOARDS = {
  student: "student-dashboard.html",
  parent: "parent-dashboard.html",
  teacher: "teacher-dashboard.html",

  school: "school-dashboard.html",
  school_admin: "school-dashboard.html",

  admin: "admin-dashboard.html",
  super_admin: "admin-dashboard.html",

  ambassador: "ambassador.html",
  contributor: "contributor-dashboard.html",

  volunteer: "student-dashboard.html"
};


/* =========================================================
   BASIC HELPERS
========================================================= */

function clean(value) {
  return String(value || "").trim();
}


function normalizeRole(role) {
  return clean(role)
    .toLowerCase()
    .replace(/\s+/g, "_");
}


function dashboardForRole(role) {
  const route =
    ROLE_DASHBOARDS[
      normalizeRole(role)
    ];

  return route
    ? projectUrl(route)
    : projectUrl("auth.html");
}


function authPageUrl(query = "") {
  const url =
    projectUrl("auth.html");

  return query
    ? `${url}${query}`
    : url;
}


function getInput(...selectors) {
  for(const selector of selectors) {
    const element =
      document.querySelector(selector);

    if(element) {
      return element;
    }
  }

  return null;
}


function getValue(...selectors) {
  return clean(
    getInput(...selectors)?.value
  );
}


function showAuthMessage(
  message,
  type = "info"
) {
  const target =
    document.querySelector("[data-auth-message]") ||
    document.querySelector("#authMessage") ||
    document.querySelector("#loginMsg") ||
    document.querySelector("#regMsg") ||
    document.querySelector(".auth-message");

  if(target) {
    target.textContent =
      message;

    target.dataset.type =
      type;

    target.className =
      `message ${
        type === "success"
          ? "ok"
          : type === "warning"
            ? "warn"
            : type === "error"
              ? "bad"
              : ""
      }`;

    target.style.display =
      "block";

    return;
  }

  console.log(
    `[SpeakOut Auth] ${message}`
  );
}


function showLoginMessage(
  message,
  type = "info"
) {
  const target =
    document.querySelector(
      "[data-login-message]"
    ) ||
    document.getElementById(
      "loginMsg"
    );

  if(!target) {
    showAuthMessage(
      message,
      type
    );

    return;
  }

  target.textContent =
    message;

  target.className =
    `message ${
      type === "success"
        ? "ok"
        : type === "warning"
          ? "warn"
          : type === "error"
            ? "bad"
            : ""
    }`;
}


function showRegisterMessage(
  message,
  type = "info"
) {
  const target =
    document.querySelector(
      "[data-register-message]"
    ) ||
    document.getElementById(
      "regMsg"
    );

  if(!target) {
    showAuthMessage(
      message,
      type
    );

    return;
  }

  target.textContent =
    message;

  target.className =
    `message ${
      type === "success"
        ? "ok"
        : type === "warning"
          ? "warn"
          : type === "error"
            ? "bad"
            : ""
    }`;
}


/* =========================================================
   PROFILE
========================================================= */

async function getUserProfile(uid) {
  const snap =
    await getDoc(
      doc(
        db,
        "users",
        uid
      )
    );

  if(!snap.exists()) {
    return null;
  }

  return {
    uid,
    ...snap.data()
  };
}


/* =========================================================
   ROLE REDIRECTION
========================================================= */

async function redirectByUserRole(user) {

  const profile =
    await getUserProfile(
      user.uid
    );


  if(!profile) {

    showLoginMessage(
      "Your account exists, but your SpeakOut profile was not found. Please contact SpeakOut admin.",
      "error"
    );

    await signOut(auth);

    return;
  }


  const role =
    normalizeRole(
      profile.role
    );


  const status =
    normalizeRole(
      profile.status
    );


  const approved =
    profile.approved === true ||
    status === "approved";


  if(!approved) {

    showLoginMessage(
      "Your account is pending approval. Please contact SpeakOut admin if this is urgent.",
      "warning"
    );


    /*
      Pending users should not retain an authenticated portal session.
    */

    sessionStorage.setItem(
      "speakoutManualLogout",
      "true"
    );


    await signOut(auth);

    return;
  }


  const destination =
    dashboardForRole(
      role
    );


  window.location.replace(
    destination
  );
}


/* =========================================================
   LOGIN
========================================================= */

async function handleLogin(event) {

  event?.preventDefault();


  const email =
    getValue(
      "[data-login-email]",
      "#loginEmail",
      "input[name='loginEmail']"
    );


  const password =
    getValue(
      "[data-login-password]",
      "#loginPassword",
      "input[name='loginPassword']"
    );


  if(
    !email ||
    !password
  ) {

    showLoginMessage(
      "Enter your email and password.",
      "error"
    );

    return;
  }


  try {

    /*
      A new manual login overrides any previous logout marker.
    */

    sessionStorage.removeItem(
      "speakoutManualLogout"
    );


    showLoginMessage(
      "Signing you in...",
      "info"
    );


    const credential =
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );


    await redirectByUserRole(
      credential.user
    );


  } catch(error) {

    console.error(
      "Login error:",
      error
    );


    let message =
      "Login failed. Please check your email and password.";


    if(
      error?.code ===
      "auth/invalid-credential"
    ) {
      message =
        "Incorrect email or password.";
    }


    if(
      error?.code ===
      "auth/too-many-requests"
    ) {
      message =
        "Too many login attempts. Please wait and try again.";
    }


    showLoginMessage(
      message,
      "error"
    );

  }

}


/* =========================================================
   REGISTRATION
========================================================= */

async function handleRegister(event) {

  event?.preventDefault();


  const firstName =
    getValue(
      "#firstName",
      "[name='firstName']"
    );


  const lastName =
    getValue(
      "#lastName",
      "[name='lastName']"
    );


  const fullName =
    `${firstName} ${lastName}`
      .trim();


  const email =
    getValue(
      "[data-register-email]",
      "#registerEmail",
      "#email",
      "input[name='registerEmail']"
    );


  const phone =
    getValue(
      "#phone",
      "input[name='phone']"
    );


  const password =
    getValue(
      "[data-register-password]",
      "#registerPassword",
      "#password"
    );


  const confirmPassword =
    getValue(
      "#confirmPassword"
    );


  const role =
    normalizeRole(
      getValue(
        "[data-register-role]",
        "#role",
        "select[name='role']"
      ) || "student"
    );


  const schoolCode =
    getValue(
      "#schoolCode",
      "input[name='schoolCode']"
    );


  const schoolName =
    getValue(
      "#schoolName",
      "input[name='schoolName']"
    );


  const location =
    getValue(
      "#location",
      "input[name='location']"
    );


  const contentType =
    getValue(
      "#contentType"
    );


  const reason =
    getValue(
      "#reason",
      "textarea[name='reason']"
    );


  const terms =
    document.getElementById(
      "terms"
    );


  if(
    !firstName ||
    !lastName ||
    !email ||
    !password
  ) {

    showRegisterMessage(
      "Enter your first name, last name, email and password.",
      "error"
    );

    return;
  }


  if(password.length < 6) {

    showRegisterMessage(
      "Your password must contain at least 6 characters.",
      "error"
    );

    return;
  }


  if(
    confirmPassword &&
    password !== confirmPassword
  ) {

    showRegisterMessage(
      "Your passwords do not match.",
      "error"
    );

    return;
  }


  if(
    terms &&
    !terms.checked
  ) {

    showRegisterMessage(
      "Please confirm the terms before submitting your application.",
      "error"
    );

    return;
  }


  try {

    showRegisterMessage(
      "Creating your account...",
      "info"
    );


    const credential =
      await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );


    const userId =
      credential.user.uid;


    const profileData = {
      uid:
        userId,

      firstName,
      lastName,
      fullName,

      email,

      phone,

      role,

      schoolCode,
      schoolName,

      location,

      reason,

      status:
        "pending",

      approved:
        false,

      profileCompleted:
        false,

      createdAt:
        serverTimestamp(),

      updatedAt:
        serverTimestamp()
    };


    /*
      Contributor-specific field remains optional.
    */

    if(contentType) {
      profileData.contentType =
        contentType;
    }


    await setDoc(
      doc(
        db,
        "users",
        userId
      ),
      profileData,
      {
        merge: true
      }
    );


    /*
      Creating a Firebase account automatically logs that new user in.

      Since SpeakOut requires approval first, sign them back out
      immediately and mark this as an intentional logout.
    */

    sessionStorage.setItem(
      "speakoutManualLogout",
      "true"
    );


    await signOut(auth);


    showRegisterMessage(
      "Account created successfully. Your application is now pending approval.",
      "success"
    );


    const registerForm =
      document.getElementById(
        "registerForm"
      );


    registerForm?.reset();


  } catch(error) {

    console.error(
      "Registration error:",
      error
    );


    let message =
      error.message ||
      "Registration failed.";


    if(
      error?.code ===
      "auth/email-already-in-use"
    ) {

      message =
        "An account already exists with this email address.";

    }


    if(
      error?.code ===
      "auth/invalid-email"
    ) {

      message =
        "Enter a valid email address.";

    }


    if(
      error?.code ===
      "auth/weak-password"
    ) {

      message =
        "Please choose a stronger password.";

    }


    showRegisterMessage(
      message,
      "error"
    );

  }

}


/* =========================================================
   LOGOUT
========================================================= */

async function handleLogout(event) {

  event?.preventDefault();


  try {

    /*
      This flag is important.

      When auth.html loads immediately after logout,
      onAuthStateChanged must NOT send the user back
      to a dashboard.
    */

    sessionStorage.setItem(
      "speakoutManualLogout",
      "true"
    );


    /*
      Remove legacy/local portal values.
    */

    localStorage.removeItem(
      "speakoutRole"
    );

    localStorage.removeItem(
      "speakoutUser"
    );

    localStorage.removeItem(
      "speakoutSchoolCode"
    );

    localStorage.removeItem(
      "speakoutSchoolName"
    );


    /*
      End the Firebase authentication session.
    */

    await signOut(auth);


    /*
      Redirect to the ROOT auth.html.

      ?loggedOut=1 prevents automatic routing if the
      auth listener fires while navigation is completing.
    */

    window.location.replace(
      authPageUrl(
        "?loggedOut=1"
      )
    );


  } catch(error) {

    console.error(
      "Logout error:",
      error
    );


    showAuthMessage(
      "Logout failed. Please try again.",
      "error"
    );

  }

}


/* =========================================================
   PASSWORD RESET LINK PLACEHOLDER
========================================================= */

/*
  Your current auth page has a Forgot Password link.

  Password-reset functionality can be connected separately.
*/

const forgotPasswordLink =
  document.getElementById(
    "forgotPasswordLink"
  );


if(forgotPasswordLink) {

  forgotPasswordLink.addEventListener(
    "click",
    event => {

      event.preventDefault();


      showLoginMessage(
        "Password reset will be available here.",
        "info"
      );

    }
  );

}


/* =========================================================
   FORM LISTENERS
========================================================= */

document
  .querySelectorAll(
    "[data-login-form], #loginForm, form.login-form"
  )
  .forEach(form => {

    form.addEventListener(
      "submit",
      handleLogin
    );

  });


document
  .querySelectorAll(
    "[data-login-button], #loginButton"
  )
  .forEach(button => {

    button.addEventListener(
      "click",
      handleLogin
    );

  });


document
  .querySelectorAll(
    "[data-register-form], #registerForm, form.register-form"
  )
  .forEach(form => {

    form.addEventListener(
      "submit",
      handleRegister
    );

  });


document
  .querySelectorAll(
    "[data-register-button], #registerButton"
  )
  .forEach(button => {

    button.addEventListener(
      "click",
      handleRegister
    );

  });


document
  .querySelectorAll(
    "[data-logout], #logoutButton, #logoutBtn, .logout"
  )
  .forEach(button => {

    button.addEventListener(
      "click",
      handleLogout
    );

  });


document
  .querySelectorAll(
    "[data-demo-login]"
  )
  .forEach(button => {

    button.addEventListener(
      "click",
      handleLogin
    );

  });


document
  .querySelectorAll(
    "[data-role]"
  )
  .forEach(card => {

    card.addEventListener(
      "click",
      () => {

        localStorage.setItem(
          "speakoutRole",
          card.dataset.role
        );

      }
    );

  });


/* =========================================================
   AUTH PAGE SESSION HANDLING
========================================================= */

const pageType =
  document.body?.dataset?.authPage ||
  "";


if(
  pageType === "login" ||
  pageType === "auth"
) {

  onAuthStateChanged(
    auth,
    async user => {

      const params =
        new URLSearchParams(
          window.location.search
        );


      const urlLoggedOut =
        params.get(
          "loggedOut"
        ) === "1";


      const manualLogout =
        sessionStorage.getItem(
          "speakoutManualLogout"
        ) === "true";


      /*
        If the user intentionally logged out,
        remain on the login page.
      */

      if(
        urlLoggedOut ||
        manualLogout
      ) {

        sessionStorage.removeItem(
          "speakoutManualLogout"
        );


        if(urlLoggedOut) {

          showLoginMessage(
            "You have been logged out successfully.",
            "success"
          );

        }


        return;
      }


      /*
        If someone visits auth.html while still genuinely
        logged in, route them to their approved dashboard.
      */

      if(user) {

        await redirectByUserRole(
          user
        );

      }

    }
  );

}


/* =========================================================
   PUBLIC LOGOUT FUNCTION
========================================================= */

/*
  Other scripts can optionally call:

      window.speakoutLogout();

  This gives the project one consistent logout method.
*/

window.speakoutLogout =
  async function() {

    await handleLogout();

  };
