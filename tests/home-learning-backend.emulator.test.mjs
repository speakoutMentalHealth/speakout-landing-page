import test, {before, after} from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {createRequire} from "node:module";

// Integration test: uses Admin SDK against the local emulator only.
if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error("FIRESTORE_EMULATOR_HOST is required; refusing any non-emulator database access");
}
const requireFunctions=createRequire(new URL("../functions/package.json",import.meta.url));
const {initializeApp,deleteApp}=requireFunctions("firebase-admin/app");
const {getFirestore}=requireFunctions("firebase-admin/firestore");
const {ingestManifestCandidate}=requireFunctions("./home-learning-manifest-ingestion.js");
const {submitManifestCandidate}=requireFunctions("./home-learning-manifest-callable.js");
const projectId="demo-speakout-rules";
const adminUid="home-learning-int-admin";
const bytes=Buffer.from("<html><body>Unreviewed learning draft</body></html>");
const hash=createHash("sha256").update(bytes).digest("hex");
const catalogueBytes=Buffer.from(JSON.stringify({status:"development-preview",resources:[
  {id:"resource_123",resource_url:"early-years-counting-pack.html",review_status:"unreviewed"}
]}));
const loadSource=async({resourceUrl})=>resourceUrl==="data/home-learning-catalog.json"?catalogueBytes:bytes;
const app=initializeApp({projectId},"home-learning-manifest-emulator-tests");
const db=getFirestore(app);
const assigned=new Set();

async function prepare(assignmentId,role="super_admin") {
  assigned.add(assignmentId);
  await db.doc(`users/${adminUid}`).set({role,status:"approved"});
  await db.doc(`homeLearningReviewerAssignments/${assignmentId}`).set({
    reviewerUid:"reviewer-123",resourceId:"resource_123",resourceVersion:"v1"
  });
}
function candidate(assignmentId) {
  return {
    assignmentId, resourceId:"resource_123",resourceVersion:"v1",
    resourceUrl:"early-years-counting-pack.html",sourceCommit:"a".repeat(40),
    contentSha256:hash,bytes:bytes.length,reviewStatus:"unreviewed",
    status:"candidate-unverified"
  };
}
async function ingest(record,loadSourceAtCommit=loadSource) {
  return ingestManifestCandidate({db,actorUid:adminUid,candidate:record,loadSourceAtCommit});
}
after(async()=>{
  for(const assignmentId of assigned){
    await db.doc(`homeLearningManifestCandidates/${assignmentId}`).delete();
    await db.doc(`homeLearningReviewerAssignments/${assignmentId}`).delete();
  }
  await db.doc(`users/${adminUid}`).delete();
  await deleteApp(app);
});
test("Admin SDK creates an unverified manifest once; duplicate ingestion is rejected",async()=>{
  const id="manifest-emulator-valid-127";
  await prepare(id);
  const result=await ingest(candidate(id));
  assert.deepEqual(result,{ok:true,status:"candidate-unverified",trusted:false,published:false});
  const saved=await db.doc(`homeLearningManifestCandidates/${id}`).get();
  assert.equal(saved.exists,true);
  assert.equal(saved.data().recordedBy,adminUid);
  assert.equal(saved.data().contentSha256,hash);
  assert.equal(saved.data().status,"candidate-unverified");
  await assert.rejects(ingest(candidate(id)));
  const afterDuplicate=await db.doc(`homeLearningManifestCandidates/${id}`).get();
  assert.equal(afterDuplicate.data().status,"candidate-unverified");
});
test("Unauthorized administrator cannot create a candidate",async()=>{
  const id="manifest-emulator-unauthorized-127";
  await prepare(id);
  await db.doc(`users/${adminUid}`).set({role:"teacher",status:"approved"});
  let loaderCalled=false;
  await assert.rejects(ingest(candidate(id),async()=>{loaderCalled=true;return bytes;}),/Approved super administrator required/);
  assert.equal(loaderCalled,false);
  assert.equal((await db.doc(`homeLearningManifestCandidates/${id}`).get()).exists,false);
});
test("Tampered bytes and stale versions never create candidate manifests",async()=>{
  const id="manifest-emulator-mismatch-127";
  await prepare(id);
  await assert.rejects(ingest(candidate(id),async({resourceUrl})=>resourceUrl==="data/home-learning-catalog.json"?catalogueBytes:Buffer.from("tampered")) ,/Immutable source bytes do not match/);
  let loaderCalled=false;
  await assert.rejects(ingest({...candidate(id),resourceVersion:"v2"},async()=>{
    loaderCalled=true;return bytes;
  }),/Assignment mismatch/);
  assert.equal(loaderCalled,false);
  assert.equal((await db.doc(`homeLearningManifestCandidates/${id}`).get()).exists,false);
});

test("Firebase-authenticated callable refuses impersonation and stays disabled by default",async()=>{
  const id="manifest-emulator-auth-gate-128";
  await prepare(id);
  const input={...candidate(id),actorUid:adminUid};
  const options={db,enabled:true,loadSourceAtCommit:loadSource};
  await assert.rejects(submitManifestCandidate({data:input},options),
    err=>err.code==="unauthenticated");
  await assert.rejects(submitManifestCandidate({auth:{uid:adminUid},data:input},
    {...options,enabled:false}),err=>err.code==="failed-precondition");
  const teacherUid="manifest-unprivileged-128";
  await db.doc(`users/${teacherUid}`).set({role:"teacher",status:"approved"});
  try {
    await assert.rejects(submitManifestCandidate({
      auth:{uid:teacherUid},data:input
    },options),err=>err.code==="permission-denied");
    assert.equal((await db.doc(`homeLearningManifestCandidates/${id}`).get()).exists,false);
  } finally {
    await db.doc(`users/${teacherUid}`).delete();
  }
});
