import { auth } from "./firebase-config.js";

import {
  signOut
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

document.addEventListener("click", async (event) => {
  const btn = event.target.closest("[data-logout]");
  if (!btn) return;

  event.preventDefault();

  try {
    sessionStorage.setItem("speakoutManualLogout", "true");

    localStorage.removeItem("speakoutRole");
    localStorage.removeItem("speakoutUser");
    localStorage.removeItem("speakoutSchoolCode");
    localStorage.removeItem("speakoutSchoolName");

    await signOut(auth);

    window.location.replace(
      new URL("/auth/auth.html?loggedOut=1", window.location.origin).href
    );
  } catch (error) {
    console.error("Logout error:", error);
    alert("Logout failed. Please try again.");
  }
});
