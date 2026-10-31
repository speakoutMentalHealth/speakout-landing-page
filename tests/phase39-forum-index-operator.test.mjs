import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
const file=new URL("../scripts/forum-indexes-additive.mjs",import.meta.url).pathname;
test("forum indexes operator offline plan never needs credentials or network",()=>{
 const r=spawnSync(process.execPath,[file],{encoding:"utf8",timeout:10000,env:{PATH:process.env.PATH}});
 assert.equal(r.status,0,r.stderr);
 const data=JSON.parse(r.stdout.trim());
 assert.equal(data.mode,"OFFLINE_PLAN");
 assert.equal(data.requiresCredentials,false);
 assert.equal(data.proposed.length,4);
});
test("additive index operator rejects apply without exact confirmation before making network calls",()=>{
 const r=spawnSync(process.execPath,[file,"--mode=apply","--project=staging-example"],{
  encoding:"utf8",timeout:10000,env:{PATH:process.env.PATH}
 });
 assert.notEqual(r.status,0);
 assert.match(r.stderr,/exact FORUM_INDEX_CONFIRM_PROJECT/);
});
test("operator cannot delete or replace Firestore indexes and index definitions cover moderator queries",()=>{
 const code=readFileSync(file,"utf8");
 assert.doesNotMatch(code,/method:\s*["']DELETE|request\([^)]*,\s*["']DELETE/);
 assert.doesNotMatch(code,/request\([^)]*,\s*["']PATCH/);
 assert.match(code,/const missing=\[\]/);
 assert.match(code,/mode==="inspect"/);
 assert.match(code,/mode==="apply"/);
 const config=JSON.parse(readFileSync(new URL("../firebase/forum-firestore.indexes.json",import.meta.url),"utf8"));
 assert(config.indexes.some(i=>i.collectionGroup==="forumReplies" &&
   i.fields.some(f=>f.fieldPath==="roomId") &&
   i.fields.some(f=>f.fieldPath==="moderationStatus") && i.fields.length===2));
});
