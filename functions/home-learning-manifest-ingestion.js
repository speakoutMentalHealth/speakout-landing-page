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
  // Bind the resource ID to its canonical path in the catalogue from the
  // SAME immutable Git commit; never trust a candidate-supplied path alone.
  const catalogueBytes=await loadSourceAtCommit({
    sourceCommit:candidate.sourceCommit,
    resourceUrl:"data/home-learning-catalog.json"
  });
  if(!Buffer.isBuffer(catalogueBytes) || catalogueBytes.length===0 ||
     catalogueBytes.length>500_000) {
    throw new Error("Pinned catalogue unavailable or oversized");
  }
  let catalogue;
  try {
    catalogue=JSON.parse(catalogueBytes.toString("utf8"));
  } catch {
    throw new Error("Pinned catalogue is not valid JSON");
  }
  if(catalogue?.status!=="development-preview" || !Array.isArray(catalogue.resources)) {
    throw new Error("Pinned catalogue has an invalid schema");
  }
  const matching=catalogue.resources.filter(resource=>resource?.id===candidate.resourceId);
  if(matching.length!==1 || matching[0].resource_url!==candidate.resourceUrl ||
     matching[0].review_status!=="unreviewed") {
    throw new Error("Candidate does not match the pinned catalogue");
  }
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
