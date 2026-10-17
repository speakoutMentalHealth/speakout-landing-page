import { auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { loginUrl, logoutSession } from "./account-session.js";

const header = document.querySelector("header");
if(header){
  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = new URL("../css/account-controls.css", import.meta.url).href;
  document.head.append(stylesheet);

  // Keep account actions outside navigation panels that collapse on phones.
  const account = document.createElement("nav");
  account.className = "speakout-account";
  account.setAttribute("aria-label", "Account");
  account.innerHTML = `<a class="speakout-account-action" href="${loginUrl}">Login</a><button class="speakout-account-action" type="button" data-logout hidden>Logout</button><span class="speakout-account-status" role="status" aria-live="polite"></span>`;
  header.insertAdjacentElement("afterend", account);
  const login = account.querySelector("a");
  const logout = account.querySelector("button");
  const status = account.querySelector("[role='status']");
  let busy = false;
  const logoutSelector = "[data-logout],#logoutBtn,#logoutButton,#logoutLink,.logout";

  async function handleLogout(event){
    const control = event.target.closest(logoutSelector);
    if(!control) return;
    // Supersede legacy redirect-only and duplicate page-specific handlers.
    event.preventDefault();
    event.stopImmediatePropagation();
    if(busy) return;
    busy = true;
    logout.disabled = true;
    status.textContent = "Logging out…";
    try {
      await logoutSession();
    } catch(error){
      console.error("Logout failed", error);
      busy = false;
      logout.disabled = false;
      status.textContent = "Could not log out. Please try again.";
    }
  }
  document.addEventListener("click", handleLogout, true);
  window.speakoutLogout = logoutSession;

  onAuthStateChanged(auth, user=>{
    login.hidden = Boolean(user);
    logout.hidden = !user;
    if(!busy) status.textContent = "";
  }, ()=>{
    status.textContent = "Account connection unavailable. Refresh to try again.";
  });
}
