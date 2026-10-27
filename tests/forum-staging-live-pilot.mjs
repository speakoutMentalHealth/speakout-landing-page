/**
 * REAL staging-only forum pilot acceptance, manually run after staging index
 * readiness and existing shared-staging Firestore capacity preflight.
 *
 * Uses unique synthetic Firebase Authentication users and genuine Firestore
 * client SDK calls evaluated against deployed staging security rules.
 * No production references, personal data, or real forum members.
 * Writes a short-lived private release gate under privileged STAGING service
 * account, exercises posting/approval/reporting and closes the gate before
 * deleting every synthetic record and user. NO automatic retries.
 */
import assert from "node:assert/strict";
import { createSign, randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import {
  getFirestore, collection, doc, getDoc, getDocs, query, where,
  setDoc, writeBatch, serverTimestamp
} from "firebase/firestore";

const project="speakout-portal-staging";
const apiKey="AIzaSyAfe0T3E__vQBxZKQHpoiABrSXOfXkh7FA";
const credentialsPath=process.env.FIREBASE_SERVICE_ACCOUNT_FILE;
if (!credentialsPath) throw Error("FIREBASE_SERVICE_ACCOUNT_FILE required. Staging only.");
const account=JSON.parse(await readFile(credentialsPath,"utf8"));
assert.equal(account.project_id,project,"PRODUCTION CREDENTIALS REFUSED");
if (process.env.FORUM_STAGING_PILOT_ACK!=="SYNTHETIC_STAGING_ONLY") {
  throw Error("Explicit FORUM_STAGING_PILOT_ACK=SYNTHETIC_STAGING_ONLY is required.");
}
if(process.env.FIRESTORE_EMULATOR_HOST||process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  throw Error("This acceptance must test real staging; emulator environment not permitted.");
}
const suffix=randomBytes(5).toString("hex");
const roomId="forum-stage-"+suffix;
const auditId="forum-stage-publish-"+suffix;
const lockId="forum-stage-lock-"+suffix;
const authBase="https://identitytoolkit.googleapis.com/v1/accounts:";
const base="https://firestore.googleapis.com/v1/projects/"+project+"/databases/(default)/documents";
const password="Stage-"+randomBytes(18).toString("base64url")+"A!";
const actors=[];
const apps=[];
const paths=new Set();
let serviceToken="",priorGate=null,hasPriorGate=false,gateOwned=false;
let completed=false;

const asBase64=value=>Buffer.from(JSON.stringify(value)).toString("base64url");
async function tokenForService() {
  const now=Math.floor(Date.now()/1000);
  const claims={
    iss:account.client_email,sub:account.client_email,
    aud:"https://oauth2.googleapis.com/token",
    scope:"https://www.googleapis.com/auth/datastore",
    iat:now,exp:now+1800
  };
  const unsigned=asBase64({alg:"RS256",typ:"JWT"})+"."+asBase64(claims);
  const signer=createSign("RSA-SHA256");
  signer.update(unsigned);
  const assertion=unsigned+"."+signer.sign(account.private_key).toString("base64url");
  const response=await fetch("https://oauth2.googleapis.com/token",{
    method:"POST",
    headers:{"content-type":"application/x-www-form-urlencoded"},
    body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion}),
    signal:AbortSignal.timeout(18000)
  });
  if(!response.ok)throw Error("Staging service OAuth failed HTTP "+response.status);
  return (await response.json()).access_token;
}
function encode(x) {
  if(x instanceof Date)return{timestampValue:x.toISOString()};
  if(x===null)return{nullValue:null};
  if(Array.isArray(x))return{arrayValue:{values:x.map(encode)}};
  if(typeof x==="string")return{stringValue:x};
  if(typeof x==="boolean")return{booleanValue:x};
  if(typeof x==="number")return Number.isInteger(x)?{integerValue:String(x)}:{doubleValue:x};
  if(typeof x==="object")return{mapValue:{fields:encodeFields(x)}};
  throw Error("Unexpected Firestore payload type");
}
const encodeFields=x=>Object.fromEntries(Object.entries(x).map(([k,v])=>[k,encode(v)]));
function decode(v) {
  if(!v)return null;
  if(v.timestampValue)return new Date(v.timestampValue);
  if(v.stringValue!==undefined)return v.stringValue;
  if(v.booleanValue!==undefined)return v.booleanValue;
  if(v.integerValue!==undefined)return Number(v.integerValue);
  if(v.doubleValue!==undefined)return v.doubleValue;
  if(v.arrayValue)return(v.arrayValue.values||[]).map(decode);
  if(v.mapValue)return decodeFields(v.mapValue.fields);
  return null;
}
const decodeFields=fields=>Object.fromEntries(Object.entries(fields||{}).map(([k,v])=>[k,decode(v)]));
async function adminRequest(path,method="GET",data=null) {
  const response=await fetch(base+"/"+path,{
    method,
    headers:{authorization:"Bearer "+serviceToken,"content-type":"application/json"},
    body:data!==null?JSON.stringify({fields:encodeFields(data)}):undefined,
    signal:AbortSignal.timeout(20000)
  });
  if(response.status===429)throw Error("Staging capacity exhausted (HTTP 429). Do not rerun until daily reset.");
  const result=await response.json().catch(()=>({}));
  if(!response.ok&&!(method==="GET"&&response.status===404)) {
    throw Error("Staging Firestore admin "+method+" HTTP "+response.status+" for "+path);
  }
  return {ok:response.ok,status:response.status,data:decodeFields(result.fields)};
}
async function put(path,data) {
  paths.add(path);
  return adminRequest(path,"PATCH",data);
}
async function callIdentity(operation,data) {
  const response=await fetch(authBase+operation+"?key="+apiKey,{
    method:"POST",headers:{"content-type":"application/json"},
    body:JSON.stringify(data),signal:AbortSignal.timeout(18000)
  });
  if(response.status===429)throw Error("Staging Firebase Auth capacity exhausted. No retries permitted.");
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw Error("Staging Authentication "+operation+" HTTP "+response.status);
  return result;
}
async function actor(name,role,privateRoomIds=[],moderatedRoomIds=[]) {
  const email="forum."+name+"."+suffix+"@example.test";
  const signup=await callIdentity("signUp",{email,password,returnSecureToken:true});
  actors.push({name,uid:signup.localId,idToken:signup.idToken,email});
  const uid=signup.localId;
  await put("users/"+uid,{uid,email,status:"approved",approved:true,role});
  if(name!=="outsider" && name!=="teen") {
    await put("forumAccessGrants/"+uid,{
      uid,active:true,adultVerified:true,
      memberRole:name==="moderator"?"moderator":"member",
      privateRoomIds,moderatedRoomIds,
      createdAt:new Date(),reviewedAt:new Date(),reviewedBy:"staging-script",
      reason:"Synthetic staging-only access",version:1,auditId:"test-grant-"+suffix+"-"+name
    });
  }
  const app=initializeApp({
    apiKey,authDomain:project+".firebaseapp.com",projectId:project
  },"forum-pilot-"+name+"-"+suffix);
  apps.push(app);
  const auth=getAuth(app);
  await signInWithEmailAndPassword(auth,email,password);
  const db=getFirestore(app);
  assert.equal(auth.currentUser?.uid,uid);
  return {uid,name,db,auth};
}
async function expectDenied(promise,label) {
  let denied=false;
  try{await promise;}catch(e) {
    denied=true;
    if(!["permission-denied","unauthenticated","not-found"].includes(e?.code)) {
      throw Error(label+" failed unexpectedly: "+(e?.code||e?.message||e));
    }
  }
  assert(denied,label+" unexpectedly allowed");
}
async function adminGate(data) {
  const path="forumReleaseControls/pilot";
  const response=await adminRequest(path,"PATCH",data);
  if(!response.ok)throw Error("Could not update staging private pilot gate");
  return response;
}
async function runTest(){
  serviceToken=await tokenForService();
  const gate=await adminRequest("forumReleaseControls/pilot");
  hasPriorGate=gate.ok;
  priorGate=gate.ok?gate.data:null;
  if(gate.ok && gate.data.enabled===true) {
    throw Error("Another private pilot gate already exists in shared staging. Refusing to replace it.");
  }
  const admin=await actor("admin","admin");
  const adult=await actor("adult","volunteer",[roomId]);
  const mod=await actor("moderator","volunteer",[],[roomId]);
  const outsider=await actor("outsider","volunteer");
  const teen=await actor("teen","student");
  assert(actors.every(x=>x.email.endsWith("@example.test")));
  await put("forumRooms/"+roomId,{
    title:"Synthetic adult pilot "+suffix,
    description:"Temporary private staging acceptance; do not invite real members",
    visibility:"private",status:"open",published:false,
    version:1,auditId:"test-room-"+suffix,createdAt:new Date(),
    updatedAt:new Date(),updatedBy:admin.uid
  });
  const gateData={enabled:true,mode:"private_pilot",roomIds:[roomId],
    expiresAt:new Date(Date.now()+12*60*1000),runTag:suffix};
  // The release gate is created only by the privileged staging service token;
  // browser accounts cannot provision or alter it under the real rules.
  await adminGate(gateData);gateOwned=true;
  await expectDenied(setDoc(doc(adult.db,"forumReleaseControls","pilot"),gateData),
    "Adult client gate tampering");
  const publish=writeBatch(admin.db);
  publish.update(doc(admin.db,"forumRooms",roomId),{
    published:true,status:"open",version:2,auditId:auditId,
    updatedAt:serverTimestamp(),updatedBy:admin.uid
  });
  publish.set(doc(admin.db,"forumRoomAudits",auditId),{
    roomId,actorUid:admin.uid,
    previousVisibility:"private",nextVisibility:"private",
    previousStatus:"open",nextStatus:"open",
    previousPublished:false,nextPublished:true,revision:2,
    reason:"Synthetic staging private pilot authorization",
    changedAt:serverTimestamp()
  });
  paths.add("forumRoomAudits/"+auditId);
  await publish.commit();
  assert((await getDoc(doc(adult.db,"forumRooms",roomId))).exists());
  assert((await getDoc(doc(mod.db,"forumRooms",roomId))).exists());
  for(const [who,actorDb] of [["outsider",outsider.db],["student",teen.db]]) {
    await expectDenied(getDoc(doc(actorDb,"forumRooms",roomId)),who+" private room access");
  }
  const topicId="stage-topic-"+suffix;
  const topicRef=doc(adult.db,"forumTopics",topicId);
  paths.add("forumTopics/"+topicId);
  await setDoc(topicRef,{
    roomId,title:"Synthetic forum pilot test",
    body:"A safe fictional example requiring moderator review.",
    authorUid:adult.uid,moderationStatus:"pending",
    moderationAuditId:"none",createdAt:serverTimestamp(),updatedAt:serverTimestamp()
  });
  await expectDenied(getDoc(topicRef),"Adult pending discussion read");
  const pending=await getDocs(query(collection(mod.db,"forumTopics"),
    where("roomId","==",roomId),where("moderationStatus","==","pending")));
  assert.equal(pending.docs.length,1,"Moderator did not receive staging pending topic");
  const reviewId="stage-review-"+suffix;
  const approval=writeBatch(mod.db);
  approval.update(doc(mod.db,"forumTopics",topicId),{
    moderationStatus:"approved",moderationAuditId:reviewId,
    updatedAt:serverTimestamp()
  });
  approval.set(doc(mod.db,"forumModerationAudits",reviewId),{
    kind:"topic",itemId:topicId,roomId,
    actorUid:mod.uid,previousStatus:"pending",nextStatus:"approved",
    reason:"Synthetic helpful discussion approved",
    changedAt:serverTimestamp()
  });
  paths.add("forumModerationAudits/"+reviewId);
  await approval.commit();
  assert.equal((await getDoc(topicRef)).data().moderationStatus,"approved");
  const approved=await getDocs(query(collection(adult.db,"forumTopics"),
    where("roomId","==",roomId),where("moderationStatus","==","approved")));
  assert.equal(approved.docs.length,1,"Member-approved-discussion query returned no content");
  const replyId="stage-reply-"+suffix;
  const replyRef=doc(adult.db,"forumReplies",replyId);
  paths.add("forumReplies/"+replyId);
  await setDoc(replyRef,{
    roomId,topicId,body:"Synthetic reply awaiting review.",
    authorUid:adult.uid,moderationStatus:"pending",
    moderationAuditId:"none",createdAt:serverTimestamp(),updatedAt:serverTimestamp()
  });
  await expectDenied(getDoc(replyRef),"Adult pending reply read");
  const pendingReplies=await getDocs(query(collection(mod.db,"forumReplies"),
    where("roomId","==",roomId),where("moderationStatus","==","pending")));
  assert.equal(pendingReplies.docs.length,1,"Moderator reply queue failed");
  const approvalReply="stage-review-reply-"+suffix;
  const approveReply=writeBatch(mod.db);
  approveReply.update(doc(mod.db,"forumReplies",replyId),{
    moderationStatus:"approved",moderationAuditId:approvalReply,
    updatedAt:serverTimestamp()
  });
  approveReply.set(doc(mod.db,"forumModerationAudits",approvalReply),{
    kind:"reply",itemId:replyId,roomId,
    actorUid:mod.uid,previousStatus:"pending",nextStatus:"approved",
    reason:"Synthetic safe reply approved",
    changedAt:serverTimestamp()
  });
  paths.add("forumModerationAudits/"+approvalReply);
  await approveReply.commit();
  assert.equal((await getDoc(replyRef)).data().moderationStatus,"approved");
  const replies=await getDocs(query(collection(adult.db,"forumReplies"),
    where("roomId","==",roomId),where("topicId","==",topicId),
    where("moderationStatus","==","approved")));
  assert.equal(replies.docs.length,1,"Member-approved-reply query failed");
  const reportId=adult.uid+"__topic__"+topicId;
  paths.add("forumReports/"+reportId);
  await setDoc(doc(adult.db,"forumReports",reportId),{
    roomId,targetType:"topic",targetId:topicId,
    reporterUid:adult.uid,reason:"privacy",createdAt:serverTimestamp()
  });
  const reports=await getDocs(query(collection(mod.db,"forumReports"),
    where("roomId","==",roomId)));
  assert.equal(reports.docs.length,1,"Moderator room report queue failed");
  const close=writeBatch(admin.db);
  close.update(doc(admin.db,"forumRooms",roomId),{
    published:false,status:"locked",version:3,auditId:lockId,
    updatedAt:serverTimestamp(),updatedBy:admin.uid
  });
  close.set(doc(admin.db,"forumRoomAudits",lockId),{
    roomId,actorUid:admin.uid,
    previousVisibility:"private",nextVisibility:"private",
    previousStatus:"open",nextStatus:"locked",
    previousPublished:true,nextPublished:false,revision:3,
    reason:"Synthetic staging pilot shutdown",
    changedAt:serverTimestamp()
  });
  paths.add("forumRoomAudits/"+lockId);
  await close.commit();
  await expectDenied(getDoc(topicRef),"Room lock must revoke member topic read");
  await expectDenied(getDoc(doc(mod.db,"forumRooms",roomId)),
    "Room lock must revoke moderator access");
  completed=true;
  console.log(JSON.stringify({status:"PASS",project,syntheticOnly:true,room:roomId,
    verifiedAdult:true,moderation:true,replies:true,reports:true,
    deniedOutsider:true,deniedStudent:true,gate:"temporary",locked:true}));
}
async function cleanup(){
  const errors=[];
  const record=async (label,operation)=>{
    try{await operation();}catch(e){errors.push(label+": "+String(e?.message||e).slice(0,120));}
  };
  // Fail closed immediately. Never disable or replace a gate that a different
  // operator took over while this test was running.
  if(gateOwned){
    await record("gate shutdown",async()=>{
      const existing=await adminRequest("forumReleaseControls/pilot");
      if(existing.ok && existing.data.runTag!==suffix)
        throw Error("Release gate ownership changed; do not overwrite another operator.");
      if(existing.ok)await adminGate({...existing.data,enabled:false,roomIds:[],expiresAt:new Date()});
    });
  }
  // Delete only exact synthetic ID paths created in this run. No collection
  // queries or shared school/community dataset cleanup.
  if(serviceToken){
    for(const path of [...paths].reverse()){
      await record("delete "+path,async()=>{
        const response=await fetch(base+"/"+path,{method:"DELETE",
          headers:{authorization:"Bearer "+serviceToken},signal:AbortSignal.timeout(18000)});
        if(!response.ok&&response.status!==404)
          throw Error("HTTP "+response.status);
      });
    }
    if(gateOwned){
      await record("restore prior disabled gate",async()=>{
        const current=await adminRequest("forumReleaseControls/pilot");
        if(!current.ok||current.data.runTag!==suffix)
          throw Error("Current gate ownership changed; manual cleanup needed.");
        if(hasPriorGate)await adminGate(priorGate);
        else {
          const result=await fetch(base+"/forumReleaseControls/pilot",{
            method:"DELETE",headers:{authorization:"Bearer "+serviceToken},signal:AbortSignal.timeout(15000)});
          if(!result.ok&&result.status!==404)throw Error("HTTP "+result.status);
        }
      });
    }
  }
  for(const app of apps){
    await record("firebase client disposal",async()=>{
      const auth=getAuth(app);
      if(auth.currentUser)await signOut(auth);
      await deleteApp(app);
    });
  }
  for(const person of actors){
    await record("remove synthetic user "+person.name,async()=>{
      await callIdentity("delete",{idToken:person.idToken});
    });
  }
  if(errors.length)throw Error("Staging cleanup INCOMPLETE: "+errors.join("; "));
  console.log("STAGING CLEANUP PASS: synthetic users and documents removed; gate restored.");
}
let failure;
try {
  await runTest();
}catch(error){
  failure=error;
  console.error("STAGING FORUM ACCEPTANCE FAILED:",error?.message||error);
}finally{
  try{await cleanup();}catch(error){
    console.error("STAGING CLEANUP FAILED:",error?.message||error);
    failure ||= error;
  }
}
if(!completed||failure)process.exitCode=1;
