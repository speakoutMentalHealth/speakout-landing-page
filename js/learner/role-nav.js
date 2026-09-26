import { getCurrentProfile, renderRoleNav } from "../../launch-role-guard.js";

export async function renderLearnerNav(user, activeLabel=""){
  if(!user)return null;
  const profile=await getCurrentProfile(user);
  if(!profile)return null;
  renderRoleNav(profile,activeLabel);
  document.dispatchEvent(new CustomEvent("speakout:nav-updated"));
  return profile;
}
