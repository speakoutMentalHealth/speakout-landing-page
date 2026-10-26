import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {submitManifestCandidate,CandidateIngestionError}=
  require("../functions/home-learning-manifest-callable.js");

test("candidate ingestion is off by default even for authenticated administrators",async()=>{
  let called=false;
  await assert.rejects(submitManifestCandidate({
    auth:{uid:"admin-1"},data:{assignmentId:"assignment-1"}
  },{ingest:async()=>{called=true;}}),err=>
    err instanceof CandidateIngestionError && err.code==="failed-precondition");
  assert.equal(called,false);
});
test("callable requires verified Firebase auth instead of a submitted actor UID",async()=>{
  let called=false;
  await assert.rejects(submitManifestCandidate({
    data:{actorUid:"claimed-super-admin",assignmentId:"assignment-1"}
  },{enabled:true,ingest:async()=>{called=true;}}),err=>err.code==="unauthenticated");
  assert.equal(called,false);
});
test("callable derives actor identity only from Firebase authentication",async()=>{
  let captured;
  const result=await submitManifestCandidate({
    auth:{uid:"actual-user"},
    data:{actorUid:"impersonated-admin",assignmentId:"assignment-1"}
  },{enabled:true,db:{},loadSourceAtCommit:async()=>Buffer.from("x"),
    ingest:async args=>{captured=args;return {ok:true,status:"candidate-unverified"};}});
  assert.equal(result.status,"candidate-unverified");
  assert.equal(captured.actorUid,"actual-user");
  assert.equal(captured.candidate.actorUid,"impersonated-admin");
});
test("unauthorized, duplicate and unexpected failures fail closed",async()=>{
  const request={auth:{uid:"user"},data:{assignmentId:"assignment-1"}};
  for(const [error,code] of [
    [new Error("Approved super administrator required"),"permission-denied"],
    [Object.assign(new Error("exists"),{code:6}),"already-exists"],
    [new Error("Private source token: secret"),"failed-precondition"]
  ]){
    await assert.rejects(submitManifestCandidate(request,{
      enabled:true,ingest:async()=>{throw error;}
    }),err=>{
      assert.equal(err.code,code);
      assert.doesNotMatch(err.message,/secret/);
      return true;
    });
  }
});
