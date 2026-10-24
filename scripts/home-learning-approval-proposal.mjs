// Approval proposal construction only. No authentication, Firestore writes, or publication.
// Inputs MUST originate from a separately authenticated server reading trusted records.
import { createHash } from "node:crypto";
import { assessApprovalEvidence } from "./home-learning-approval-evidence.mjs";

const sha256 = value => createHash("sha256").update(value, "utf8").digest("hex");
const validId = value => typeof value === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
const isoTime = value => typeof value === "string" && !Number.isNaN(Date.parse(value)) &&
  new Date(value).toISOString() === value;
const safeText = value => typeof value === "string" && value.trim().length > 0;
export const APPROVAL_PROTOCOL = "speakout-home-learning-approval-v1";

// This deliberately doesn't export a publish function or any database client.
export function prepareApprovalProposal({ resource, assignment, submission, decision,
  lessonContent, verified, actor, approvedAt, previousAuditHash = null } = {}) {
  const errors = [...assessApprovalEvidence({resource,assignment,submission,decision,lessonContent}).errors];
  // A client must never be able to set these flags to authorize anything.
  // The future adapter must construct them after independent server lookups.
  if (!verified || verified.serverAuthenticated !== true ||
      verified.reviewerAssignmentVerified !== true ||
      verified.reviewerQualificationVerified !== true ||
      verified.independentApprovalVerified !== true ||
      verified.contentSnapshotVerified !== true ||
      verified.curriculumSourceVerified !== true ||
      verified.securityReviewComplete !== true) errors.push("Trusted server verification incomplete");
  if (!actor || !safeText(actor.uid) || !["editor", "super_admin"].includes(actor.authorization) ||
      actor.uid !== decision?.approverUid || verified?.authenticatedActorUid !== actor.uid) {
    errors.push("Trusted approver identity or role mismatch");
  }
  if (!isoTime(approvedAt)) errors.push("Trusted ISO timestamp required");
  if (previousAuditHash !== null && !/^[a-f0-9]{64}$/.test(previousAuditHash)) {
    errors.push("Previous audit digest malformed");
  }
  if (!validId(resource?.id) || !safeText(resource?.version) ||
      !safeText(assignment?.id)) errors.push("Invalid approval identifiers");
  if (errors.length) return {ready:false,errors,proposal:null};
  const contentSha256 = sha256(lessonContent);
  const approvalKey = sha256(APPROVAL_PROTOCOL + "\n" + resource.id + "\n" + resource.version + "\n" + contentSha256);
  const record = {
    protocol: APPROVAL_PROTOCOL,
    approvalKey, resourceId:resource.id, resourceVersion:resource.version,
    contentSha256, assignmentId:assignment.id, reviewerUid:assignment.reviewerUid,
    approverUid:actor.uid, approvedAt, curriculumReference:resource.curriculumReference,
    curriculumOutcome:resource.curriculumOutcome, decisionRationale:decision.rationale.trim(),
    previousAuditHash
  };
  const auditHash = sha256(JSON.stringify(record));
  // Proposal != authorization: an eventual server must recheck transactionally,
  // persist append-only audit evidence and enforce revocation.
  return {ready:true,errors:[],proposal:{...record,auditHash}};
}
