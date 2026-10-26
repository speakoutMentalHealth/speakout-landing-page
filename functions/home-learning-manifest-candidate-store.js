"use strict";

// Server-side create-only storage boundary. Caller must separately authenticate,
// independently verify source bytes and review evidence, and authorize promotion.
// This module intentionally never changes candidate status to trusted.
const {validateTrustedManifestCandidate}=require("./home-learning-manifest-validator");

async function recordManifestCandidate({db, candidate, assignment, actorUid, verifiedSourceDigest}) {
  if (!db || typeof db.doc !== "function" || !actorUid || typeof actorUid !== "string") {
    throw new Error("Authenticated server context required");
  }
  const checked=validateTrustedManifestCandidate(candidate,assignment);
  if (typeof verifiedSourceDigest !== "string" || verifiedSourceDigest !== checked.contentSha256) {
    throw new Error("Independently verified source digest required");
  }
  const ref=db.doc(`homeLearningManifestCandidates/${checked.assignmentId}`);
  await ref.create({
    ...checked,
    recordedBy:actorUid,
    recordedAt:require("firebase-admin/firestore").FieldValue.serverTimestamp()
  });
  return {ok:true,status:"candidate-unverified",trusted:false,published:false};
}
module.exports={recordManifestCandidate};
