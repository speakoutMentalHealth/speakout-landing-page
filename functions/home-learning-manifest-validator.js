"use strict";

// Pure, fail-closed validator. Does not grant trust or write to Firestore.
const SHA256 = /^[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40}$/;
const ID = /^[a-zA-Z0-9_-]{3,900}$/;
const PATH = /^[a-zA-Z0-9_/-]+\.html$/;

function validateTrustedManifestCandidate(candidate, expected) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate) ||
      !expected || typeof expected !== "object") throw new Error("Missing manifest or assignment");
  const fields = ["assignmentId", "resourceId", "resourceVersion"];
  for (const field of fields) {
    if (typeof expected[field] !== "string" || !expected[field].trim() ||
        candidate[field] !== expected[field]) throw new Error("Assignment identity mismatch");
  }
  if (!ID.test(candidate.assignmentId) || !ID.test(candidate.resourceId) ||
      !SHA256.test(candidate.contentSha256) || !COMMIT.test(candidate.sourceCommit)) {
    throw new Error("Invalid manifest identity or immutable fingerprint");
  }
  if (typeof candidate.resourceUrl !== "string" || !PATH.test(candidate.resourceUrl) ||
      candidate.resourceUrl.includes("..") || candidate.resourceUrl.startsWith("/")) {
    throw new Error("Unsafe resource URL");
  }
  if (candidate.status !== "candidate-unverified") throw new Error("Only unverified candidates accepted");
  if (candidate.reviewStatus !== "unreviewed") throw new Error("Unexpected catalogue review status");
  if (typeof candidate.bytes !== "number" || !Number.isSafeInteger(candidate.bytes) || candidate.bytes <= 0) {
    throw new Error("Invalid file size");
  }
  return Object.freeze({
    assignmentId: candidate.assignmentId,
    resourceId: candidate.resourceId,
    resourceVersion: candidate.resourceVersion,
    resourceUrl: candidate.resourceUrl,
    sourceCommit: candidate.sourceCommit,
    contentSha256: candidate.contentSha256,
    bytes: candidate.bytes,
    status: "candidate-unverified"
  });
}

module.exports = { validateTrustedManifestCandidate };
