// Pure transactional preflight for a future trusted, server-only approval writer.
// The caller MUST obtain trustedState inside a database transaction; this module
// does not authenticate clients, write data, publish lessons or approve resources.
import { createHash } from "node:crypto";
import { APPROVAL_PROTOCOL } from "./home-learning-approval-proposal.mjs";

const hex = /^[a-f0-9]{64}$/;
const hash = value => createHash("sha256").update(value, "utf8").digest("hex");
const string = value => typeof value === "string" && value.length > 0;

export function inspectApprovalCommit({ proposal, trustedState } = {}) {
  const errors = [];
  if (!proposal || proposal.protocol !== APPROVAL_PROTOCOL ||
      !string(proposal.resourceId) || !string(proposal.resourceVersion) ||
      !hex.test(proposal.contentSha256 || "") ||
      !hex.test(proposal.approvalKey || "") ||
      !hex.test(proposal.auditHash || "") ||
      !string(proposal.assignmentId) || !string(proposal.reviewerUid) ||
      !string(proposal.approverUid)) errors.push("Malformed approval proposal");
  if (!trustedState || trustedState.transactional !== true ||
      !string(trustedState.resourceId) || !string(trustedState.resourceVersion) ||
      !hex.test(trustedState.contentSha256 || "") ||
      !Array.isArray(trustedState.recordedApprovalKeys) ||
      typeof trustedState.activeApprovalExists !== "boolean" ||
      typeof trustedState.resourceIsRetired !== "boolean") {
    errors.push("Missing trusted transactional resource state");
  }
  if (proposal && hex.test(proposal.auditHash || "")) {
    const {auditHash, ...record} = proposal;
    if (hash(JSON.stringify(record)) !== auditHash) errors.push("Proposal audit digest mismatch");
  }
  if (proposal && trustedState) {
    if (proposal.resourceId !== trustedState.resourceId ||
        proposal.resourceVersion !== trustedState.resourceVersion ||
        proposal.contentSha256 !== trustedState.contentSha256) {
      errors.push("Lesson revision changed after review");
    }
    if (trustedState.activeApprovalExists === true) errors.push("Active approval must be revoked through a separate audited process");
    if (trustedState.resourceIsRetired === true) errors.push("Retired content cannot be approved");
    if (Array.isArray(trustedState.recordedApprovalKeys) &&
        trustedState.recordedApprovalKeys.includes(proposal.approvalKey)) {
      errors.push("Duplicate or replayed approval decision");
    }
    const head = trustedState.auditHead ?? null;
    if (head !== null && !hex.test(head)) errors.push("Invalid trusted audit head");
    if (proposal.previousAuditHash !== head) errors.push("Audit sequence changed");
  }
  return {readyForTransactionalWrite: errors.length === 0, errors};
}
