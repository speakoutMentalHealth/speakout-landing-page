// Pure, fail-closed validation for a future trusted editorial approval service.
// This module does NOT read credentials, write Firestore or grant publication approval.
// The eventual server must independently authenticate all trusted evidence.
import { createHash } from "node:crypto";

const validId = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const sha256 = /^[a-f0-9]{64}$/;
const isText = value => typeof value === "string" && value.trim().length > 0;

export function hashLessonContent(content) {
  if (typeof content !== "string" || !content.length) throw new TypeError("Lesson content required");
  return createHash("sha256").update(content, "utf8").digest("hex");
}

export function assessApprovalEvidence({ resource, assignment, submission, decision, lessonContent } = {}) {
  const errors = [];
  if (!resource || !validId.test(resource.id || "")) errors.push("Invalid resource identity");
  if (!resource || !isText(resource.version)) errors.push("Missing immutable resource version");
  if (!resource || !isText(resource.authorUid)) errors.push("Missing content author");
  if (!resource || !isText(resource.curriculumReference)) errors.push("Missing authoritative curriculum reference");
  if (!resource || !isText(resource.curriculumOutcome)) errors.push("Missing curriculum learning outcome");
  let currentHash;
  try { currentHash = hashLessonContent(lessonContent); }
  catch { errors.push("Missing source content"); }
  if (!resource || !sha256.test(resource.sha256 || "") || resource.sha256 !== currentHash) {
    errors.push("Content hash mismatch or invalid digest");
  }
  if (!assignment || !isText(assignment.id) || !isText(assignment.reviewerUid) || assignment.resourceId !== resource?.id || assignment.resourceVersion !== resource?.version) {
    errors.push("Reviewer assignment is missing or stale");
  }
  if (!submission || submission.assignmentId !== assignment?.id ||
      submission.resourceId !== resource?.id ||
      submission.resourceVersion !== resource?.version ||
      submission.reviewerUid !== assignment?.reviewerUid ||
      submission.reviewStatus !== "submitted_for_verification" ||
      !isText(submission.findings)) {
    errors.push("Submission does not match assigned resource and version");
  }
  if (!decision || decision.outcome !== "approve" || !isText(decision.approverUid) || !isText(decision.rationale)) {
    errors.push("Missing independent approval decision");
  }
  const reviewer = assignment?.reviewerUid;
  if (reviewer && resource?.authorUid === reviewer) errors.push("Author cannot review own content");
  if (decision?.approverUid && (decision.approverUid === reviewer || decision.approverUid === resource?.authorUid)) {
    errors.push("Approver must be independent from reviewer and author");
  }
  if (!decision || decision.contentSha256 !== currentHash || decision.resourceVersion !== resource?.version) {
    errors.push("Decision does not attest to this exact content revision");
  }
  if (!decision || decision.reviewerCredentialVerified !== true || decision.curriculumChecked !== true ||
      decision.safeguardingChecked !== true || decision.accessibilityChecked !== true ||
      decision.licensingChecked !== true || decision.answerKeyChecked !== true) {
    errors.push("Required expert review gates incomplete");
  }
  return { eligibleForServerReview: errors.length === 0, errors };
}
