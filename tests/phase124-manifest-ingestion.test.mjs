import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {ingestManifestCandidate}=require('../functions/home-learning-manifest-ingestion.js');
const bytes=Buffer.from('<html>review pending</html>');
const candidate={assignmentId:'assignment_123',resourceId:'resource_123',resourceVersion:'v1',resourceUrl:'early-years-counting-pack.html',sourceCommit:'a'.repeat(40),contentSha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,reviewStatus:'unreviewed',status:'candidate-unverified'};
function fixture(role='super_admin',status='approved'){
 const writes=[];
 const db={doc:path=>({
   get:async()=>path.startsWith('users/')?{exists:true,data:()=>({role,status})}:{exists:true,data:()=>({resourceId:candidate.resourceId,resourceVersion:candidate.resourceVersion})},
   create:async record=>{writes.push({path,record})}
 })};
 return {db,writes};
}
test('approved administrator may store only unverified candidate',async()=>{
 const {db,writes}=fixture();
 const result=await ingestManifestCandidate({db,actorUid:'admin_123',candidate,loadSourceAtCommit:async()=>bytes});
 assert.equal(result.trusted,false);
 assert.equal(result.published,false);
 assert.equal(writes.length,1);
 assert.equal(writes[0].record.status,'candidate-unverified');
});
test('rejects unauthorized actors and mismatched source bytes',async()=>{
 for(const [role,status] of [['teacher','approved'],['super_admin','pending']]){
  const {db,writes}=fixture(role,status);
  await assert.rejects(ingestManifestCandidate({db,actorUid:'admin_123',candidate,loadSourceAtCommit:async()=>bytes}));
  assert.equal(writes.length,0);
 }
 const {db,writes}=fixture();
 await assert.rejects(ingestManifestCandidate({db,actorUid:'admin_123',candidate,loadSourceAtCommit:async()=>Buffer.from('tampered')}));
 assert.equal(writes.length,0);
});
test('rejects untrusted source adapters and stale assignments',async()=>{
 const {db,writes}=fixture();
 await assert.rejects(ingestManifestCandidate({db,actorUid:'admin_123',candidate,loadSourceAtCommit:async()=>'<html>text</html>'}));
 await assert.rejects(ingestManifestCandidate({db,actorUid:'admin_123',candidate:{...candidate,resourceVersion:'v2'},loadSourceAtCommit:async()=>bytes}));
 assert.equal(writes.length,0);
});
