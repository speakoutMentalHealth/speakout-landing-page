"use strict";

function approvalState(profile = {}) {
  const status = typeof profile.status === "string" ? profile.status : "";
  const canonicalApproved = status === "approved";
  const legacyApproved = profile.approved === true;
  const desiredLegacyApproved = canonicalApproved;

  let issue = "none";
  if (!status) issue = legacyApproved ? "legacy_approved_without_status" : "missing_status";
  else if (!canonicalApproved && legacyApproved) issue = "stale_legacy_grant";
  else if (canonicalApproved && profile.approved !== true) issue = "legacy_flag_out_of_sync";

  return {
    canonicalApproved,
    legacyApproved,
    desiredLegacyApproved,
    needsLegacyFlagSync: profile.approved !== desiredLegacyApproved,
    issue
  };
}

function normalizationPatch(profile = {}) {
  const state = approvalState(profile);
  if (!state.needsLegacyFlagSync) return null;
  return { approved: state.desiredLegacyApproved };
}

module.exports = { approvalState, normalizationPatch };
