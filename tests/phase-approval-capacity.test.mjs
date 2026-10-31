import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {firestoreFailure} from '../workers/platform-api/src/firestore-error.js';
test('capacity diagnostics retain structured quota reason and omit provider message and identities',()=>{
 const result=firestoreFailure({error:{status:'RESOURCE_EXHAUSTED',message:'SECRET bearer token',details:[{'@type':'type.googleapis.com/google.rpc.ErrorInfo',reason:'RATE_LIMIT_EXCEEDED',metadata:{quota_metric:'firestore.googleapis.com/read_requests',quota_limit:'ReadRequestsPerMinute',consumer:'secret@example.test'}}]}});
 assert.equal(result.reason,'RATE_LIMIT_EXCEEDED');assert.equal(result.status,'RESOURCE_EXHAUSTED');assert.equal(result.quotaLimit,'ReadRequestsPerMinute');assert.doesNotMatch(JSON.stringify(result),/SECRET|secret@|bearer/);
 assert.equal(firestoreFailure({error:{status:'arbitrary secret text'}}).status,'unavailable');
});
test('approval probe uses canonical authenticated guard without dashboard expansion or quota bypass',()=>{
 const worker=readFileSync(new URL('../workers/platform-api/src/index.js',import.meta.url),'utf8');
 assert.match(worker,/let user = await authenticatedUser\(request, env\);\s*\/\/[^\n]*\n\s*if \(path === "\/v1\/auth\/approval-check"\) return \{approved:true,role:clean\(user.profile.role\)\}/);
 const browser=readFileSync(new URL('./approval-state-browser.mjs',import.meta.url),'utf8');
 assert.match(browser,/const path = "\/v1\/auth\/approval-check"/);assert.match(browser,/apiResponse.status===429/);assert.match(browser,/no automatic retry/);assert.match(browser,/apiResponse.status, 403/);
});

test('worker diagnostics also handle streamed query errors without exposing payloads',()=>{
 const result=firestoreFailure([{error:{status:'RESOURCE_EXHAUSTED',message:'SECRET'}}]);
 assert.equal(result.status,'RESOURCE_EXHAUSTED');
 assert.doesNotMatch(JSON.stringify(result),/SECRET/);
});
