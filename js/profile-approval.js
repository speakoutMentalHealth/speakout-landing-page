// Match the approved-profile formats accepted by the role gate and trusted API.
export function isApprovedProfile(profile) {
  return profile?.approved === true ||
    String(profile?.status || "").trim().toLowerCase() === "approved";
}
