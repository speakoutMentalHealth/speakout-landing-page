import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {createPinnedGitHubSourceLoader}=require('../functions/home-learning-pinned-source.js');
const commit='a'.repeat(40);
test('loads bytes from pinned allowlisted GitHub URL',async()=>{
 let requested;
 const loader=createPinnedGitHubSourceLoader({fetchImpl:async url=>{
  requested=url;
  return {ok:true,status:200,headers:{get:()=>null},arrayBuffer:async()=>Uint8Array.from([1,2,3]).buffer};
 }});
 assert.deepEqual(await loader({sourceCommit:commit,resourceUrl:'primary-home-learning-packs.html'}),Buffer.from([1,2,3]));
 assert.equal(requested,`https://raw.githubusercontent.com/speakoutMentalHealth/speakout-landing-page/${commit}/primary-home-learning-packs.html`);
});
test('rejects branch names, traversal, redirects and oversized content',async()=>{
 const loader=createPinnedGitHubSourceLoader({maxBytes:2,fetchImpl:async()=>({ok:true,status:200,headers:{get:()=>null},arrayBuffer:async()=>Uint8Array.from([1,2,3]).buffer})});
 for(const input of [{sourceCommit:'main',resourceUrl:'safe.html'},{sourceCommit:commit,resourceUrl:'../secrets.html'},{sourceCommit:commit,resourceUrl:'/safe.html'},{sourceCommit:commit,resourceUrl:'safe//file.html'}]){
  await assert.rejects(loader(input));
 }
 await assert.rejects(loader({sourceCommit:commit,resourceUrl:'safe.html'}));
 const redirected=createPinnedGitHubSourceLoader({fetchImpl:async()=>({ok:false,status:302})});
 await assert.rejects(redirected({sourceCommit:commit,resourceUrl:'safe.html'}));
 assert.throws(()=>createPinnedGitHubSourceLoader({repository:'attacker/repository'}));
});

test('only the canonical pinned catalogue JSON is allowed',async()=>{
 const paths=[];
 const loader=createPinnedGitHubSourceLoader({fetchImpl:async url=>{
  paths.push(url);
  return {ok:true,status:200,headers:{get:()=>null},
    arrayBuffer:async()=>Uint8Array.from([123,125]).buffer};
 }});
 const bytes=await loader({sourceCommit:commit,resourceUrl:'data/home-learning-catalog.json'});
 assert.deepEqual(bytes,Buffer.from('{}'));
 assert.equal(paths.length,1);
 assert.match(paths[0],/\/data\/home-learning-catalog\.json$/);
 await assert.rejects(loader({sourceCommit:commit,resourceUrl:'data/another.json'}));
 await assert.rejects(loader({sourceCommit:commit,resourceUrl:'data/..%2fhidden.json'}));
 assert.equal(paths.length,1);
});
