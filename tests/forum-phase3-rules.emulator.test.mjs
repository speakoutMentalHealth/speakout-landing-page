import { after, before, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, writeBatch, serverTimestamp } from "firebase/firestore";

const rules = readFileSync(new URL("../firebase/firestore.rules", import.meta.url), "utf8");
let env;
const account = (uid, role="volunteer") => ({uid, status:"approved", approved:true, role, email:uid+"@example.test"});
const grant = (uid, extra={}) => ({
  uid, active:true, adultVerified:true, memberRole:"member", privateRoomIds:[], moderatedRoomIds:[], ...extra
});
const baseRoom = { title:"Small adult pilot", description:"Real moderated pilot for verified adults",
  visibility:"private", status:"open", published:false, version:1, auditId:"audit-setup-0001", updatedBy:"admin-pilot" };
const client = uid => env.authenticatedContext(uid).firestore();
const path = (db,collection,id) => doc(db,collection,id);
async function seed(name,value) {
  await env.withSecurityRulesDisabled(async ctx => setDoc(doc(ctx.firestore(),name),value));
}
async function gate(expiresAt = new Date(Date.now()+3600000)) {
  await seed("forumReleaseControls/pilot",{enabled:true,mode:"private_pilot",roomIds:["test-private"],expiresAt});
}
async function publish(db, status="open") {
  const batch=writeBatch(db);
  batch.update(path(db,"forumRooms","test-private"),{
    published:true,status,updatedAt:serverTimestamp(),updatedBy:"admin-pilot",
    auditId:"audit-publish-0002",version:2
  });
  batch.set(path(db,"forumRoomAudits","audit-publish-0002"),{
    roomId:"test-private", actorUid:"admin-pilot",
    previousVisibility:"private",nextVisibility:"private",
    previousStatus:"open",nextStatus:status,
    previousPublished:false,nextPublished:true,revision:2,
    reason:"Explicit private pilot release",changedAt:serverTimestamp()
  });
  return batch.commit();
}
before(async()=>{
  env=await initializeTestEnvironment({projectId:"demo-speakout-rules",firestore:{rules}});
});
beforeEach(async()=>{
  await env.clearFirestore();
  await seed("users/admin-pilot",account("admin-pilot","admin"));
  await seed("users/adult-pilot",account("adult-pilot"));
  await seed("users/outsider",account("outsider"));
  await seed("users/teen-pilot",account("teen-pilot","student"));
  await seed("users/mod-pilot",account("mod-pilot"));
  await seed("forumAccessGrants/adult-pilot",grant("adult-pilot",{privateRoomIds:["test-private"]}));
  await seed("forumAccessGrants/outsider",grant("outsider"));
  await seed("forumAccessGrants/teen-pilot",grant("teen-pilot",{privateRoomIds:["test-private"]}));
  await seed("forumAccessGrants/mod-pilot",grant("mod-pilot",{memberRole:"moderator",moderatedRoomIds:["test-private"]}));
  await seed("forumRooms/test-private",{
    ...baseRoom,createdAt:new Date(),updatedAt:new Date()
  });
  await seed("forumTopics/sample-topic",{
    roomId:"test-private",title:"How to develop ICT skills?",
    body:"Useful resources for verified adult members.",authorUid:"adult-pilot",
    moderationStatus:"approved",moderationAuditId:"none",createdAt:new Date(),updatedAt:new Date()
  });
});
after(async()=>env.cleanup());

test("no user, even admin, can provision the trusted pilot gate via Firestore rules",async()=>{
  const db=client("admin-pilot");
  await assertFails(setDoc(path(db,"forumReleaseControls","pilot"),{
    enabled:true,mode:"private_pilot",roomIds:["test-private"],expiresAt:new Date(Date.now()+3600000)
  }));
  await assertFails(publish(db));
  await assertFails(getDoc(path(client("adult-pilot"),"forumRooms","test-private")));
  await assertFails(getDoc(path(client("mod-pilot"),"forumTopics","sample-topic")));
});
test("private pilot requires approved adult grant and active gate; rejects public, anonymous and teen access",async()=>{
  await gate();
  await assertSucceeds(publish(client("admin-pilot")));
  await assertSucceeds(getDoc(path(client("adult-pilot"),"forumRooms","test-private")));
  await assertSucceeds(getDoc(path(client("mod-pilot"),"forumRooms","test-private")));
  await assertSucceeds(getDoc(path(client("adult-pilot"),"forumTopics","sample-topic")));
  for(const db of [client("outsider"),client("teen-pilot"),env.unauthenticatedContext().firestore()]){
    await assertFails(getDoc(path(db,"forumRooms","test-private")));
    await assertFails(getDoc(path(db,"forumTopics","sample-topic")));
  }
  await assertFails(updateDoc(path(client("adult-pilot"),"forumRooms","test-private"),{published:false}));
});
test("expired trusted gate immediately closes adult/member access and new posts",async()=>{
  await gate(new Date(Date.now()-60000));
  await assertFails(publish(client("admin-pilot")));
  await assertFails(getDoc(path(client("adult-pilot"),"forumRooms","test-private")));
  await assertFails(setDoc(path(client("adult-pilot"),"forumTopics","not-live"),{
    roomId:"test-private",title:"New live post",body:"This may not become live.",
    authorUid:"adult-pilot",moderationStatus:"pending",moderationAuditId:"none",
    createdAt:serverTimestamp(),updatedAt:serverTimestamp()
  }));
});
test("even with gate, published public rooms and forged report targets remain denied",async()=>{
  await gate();
  const db=client("admin-pilot");
  const batch=writeBatch(db);
  batch.update(path(db,"forumRooms","test-private"),{
    visibility:"public",published:true,status:"open",updatedAt:serverTimestamp(),
    updatedBy:"admin-pilot",version:2,auditId:"audit-unsafe-0002"
  });
  batch.set(path(db,"forumRoomAudits","audit-unsafe-0002"),{
    roomId:"test-private",actorUid:"admin-pilot",previousVisibility:"private",
    nextVisibility:"public",previousStatus:"open",nextStatus:"open",
    previousPublished:false,nextPublished:true,revision:2,
    reason:"Attempted unsafe public rollout",changedAt:serverTimestamp()
  });
  await assertFails(batch.commit());
  await assertSucceeds(publish(db));
  const adult=client("adult-pilot");
  const report = (id,roomId,targetId) => setDoc(path(adult,"forumReports",id),{
    roomId,targetType:"topic",targetId,reporterUid:"adult-pilot",
    reason:"spam",createdAt:serverTimestamp()
  });
  await assertFails(report("adult-pilot__topic__fake-target","test-private","fake-target"));
  await assertFails(report("adult-pilot__topic__sample-topic","not-real","sample-topic"));
  await assertSucceeds(report("adult-pilot__topic__sample-topic","test-private","sample-topic"));
  await assertFails(report("adult-pilot__topic__sample-topic","test-private","sample-topic"));
});
test("verified adults submit pending topics but cannot approve themselves",async()=>{
  await gate();await assertSucceeds(publish(client("admin-pilot")));
  const db=client("adult-pilot");
  const ref=path(db,"forumTopics","pilot-topic");
  await assertSucceeds(setDoc(ref,{
    roomId:"test-private",title:"A useful adult learning topic",body:"Please review this new submission.",
    authorUid:"adult-pilot",moderationStatus:"pending",moderationAuditId:"none",
    createdAt:serverTimestamp(),updatedAt:serverTimestamp()
  }));
  await assertFails(getDoc(ref));
  await assertSucceeds(getDoc(path(client("mod-pilot"),"forumTopics","pilot-topic")));
  await assertFails(updateDoc(ref,{moderationStatus:"approved"}));
  const mod=client("mod-pilot"),batch=writeBatch(mod);
  batch.update(path(mod,"forumTopics","pilot-topic"),{
    moderationStatus:"approved",moderationAuditId:"review-pilot-topic",updatedAt:serverTimestamp()
  });
  batch.set(path(mod,"forumModerationAudits","review-pilot-topic"),{
    kind:"topic",itemId:"pilot-topic",roomId:"test-private",actorUid:"mod-pilot",
    previousStatus:"pending",nextStatus:"approved",changedAt:serverTimestamp(),
    reason:"Helpful and compliant adult topic"
  });
  await assertSucceeds(batch.commit());
  await assertSucceeds(getDoc(ref));
});
test("a locked or unpublished pilot room hides its content even from delegated moderators",async()=>{
  await gate();await assertSucceeds(publish(client("admin-pilot")));
  const admin=client("admin-pilot"),batch=writeBatch(admin);
  batch.update(path(admin,"forumRooms","test-private"),{
    status:"locked",published:false,updatedAt:serverTimestamp(),
    updatedBy:"admin-pilot",version:3,auditId:"audit-lock-0003"
  });
  batch.set(path(admin,"forumRoomAudits","audit-lock-0003"),{
    roomId:"test-private",actorUid:"admin-pilot",
    previousVisibility:"private",nextVisibility:"private",
    previousStatus:"open",nextStatus:"locked",
    previousPublished:true,nextPublished:false,revision:3,
    reason:"Close after private test session",changedAt:serverTimestamp()
  });
  await assertSucceeds(batch.commit());
  await assertFails(getDoc(path(client("adult-pilot"),"forumTopics","sample-topic")));
  await assertFails(getDoc(path(client("mod-pilot"),"forumTopics","sample-topic")));
});
