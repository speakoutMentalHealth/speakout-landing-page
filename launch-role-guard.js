// launch-role-guard.js

import { auth, db } from "./firebase-config.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";


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

  ambassador: "ambassador.html",

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

        await callback(
          user,
          profile
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
      "Payments",
      "admin-payments.html"
    ]
  ],


  ambassador: [
    [
      "Dashboard",
      "ambassador.html"
    ],
    [
      "Courses",
      "speakhub.html"
    ],
    [
      "Certificates",
      "certificate-center.html"
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


  const role =
    normalize(
      profile?.role
    );


  const links =
    linksByRole[role] ||
    [
      [
        "Dashboard",
        routeForRole(role)
      ]
    ];


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
            >
              ${label}
            </a>
          `;

        }
      )
      .join("") +

    `
      <button
        class="btn dark"
        id="logoutBtn"
        type="button"
      >
        Logout
      </button>
    `;


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