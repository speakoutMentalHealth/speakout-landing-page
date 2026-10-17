import { auth } from "./firebase-config.js";
import { signOut } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

export const loginUrl = new URL("../auth.html", import.meta.url).href;
let logoutPromise;

function updateStorage(storageName, action, key, value){
  // Storage restrictions must never prevent Firebase sign-out.
  try { window[storageName][action](key, value); } catch {}
}

export function logoutSession(){
  if(logoutPromise) return logoutPromise;
  updateStorage("sessionStorage", "setItem", "speakoutManualLogout", "true");
  for(const key of ["speakoutDeviceMode", "speakoutOnboarding"]){
    updateStorage("sessionStorage", "removeItem", key);
  }
  for(const key of ["speakoutRole", "speakoutUser", "speakoutSchoolCode", "speakoutSchoolName", "speakoutDeviceMode", "speakoutSupportSchoolId", "speakoutSupportSchoolCode", "speakoutSupportSchoolName"]){
    updateStorage("localStorage", "removeItem", key);
  }
  logoutPromise = (async()=>{
    await signOut(auth);
    window.location.replace(`${loginUrl}?loggedOut=1`);
  })().catch(error=>{
    logoutPromise = null;
    throw error;
  });
  return logoutPromise;
}
