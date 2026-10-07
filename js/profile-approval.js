// Match the canonical approval status required by Firestore.
// Legacy flags and role names cannot override pending, rejected or suspended status.
export function isApprovedProfile(profile) {
  return profile?.status === "approved";
}
