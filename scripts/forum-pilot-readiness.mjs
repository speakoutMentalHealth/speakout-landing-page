#!/usr/bin/env node
/** Read-only production pilot readiness inventory. Never reads discussion contents or user PII. */
import { randomUUID } from "node:crypto";
import { initializeApp, applicationDefault, deleteApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
const project = "speaakout-portal";
const roomId = "adult-pilot";
const app=initializeApp({credential:applicationDefault(),projectId:project},"pilot-readiness-"+randomUUID());
const db=getFirestore(app);
try {
  const [room,gate,memberDocs,moderatorDocs] = await Promise.all([
    db.collection("forumRooms").doc(roomId).get(),
    db.collection("forumReleaseControls").doc("pilot").get(),
    db.collection("forumAccessGrants").where("privateRoomIds","array-contains",roomId).get(),
    db.collection("forumAccessGrants").where("moderatedRoomIds","array-contains",roomId).get()
  ]);
  async function eligible(record) {
    const v=record.data();
    if (v.active !== true || v.adultVerified !== true) return false;
    const profile=await db.collection("users").doc(record.id).get();
    return profile.exists && profile.get("status")==="approved" && profile.get("role")!=="student";
  }
  let memberCount=0,modCount=0;
  for (const record of memberDocs.docs) if(await eligible(record))memberCount++;
  for (const record of moderatorDocs.docs) if(record.get("memberRole")==="moderator" && await eligible(record))modCount++;
  const data=gate.exists?gate.data():{};
  const expiresAt=data?.expiresAt?.toDate?.();
  const gateActive=data?.enabled===true &&
    Array.isArray(data.roomIds) && data.roomIds.includes(roomId) &&
    expiresAt instanceof Date && expiresAt.getTime()>Date.now();
  const roomPrivate=room.exists && room.get("visibility")==="private";
  const roomReady=roomPrivate && ["open","read_only"].includes(room.get("status"));
  const published=room.exists && room.get("published")===true;
  const results={
    project, roomId, roomExists:room.exists, privateRoomReady:roomReady,
    roomPublished:published, approvedVerifiedAdultMembers:memberCount,
    assignedApprovedAdultModerators:modCount, productionGateActive:gateActive,
    productionGateExpiresAt: gateActive?expiresAt.toISOString():null,
    eligibilityReady:roomReady && memberCount>=1 && modCount>=1,
    liveRoomReady:roomReady && published && memberCount>=1 && modCount>=1 && gateActive
  };
  console.log("FORUM_PRIVATE_PILOT_READINESS "+JSON.stringify(results));
  const summary=[
    "## SpeakOut adult volunteer pilot — production read-only inspection",
    "| Condition | Result |","|---|---|",
    ...[
      ["Private adult-pilot room",roomReady],["At least one verified approved member",memberCount>=1],
      ["At least one verified assigned moderator",modCount>=1],
      ["Trusted live pilot gate",gateActive],["Room published",published]
    ].map(([label,ok])=>`| ${label} | ${ok?"Ready":"Not ready"} |`),
    "",
    `**Live private pilot:** ${results.liveRoomReady?"ACTIVE":"NOT ACTIVE"}`,
    "A second moderator/backup, operational escalation review, and real-browser checks still require human confirmation."
  ].join("\n");
  if(process.env.GITHUB_STEP_SUMMARY) {
    const fs=await import("node:fs/promises");
    await fs.appendFile(process.env.GITHUB_STEP_SUMMARY,summary+"\n");
  }
}finally{await deleteApp(app);}
