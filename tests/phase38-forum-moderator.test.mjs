import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
const read = p => readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("delegated moderator workspace has private-account and per-room protections",()=>{
 const html=read("forum-moderator.html"),script=read("js/forum-moderator.js");
 const rules=read("firebase/firestore.rules");
 const index=JSON.parse(read("firebase/forum-firestore.indexes.json"));
 for(const id of ["workspace","roomChoice","topics","replies","reports","refresh","status"]) {
   assert.match(html,new RegExp('id="'+id+'"'));
 }
 assert.match(html,/noindex,nofollow/);
 assert.match(html,/Restricted to individually approved adult moderators/);
 assert.match(script,/g\.adultVerified !== true/);
 assert.match(script,/g\.memberRole !== "moderator"/);
 assert.match(script,/where\("roomId", "==", roomId\)/);
 assert.match(script,/where\("moderationStatus", "==", "pending"\)/);
 assert.match(script,/data\.roomId !== selectedRoom\(\)/);
 assert.match(script,/writeBatch\(db\)/);
 assert.match(script,/forumModerationAudits/);
 assert.match(script,/getDoc\(doc\(db, "forumRooms", id\)\)/);
 assert.doesNotMatch(script,/innerHTML\s*=/);
 assert.match(rules,/forumMayModerate\(roomId\)/);
 assert.match(rules,/forumLivePrivateRoom\(roomId\)/);
 assert(index.indexes.some(i=>i.collectionGroup==="forumReplies" &&
   i.fields.length===2 && i.fields[0].fieldPath==="roomId" &&
   i.fields[1].fieldPath==="moderationStatus"));
});
test("forum links to moderator workspace but room publication remains separately gated",()=>{
 assert.match(read("forum.html"),/href="forum-moderator\.html"/);
 const rules=read("firebase/firestore.rules");
 assert.match(rules,/match \/forumReleaseControls\/\{releaseId\}/);
 assert.match(rules,/allow list, create, update, delete: if false/);
 assert.match(read("js/forum-moderator.js"),/room\.data\(\)\.published !== true/);
});

test("delegated moderator browser module parses as valid JavaScript",()=>{
 const filename=new URL("../js/forum-moderator.js",import.meta.url).pathname;
 const result=spawnSync(process.execPath,["--check",filename],{encoding:"utf8",timeout:10000});
 assert.equal(result.status,0,result.stderr);
});
