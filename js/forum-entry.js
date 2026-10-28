import { isApprovedProfile } from "./profile-approval.js";

// Account approval admits a member to the forum entrance, not to private rooms.
export async function forumEntry(user, readProfile) {
  if (!user) return { allowed: false, message: "Sign in with your SpeakOut account, or sign up and wait for approval." };
  const profile = await readProfile(user.uid);
  if (isApprovedProfile(profile)) return { allowed: true, message: "Account approved." };
  const messages = {
    pending: "Your account is pending approval. Discussions are unavailable until approval.",
    rejected: "Your account is not approved. Contact SpeakOut if you believe this is an error.",
    suspended: "Your account is suspended. Contact SpeakOut for assistance."
  };
  return { allowed: false, message: messages[profile?.status] || "Your account needs an approved SpeakOut profile before you can enter the forum." };
}

// Only a fixed local destination is accepted; user-supplied URLs are never used.
export function forumReturn(search, profile) {
  return isApprovedProfile(profile) && new URLSearchParams(search).get("next") === "forum"
    ? "forum.html" : null;
}
