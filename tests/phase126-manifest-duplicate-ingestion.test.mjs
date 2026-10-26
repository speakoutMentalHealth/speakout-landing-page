import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {ingestManifestCandidate}=require('../functions/home-learning-manifest-ingestion.js');
const bytes=Buffer.from('<html>draft</html>');
const catalogueBytes=Buffer.from(JSON.stringify({status:'development-preview',resources:[{id:'resource_123',resource_url:'early-years-counting-pack.html',review_status:'unreviewed'}]}));
const candidate={assignmentId:'assignment_123',resourceId:'resource_123',resourceVersion:'v1',resourceUrl:'early-years-counting-pack.html',sourceCommit:'a'.repeat(40),contentSha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,reviewStatus:'unreviewed',status:'candidate-unverified'};
test('create-only candidate storage rejects duplicate ingestion',async()=>{
 const documents=new Map();
 const db={doc:path=>({
  get:async()=>{
   if(path.startsWith('users/'))return {exists:true,data:()=>({role:'super_admin',status:'approved'})};
   if(path.startsWith('homeLearningReviewerAssignments/'))return {exists:true,data:()=>({resourceId:'resource_123',resourceVersion:'v1'})};
   throw Error('Unexpected get');
  },
  create:async record=>{
   if(documents.has(path))throw Error('ALREADY_EXISTS');
   documents.set(path,record);
  }
 })};
 const args={db,actorUid:'admin_123',candidate,loadSourceAtCommit:async({resourceUrl})=>resourceUrl==='data/home-learning-catalog.json'?catalogueBytes:bytes};
 const first=await ingestManifestCandidate(args);
 assert.equal(first.trusted,false);
 await assert.rejects(ingestManifestCandidate(args),/ALREADY_EXISTS/);
 assert.equal(documents.size,1);
 assert.equal(documents.get('homeLearningManifestCandidates/assignment_123').status,'candidate-unverified');
});
