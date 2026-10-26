import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {validateTrustedManifestCandidate}=require('../functions/home-learning-manifest-validator.js');
const expected={assignmentId:'assignment_123',resourceId:'nursery-counting',resourceVersion:'v1'};
const candidate={...expected,resourceUrl:'early-years-counting-pack.html',sourceCommit:'a'.repeat(40),contentSha256:'b'.repeat(64),bytes:120,reviewStatus:'unreviewed',status:'candidate-unverified'};
test('valid candidate stays unverified',()=>{
 const result=validateTrustedManifestCandidate(candidate,expected);
 assert.equal(result.status,'candidate-unverified');
 assert.equal(Object.isFrozen(result),true);
});
test('rejects forged, stale and unsafe candidates',()=>{
 for(const change of [
 {assignmentId:'assignment_999'}, {resourceId:'other-resource'}, {resourceVersion:'v2'},
 {contentSha256:'invalid'}, {sourceCommit:'main'}, {resourceUrl:'../private.html'},
 {resourceUrl:'/root.html'}, {bytes:0}, {status:'trusted'}, {reviewStatus:'approved'}
 ]) assert.throws(()=>validateTrustedManifestCandidate({...candidate,...change},expected));
});
