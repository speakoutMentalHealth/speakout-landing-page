"use strict";

// Internal-only orchestration. No callable/HTTP export. The trusted source loader
// must fetch exact bytes from an immutable commit and reject missing files.
const {createHash}=require("node:crypto");
const {recordManifestCandidate}=require("./home-learning-manifest-candidate-store");
const {validateTrustedManifestCandidate}=require("./home-learning-manifest-validator");

async function ingestManifestCandidate({db, actorUid, candidate, loadSourceAtCommit}) {
  if (!db || typeof db.doc!=="function" || typeof actorUid!=="string" ||
      !actorUid.trim() || typeof loadSourceAtCommit!=="function" ||
      !candidate || typeof candidate!=="object") {
    throw new Error("Invalid ingestion context");
  }
  const actor=await db.doc(`users/${actorUid}`).get();
  if (!actor.exists || actor.data().role!=="super_admin" || actor.data().status!=="approved") {
    throw new Error("Approved super administrator required");
  }
  if (typeof candidate.assignmentId!=="string" ||
      !/^[a-zA-Z0-9_-]{3,900}$/.test(candidate.assignmentId)) {
    throw new Error("Invalid assignment ID");
  }
  const assignmentSnap=await db.doc(`homeLearningReviewerAssignments/${candidate.assignmentId}`).get();
  if (!assignmentSnap.exists) throw new Error("Assignment not found");
  const assignment=assignmentSnap.data();
  if (assignment.resourceId!==candidate.resourceId ||
      assignment.resourceVersion!==candidate.resourceVersion) {
    throw new Error("Assignment mismatch");
  }
  // Reject invalid candidate metadata before invoking any external source loader.
  validateTrustedManifestCandidate(candidate,{...assignment,assignmentId:candidate.assignmentId});
  // The source adapter must enforce commit pinning and repository allowlisting.
  const bytes=await loadSourceAtCommit({
    sourceCommit:candidate.sourceCommit,
    resourceUrl:candidate.resourceUrl
  });
  if (!Buffer.isBuffer(bytes)) throw new Error("Source loader must return raw bytes");
  const digest=createHash("sha256").update(bytes).digest("hex");
  if (bytes.length!==candidate.bytes || digest!==candidate.contentSha256) {
    throw new Error("Immutable source bytes do not match candidate");
  }
  return recordManifestCandidate({
    db,candidate,assignment:{...assignment,assignmentId:candidate.assignmentId},
    actorUid,verifiedSourceDigest:digest
  });
}
module.exports={ingestManifestCandidate};
