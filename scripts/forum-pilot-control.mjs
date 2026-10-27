#!/usr/bin/env node
/**
 * Trusted private Forum pilot authorization. NEVER exposed to browsers.
 * Dry-run is the default; --apply requires verified Google ADC credentials,
 * an exact target project/room confirmation and a short expiry.
 * The Firebase Admin SDK bypasses Firestore rules; restrict IAM accordingly.
 */
import { randomUUID } from "node:crypto";

function option(name, fallback = "") {
  const match = process.argv.find(arg => arg.startsWith("--" + name + "="));
  return match ? match.slice(name.length + 3) : fallback;
}
const apply = process.argv.includes("--apply");
const action = option("action", "enable");
const project = option("project");
const roomId = option("room");
const hours = Number(option("hours", "24"));
const reason = option("reason");
const actor = option("actor");
const validRoom = /^[a-z][a-z0-9-]{2,55}$/.test(roomId);
if(!["enable","disable"].includes(action) || !/^[a-z0-9-]{6,60}$/.test(project) ||
   !validRoom || !Number.isFinite(hours) || hours < 1 || hours > 72 ||
   reason.length < 15 || reason.length > 160 || actor.length < 5 || actor.length > 80) {
  console.error("Usage: node scripts/forum-pilot-control.mjs --project=YOUR_FIREBASE_PROJECT --room=ROOM_ID --action=enable|disable --hours=24 --actor=YOUR_ADMIN_ID --reason='Approved verified-adult pilot and moderation cover' [--apply]");
  process.exit(2);
}
const expiry = new Date(Date.now() + hours * 3600_000);
console.log(JSON.stringify({mode:apply?"APPLY":"DRY_RUN",project,roomId,action,expiresAt:expiry.toISOString(),reason,actor},null,2));
if(!apply) {
  console.log("No data changed. Add --apply after independent clinical/privacy and operational approval. A real verified-adult room and moderator must already exist.");
  process.exit(0);
}
if(process.env.FORUM_PILOT_CONFIRM_PROJECT !== project ||
   process.env.FORUM_PILOT_CONFIRM_ROOM !== roomId) {
  throw new Error("Refused: set FORUM_PILOT_CONFIRM_PROJECT and FORUM_PILOT_CONFIRM_ROOM to the exact intended values.");
}
if(project === "speaakout-portal" &&
   (option("production-ack") !== "PRIVATE_PILOT_ONLY" ||
    process.env.FORUM_PILOT_PRODUCTION_APPROVER !== actor)) {
  throw new Error("Refused production gate: explicit --production-ack=PRIVATE_PILOT_ONLY and matching FORUM_PILOT_PRODUCTION_APPROVER required.");
}
if(!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.GOOGLE_CLOUD_PROJECT) {
  throw new Error("Refused: configure privileged Google ADC credentials in a secure operator environment.");
}
let appSdk, storeSdk;
try{
  appSdk = await import("firebase-admin/app");
  storeSdk = await import("firebase-admin/firestore");
}catch{
  throw new Error("Install firebase-admin in the restricted operator environment first (npm install --no-save --package-lock=false firebase-admin).");
}
const app=appSdk.initializeApp({
  credential:appSdk.applicationDefault(),
  projectId:project
}, "forum-pilot-operator-"+randomUUID());
const db=storeSdk.getFirestore(app);
try{
  const room = await db.collection("forumRooms").doc(roomId).get();
  if(!room.exists)throw new Error("Room does not exist; create it unpublished through admin-forum.html.");
  if(room.get("visibility") !== "private")throw new Error("Pilot room must have PRIVATE visibility.");
  if(action === "enable" && !["open","read_only"].includes(room.get("status")))throw new Error("Room must be open or read-only before pilot gate.");
  const gateRef=db.collection("forumReleaseControls").doc("pilot");
  const previous=await gateRef.get();
  if(action === "disable" &&
     previous.exists && previous.get("enabled") === true &&
     !(previous.get("roomIds") || []).includes(roomId)) {
    throw new Error("Active release controls a different room. Refusing unintended cross-room shutdown.");
  }
  if(action === "enable") {
    if(previous.exists && previous.get("enabled") === true) {
      throw new Error("An active pilot gate already exists; disable the old gate and audit first.");
    }
    const [memberResult, moderatorResult] = await Promise.all([
      db.collection("forumAccessGrants").where("privateRoomIds","array-contains",roomId).get(),
      db.collection("forumAccessGrants").where("moderatedRoomIds","array-contains",roomId).get()
    ]);
    const eligible = async (record) => {
      const v=record.data();
      if(v.active!==true || v.adultVerified!==true)return false;
      const profile=await db.collection("users").doc(record.id).get();
      return profile.exists && profile.get("status")==="approved" && profile.get("role")!=="student";
    };
    let members=0,mods=0;
    for(const entry of memberResult.docs)if(await eligible(entry))members++;
    for(const entry of moderatorResult.docs){
      if(entry.get("memberRole")==="moderator" && await eligible(entry))mods++;
    }
    console.log(JSON.stringify({privateAdultMembers:members,assignedAdultModerators:mods}));
    if(members<1 || mods<1)throw new Error("At least one verified adult member and one assigned approved adult moderator required.");
  }
  const newValue = action === "enable"
    ? {enabled:true,mode:"private_pilot",roomIds:[roomId],expiresAt:storeSdk.Timestamp.fromDate(expiry)}
    : {enabled:false,mode:"private_pilot",roomIds:[],expiresAt:storeSdk.Timestamp.fromDate(new Date())};
  const auditRef=db.collection("forumReleaseControlAudits").doc(randomUUID());
  const batch=db.batch();
  batch.set(gateRef,newValue);
  batch.create(auditRef,{
    actorUid:actor,action,reason,projectId:project,roomId,
    previousEnabled:previous.exists && previous.get("enabled")===true,
    enabled:newValue.enabled,expiresAt:newValue.expiresAt,
    occurredAt:storeSdk.FieldValue.serverTimestamp()
  });
  await batch.commit();
  console.log("Trusted private pilot control "+action+" completed; audit "+auditRef.id);
  if(action==="enable")console.log("Room is still unpublished. An approved admin must separately use admin-forum.html to publish the authorized private room.");
}finally{
  await appSdk.deleteApp(app);
}
