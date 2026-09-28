// launch-role-guard.js

import { auth, db } from "./firebase-config.js";

import {
  onAuthStateChanged,
  signOut,
  setPersistence,
  browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

import {
  adminApi
} from "./js/platform-api.js";


/* =========================================================
   DASHBOARD ROUTES
========================================================= */

const dashboardRoutes = {
  super_admin: "admin-dashboard.html",
  admin: "admin-dashboard.html",

  school_admin: "school-dashboard.html",
  school: "school-dashboard.html",

  teacher: "teacher-dashboard.html",

  parent: "parent-dashboard.html",

  student: "student-dashboard.html",

  ambassador: "ambassador-dashboard.html",

  contributor: "contributor-dashboard.html",

  volunteer: "student-dashboard.html"
};


/* =========================================================
   BASIC HELPERS
========================================================= */

function normalize(value){
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_");
}


const SUPPORT_KEYS = [
  "speakoutSupportSchoolId",
  "speakoutSupportSchoolCode",
  "speakoutSupportSchoolName"
];


function clearSupportContext(){
  SUPPORT_KEYS.forEach(
    key=>localStorage.removeItem(key)
  );
}


function applySupportProfile(profile){

  if(
    normalize(profile?.role) !== "super_admin"
  ){
    return profile;
  }


  const schoolId =
    String(
      localStorage.getItem(
        "speakoutSupportSchoolId"
      ) || ""
    ).trim();


  if(!schoolId){
    return profile;
  }


  return {
    ...profile,
    actualRole:"super_admin",
    supportMode:true,
    schoolId,
    schoolCode:
      String(
        localStorage.getItem(
          "speakoutSupportSchoolCode"
        ) || ""
      ).trim(),
    schoolName:
      String(
        localStorage.getItem(
          "speakoutSupportSchoolName"
        ) || ""
      ).trim()
  };
}


function renderSupportBanner(profile){

  if(
    !profile?.supportMode ||
    normalize(profile?.actualRole || profile?.role) !== "super_admin"
  ){
    return;
  }


  let banner =
    document.getElementById(
      "speakoutSupportBanner"
    );


  if(!banner){

    banner =
      document.createElement(
        "div"
      );

    banner.id =
      "speakoutSupportBanner";

    banner.style.cssText =
      "position:sticky;top:0;z-index:99999;background:#fff4df;color:#5d3b00;border-bottom:1px solid #f2cc77;padding:10px 16px;display:flex;gap:12px;align-items:center;justify-content:center;flex-wrap:wrap;font:700 14px/1.35 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";

    document.body.prepend(
      banner
    );

  }


  banner.innerHTML =
    `
      <span>
        Super Admin Support Mode — ${String(profile.schoolName || profile.schoolCode || "Selected School")}
      </span>
      <button
        id="speakoutExitSupportBtn"
        type="button"
        style="border:0;border-radius:999px;padding:8px 12px;background:#07152b;color:#fff;font:inherit;cursor:pointer"
      >
        Exit Support Mode
      </button>
    `;


  document.getElementById(
    "speakoutExitSupportBtn"
  )?.addEventListener(
    "click",
    async ()=>{
      await exitSchoolSupportMode();
    }
  );

}


export async function exitSchoolSupportMode(){

  const schoolId =
    String(
      localStorage.getItem(
        "speakoutSupportSchoolId"
      ) || ""
    ).trim();


  if(schoolId){

    try{
      await adminApi.endSchoolSupport(
        schoolId
      );
    }catch(error){
      console.warn(
        "Could not record support-mode exit:",
        error
      );
    }

  }


  clearSupportContext();


  window.location.replace(
    "admin-schools.html"
  );

}


window.speakoutExitSupportMode =
  exitSchoolSupportMode;


export function routeForRole(role){

  return (
    dashboardRoutes[
      normalize(role)
    ] ||
    "auth.html"
  );

}


/* =========================================================
   CURRENT USER PROFILE
========================================================= */

export async function getCurrentProfile(user){

  if(!user){
    return null;
  }


  try{

    const snap =
      await getDoc(
        doc(
          db,
          "users",
          user.uid
        )
      );


    if(!snap.exists()){
      return null;
    }


    return {
      uid:user.uid,
      email:user.email || "",
      ...snap.data()
    };


  }catch(error){

    console.error(
      "Could not load user profile:",
      error
    );


    return null;
  }

}


/* =========================================================
   CENTRAL LOGOUT
========================================================= */


const SHARED_DEVICE_IDLE_MS = 30 * 60 * 1000;
let sharedDeviceIdleStarted = false;
let sharedDeviceIdleTimer = null;

function privateDeviceEnabled(){
  return localStorage.getItem("speakoutDeviceMode") === "private";
}

async function enforceSafeDevicePersistence(){
  if(privateDeviceEnabled()){
    sessionStorage.setItem("speakoutDeviceMode","private");
    return "private";
  }

  sessionStorage.setItem("speakoutDeviceMode","shared");

  try{
    await setPersistence(auth,browserSessionPersistence);
  }catch(error){
    console.warn("Could not enforce session-only persistence:",error);
  }

  return "shared";
}

function startSharedDeviceIdleGuard(){
  if(sharedDeviceIdleStarted || privateDeviceEnabled()){
    return;
  }

  sharedDeviceIdleStarted = true;

  const reset = () => {
    clearTimeout(sharedDeviceIdleTimer);
    sharedDeviceIdleTimer = setTimeout(async () => {
      try{
        window.__speakoutSharedDeviceExpiring = true;
        sessionStorage.setItem("speakoutManualLogout","true");
        sessionStorage.removeItem("speakoutDeviceMode");
        localStorage.removeItem("speakoutDeviceMode");
        await signOut(auth);
      }catch(error){
        console.warn("Shared-device timeout sign out failed:",error);
      }finally{
        window.location.replace("auth.html?sessionExpired=1");
      }
    },SHARED_DEVICE_IDLE_MS);
  };

  ["click","keydown","touchstart","scroll"].forEach(eventName=>{
    window.addEventListener(eventName,reset,{passive:true});
  });

  document.addEventListener("visibilitychange",()=>{
    if(!document.hidden) reset();
  });

  reset();
}


export async function logoutUser(){

  try{

    /*
      Mark this as an intentional logout.

      auth.js checks this flag so auth.html will not
      immediately redirect the user back to a dashboard.
    */

    sessionStorage.setItem(
      "speakoutManualLogout",
      "true"
    );


    /*
      Remove old local SpeakOut session helpers.
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

    localStorage.removeItem(
      "speakoutDeviceMode"
    );

    clearSupportContext();

    sessionStorage.removeItem(
      "speakoutDeviceMode"
    );


    /*
      End Firebase authentication.
    */

    await signOut(auth);


    /*
      Use replace instead of href so the protected
      dashboard is not kept as the immediate history page.
    */

    window.location.replace(
      "auth.html?loggedOut=1"
    );


  }catch(error){

    console.error(
      "Logout failed:",
      error
    );


    alert(
      "Logout failed. Please try again."
    );

  }

}


/*
  Optional global helper.

  Any page can call:

      window.speakoutLogout();
*/

window.speakoutLogout =
  logoutUser;


/* =========================================================
   ROLE PROTECTION
========================================================= */

export function requireRoles(
  allowedRoles,
  callback
){

  const allowed =
    (allowedRoles || [])
      .map(normalize);


  return onAuthStateChanged(
    auth,
    async user => {

      /*
        No Firebase session.
      */

      if(!user){

        if(window.__speakoutSharedDeviceExpiring){
          return;
        }

        window.location.replace(
          "auth.html"
        );

        return;
      }


      /*
        Load the Firestore profile.
      */

      const profile =
        await getCurrentProfile(
          user
        );


      if(!profile){

        /*
          Firebase account exists but there is no
          corresponding users/{uid} profile.
        */

        sessionStorage.setItem(
          "speakoutManualLogout",
          "true"
        );


        await signOut(auth);


        window.location.replace(
          "auth.html#pending"
        );

        return;
      }


      const role =
        normalize(
          profile.role
        );


      const status =
        normalize(
          profile.status
        );


      const approved =
        profile.approved === true ||
        status === "approved";


      /*
        Pending/rejected/suspended accounts must not
        remain inside protected dashboards.
      */

      if(!approved){

        sessionStorage.setItem(
          "speakoutManualLogout",
          "true"
        );


        await signOut(auth);


        window.location.replace(
          "auth.html#pending"
        );

        return;
      }


      /*
        Admin and super_admin can enter role-protected
        pages for support/testing unless the page itself
        adds additional restrictions.
      */

      const deviceMode =
        await enforceSafeDevicePersistence();

      if(deviceMode === "shared"){
        startSharedDeviceIdleGuard();
      }


      const privileged =
        role === "admin" ||
        role === "super_admin";


      if(
        !allowed.includes(role) &&
        !privileged
      ){

        const destination =
          routeForRole(role);


        /*
          Avoid redirect loops if a route configuration
          accidentally points to the current page.
        */

        const currentPage =
          window.location.pathname
            .split("/")
            .pop();


        if(
          destination !== currentPage
        ){

          window.location.replace(
            destination
          );

        }


        return;
      }


      /*
        Authorized.
      */

      if(
        typeof callback === "function"
      ){

        const effectiveProfile =
          applySupportProfile(
            profile
          );


        renderSupportBanner(
          effectiveProfile
        );


        await callback(
          user,
          effectiveProfile
        );

      }

    }
  );

}


/* =========================================================
   NAVIGATION DEFINITIONS
========================================================= */

const linksByRole = {

  student: [
    [
      "Dashboard",
      "student-dashboard.html"
    ],
    [
      "Programs",
      "programmes.html"
    ],
    [
      "Courses",
      "speakhub.html?audience=student"
    ],
    [
      "Library",
      "student-library.html"
    ],
    [
      "Kiddies",
      "kiddies.html"
    ],
    [
      "Certificates",
      "certificate-center.html"
    ],
    [
      "Portfolio",
      "learning-portfolio.html"
    ],
    [
      "Credentials",
      "credential-passport.html"
    ],
    [
      "Payments",
      "payment-history.html"
    ]
  ],


  parent: [
    [
      "Dashboard",
      "parent-dashboard.html"
    ],
    [
      "My Children",
      "parent-child-link.html"
    ],
    [
      "Parent Library",
      "parent-library.html"
    ],
    [
      "Workshops",
      "workshops.html"
    ],
    [
      "Certificates",
      "certificate-center.html"
    ],
    [
      "Portfolio",
      "learning-portfolio.html"
    ],
    [
      "Payments",
      "payment-history.html"
    ]
  ],


  teacher: [
    [
      "Dashboard",
      "teacher-dashboard.html"
    ],
    [
      "Programs",
      "programmes.html"
    ],
    [
      "Teacher Library",
      "teacher-library.html"
    ],
    [
      "Students",
      "teacher-students.html"
    ],
    [
      "Workshops",
      "workshops.html"
    ],
    [
      "Certificates",
      "certificate-center.html"
    ],
    [
      "Portfolio",
      "learning-portfolio.html"
    ],
    [
      "Courses",
      "speakhub.html?audience=teacher"
    ]
  ],


  school_admin: [
    [
      "Dashboard",
      "school-dashboard.html"
    ],
    [
      "Programs",
      "programmes.html"
    ],
    [
      "Launch",
      "school-launch-center.html"
    ],
    [
      "Students",
      "school-students.html"
    ],
    [
      "Parents",
      "school-parents.html"
    ],
    [
      "Teachers",
      "school-teachers.html"
    ],
    [
      "Users",
      "school-users.html"
    ],
    [
      "Workshops",
      "school-workshops.html"
    ],
    [
      "Reports",
      "school-programme-report.html"
    ],
    [
      "Resources",
      "school-resource-center.html"
    ]
  ],


  admin: [
    [
      "Dashboard",
      "admin-dashboard.html"
    ],
    [
      "Schools",
      "admin-schools.html"
    ],
    [
      "Users",
      "admin-users.html"
    ],
    [
      "Content",
      "admin-content-review.html"
    ],
    [
      "Courses",
      "admin-courses.html"
    ],
    [
      "Payments",
      "admin-payments.html"
    ]
  ],


  super_admin: [
    [
      "Dashboard",
      "admin-dashboard.html"
    ],
    [
      "Schools",
      "admin-schools.html"
    ],
    [
      "Users",
      "admin-users.html"
    ],
    [
      "Content",
      "admin-content-review.html"
    ],
    [
      "Courses",
      "admin-courses.html"
    ],
    [
      "Payments",
      "admin-payments.html"
    ]
  ],


  ambassador: [
    [
      "Dashboard",
      "ambassador-dashboard.html"
    ],
    [
      "Courses",
      "speakhub.html"
    ],
    [
      "Certificates",
      "certificate-center.html"
    ],
    [
      "Portfolio",
      "learning-portfolio.html"
    ]
  ],


  contributor: [
    [
      "Dashboard",
      "contributor-dashboard.html"
    ],
    [
      "Courses",
      "speakhub.html"
    ],
    [
      "Certificates",
      "certificate-center.html"
    ],
    [
      "Portfolio",
      "learning-portfolio.html"
    ]
  ]

};


/* =========================================================
   ROLE NAVIGATION
========================================================= */

export function renderRoleNav(
  profile,
  active = ""
){

  const nav =
    document.getElementById(
      "roleNav"
    );


  if(!nav){
    return;
  }


  const actualRole =
    normalize(
      profile?.actualRole ||
      profile?.role
    );


  const supportMode =
    profile?.supportMode === true &&
    actualRole === "super_admin";


  const role =
    supportMode
      ? "school_admin"
      : normalize(
          profile?.role
        );


  const links =
    supportMode
      ? [
          [
            "Admin Home",
            "admin-dashboard.html"
          ],
          ...linksByRole.school_admin
        ]
      : (
          linksByRole[role] ||
          [
            [
              "Dashboard",
              routeForRole(role)
            ]
          ]
        );


  const activeNormalized =
    normalize(active);


  nav.innerHTML =
    links
      .map(
        ([label, href]) => {

          const isActive =
            normalize(label) ===
            activeNormalized;


          const cssClass =
            isActive
              ? "btn dark"
              : "btn soft";


          return `
            <a
              class="${cssClass}"
              href="${href}"
              data-role-active="${isActive ? "true" : "false"}"
            >
              ${label}
            </a>
          `;

        }
      )
      .join("") +

    (
      supportMode
        ? `
            <button
              class="btn gold"
              id="exitSupportNavBtn"
              type="button"
            >
              Exit Support
            </button>
          `
        : ""
    ) +

    `
      <button
        class="btn dark"
        id="logoutBtn"
        type="button"
      >
        Logout
      </button>
    `;


  const exitSupportNavBtn =
    document.getElementById(
      "exitSupportNavBtn"
    );


  if(exitSupportNavBtn){

    exitSupportNavBtn.addEventListener(
      "click",
      async event=>{

        event.preventDefault();

        await exitSchoolSupportMode();

      }
    );

  }


  const logoutBtn =
    document.getElementById(
      "logoutBtn"
    );


  if(logoutBtn){

    logoutBtn.addEventListener(
      "click",
      async event => {

        event.preventDefault();

        /*
          Use the exact same centralized logout
          behaviour for every role.
        */

        await logoutUser();

      }
    );

  }

}