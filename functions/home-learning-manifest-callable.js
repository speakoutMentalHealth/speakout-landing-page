"use strict";

// The caller's identity MUST come from verified Firebase callable auth, never from request.data.
// This module is safe to test without importing the deployed Cloud Functions entrypoint.
const {ingestManifestCandidate}=require("./home-learning-manifest-ingestion");

class CandidateIngestionError extends Error {
  constructor(code,message) {
    super(message);
    this.name="CandidateIngestionError";
    this.code=code;
  }
}

async function submitManifestCandidate(request, {db,loadSourceAtCommit,enabled=false,ingest=ingestManifestCandidate}={}) {
  if(enabled!==true) throw new CandidateIngestionError("failed-precondition","Candidate ingestion is disabled.");
  const actorUid=request?.auth?.uid;
  if(typeof actorUid!=="string" || !actorUid.trim()) {
    throw new CandidateIngestionError("unauthenticated","Firebase authentication required.");
  }
  const candidate=request?.data;
  if(!candidate || typeof candidate!=="object" || Array.isArray(candidate)) {
    throw new CandidateIngestionError("invalid-argument","Candidate data required.");
  }
  // Only approved super administrators can write candidate records. An authenticated
  // identity is resolved by the Firebase transport; data.actorUid is intentionally ignored.
  try {
    return await ingest({db,actorUid,candidate,loadSourceAtCommit});
  } catch(err) {
    if(err instanceof CandidateIngestionError) throw err;
    if(err?.message==="Approved super administrator required") {
      throw new CandidateIngestionError("permission-denied","Approved super administrator required.");
    }
    if(err?.code===6 || err?.code==="already-exists" || err?.code==="ALREADY_EXISTS") {
      throw new CandidateIngestionError("already-exists","Candidate manifest already recorded.");
    }
    // Fail closed: do not expose source URLs, tokens, or internal database details.
    throw new CandidateIngestionError("failed-precondition","Candidate ingestion verification failed.");
  }
}
module.exports={submitManifestCandidate,CandidateIngestionError};
