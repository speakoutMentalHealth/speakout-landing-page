import { auth } from "./firebase-config.js";

import {
  signOut
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

document.addEventListener("click", async (event) => {
  const btn = event.target.closest("[data-logout]");
  if (!btn) return;

  event.preventDefault();

  try {
    await signOut(auth);
    window.location.href = "../../auth/auth.html";
  } catch (error) {
    console.error("Logout error:", error);
    alert("Logout failed. Please try again.");
  }
});
