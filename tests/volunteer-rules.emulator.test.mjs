import { before, after, beforeEach, test } from "node:test";
import { readFileSync } from "node:fs";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";

const projectId = "demo-speakout-volunteers";
let env;
const person = (uid,role,status="approved") => ({
  uid, role, email:uid+"@example.test", status, approved: status==="approved"
});
const intake = uid => ({
  userId:uid, city:"Keffi", state:"Nasarawa",
  availabilityDays:["Tuesday","Friday"], weeklyHours:"4-8",
  participationMode:"hybrid",
  focusAreas:["mental_health_education","research"],
  languages:"English, Hausa", experience:"Programmes and research",
  emailUpdates:true, whatsAppUpdates:false,
  safeguardingAcknowledged:true,
  submittedAt:serverTimestamp(), updatedAt:serverTimestamp(),
  reviewStage:"intake_received",assessmentStatus:"not_verified",
  safeguardingStatus:"pending",placementStatus:"not_assigned"
});
async function seed(id,role,status="approved"){
  await env.withSecurityRulesDisabled(async ctx=>{
    await setDoc(doc(ctx.firestore(),"users",id),person(id,role,status));
  });
}
before(async()=>{env=await initializeTestEnvironment({projectId,firestore:{rules:readFileSync(new URL("../firebase/firestore.rules",import.meta.url),"utf8")}})});
beforeEach(async()=>{await env.clearFirestore()});
after(async()=>{await env.cleanup()});

test("approved volunteers can submit their own intake, but not reviewer status",async()=>{
  await seed("volunteer-a","volunteer");
  const db=env.authenticatedContext("volunteer-a").firestore();
  const record=doc(db,"volunteerApplications","volunteer-a");
  await assertSucceeds(setDoc(record,intake("volunteer-a")));
  await assertFails(updateDoc(record,{assessmentStatus:"passed",updatedAt:serverTimestamp()}));
  await assertFails(updateDoc(record,{safeguardingStatus:"cleared",updatedAt:serverTimestamp()}));
  await assertFails(updateDoc(record,{placementStatus:"assigned",updatedAt:serverTimestamp()}));
  await assertFails(updateDoc(record,{reviewStage:"active",updatedAt:serverTimestamp()}));
  await assertFails(deleteDoc(record));
  await assertSucceeds(updateDoc(record,{weeklyHours:"9-12",updatedAt:serverTimestamp()}));
});
test("volunteer identity, approval and intake shape are enforced",async()=>{
  await seed("volunteer-a","volunteer");
  await seed("volunteer-b","volunteer");
  await seed("student-a","student");
  await seed("pending-a","volunteer","pending");
  const db=env.authenticatedContext("volunteer-a").firestore();
  await assertFails(setDoc(doc(db,"volunteerApplications","volunteer-b"),intake("volunteer-b")));
  await assertFails(setDoc(doc(db,"volunteerApplications","volunteer-a"),{...intake("volunteer-a"),reviewStage:"eligible"}));
  await assertFails(setDoc(doc(db,"volunteerApplications","volunteer-a"),{...intake("volunteer-a"),patientNotes:"private"}));
  await assertFails(setDoc(doc(db,"volunteerApplications","volunteer-a"),{...intake("volunteer-a"),availabilityDays:["Someday"]}));
  await assertFails(setDoc(doc(env.authenticatedContext("student-a").firestore(),"volunteerApplications","student-a"),intake("student-a")));
  await assertFails(setDoc(doc(env.authenticatedContext("pending-a").firestore(),"volunteerApplications","pending-a"),intake("pending-a")));
});
test("only owner and admins can read; admin may update review, not rewrite submitted intake",async()=>{
  await seed("volunteer-a","volunteer");
  await seed("volunteer-b","volunteer");
  await seed("admin-a","admin");
  const volDb=env.authenticatedContext("volunteer-a").firestore();
  const otherDb=env.authenticatedContext("volunteer-b").firestore();
  const adminDb=env.authenticatedContext("admin-a").firestore();
  await assertSucceeds(setDoc(doc(volDb,"volunteerApplications","volunteer-a"),intake("volunteer-a")));
  await assertSucceeds(getDoc(doc(volDb,"volunteerApplications","volunteer-a")));
  await assertFails(getDoc(doc(otherDb,"volunteerApplications","volunteer-a")));
  await assertSucceeds(getDoc(doc(adminDb,"volunteerApplications","volunteer-a")));
  await assertFails(updateDoc(doc(adminDb,"volunteerApplications","volunteer-a"),{city:"Other City",updatedAt:serverTimestamp()}));
  await assertSucceeds(updateDoc(doc(adminDb,"volunteerApplications","volunteer-a"),{
    reviewStage:"eligible",assessmentStatus:"passed",safeguardingStatus:"cleared",updatedAt:serverTimestamp()
  }));
  await assertSucceeds(updateDoc(doc(adminDb,"volunteerApplications","volunteer-a"),{
    reviewStage:"active",placementStatus:"assigned",updatedAt:serverTimestamp()
  }));
  await assertFails(deleteDoc(doc(adminDb,"volunteerApplications","volunteer-a")));
});
test("assignment and clearance changes cannot bypass coordinator gates",async()=>{
  await seed("volunteer-a","volunteer");
  await seed("admin-a","admin");
  const vdb=env.authenticatedContext("volunteer-a").firestore();
  const adb=env.authenticatedContext("admin-a").firestore();
  await assertSucceeds(setDoc(doc(vdb,"volunteerApplications","volunteer-a"),intake("volunteer-a")));
  await assertFails(updateDoc(doc(adb,"volunteerApplications","volunteer-a"),{reviewStage:"eligible",updatedAt:serverTimestamp()}));
  await assertFails(updateDoc(doc(adb,"volunteerApplications","volunteer-a"),{reviewStage:"active",placementStatus:"assigned",updatedAt:serverTimestamp()}));
  await assertFails(updateDoc(doc(adb,"volunteerApplications","volunteer-a"),{reviewStage:"intake_received",placementStatus:"assigned",updatedAt:serverTimestamp()}));
});


test("revocation blocks previously approved volunteers from reading or editing intake", async () => {
  await seed("volunteer-a", "volunteer");
  const db = env.authenticatedContext("volunteer-a").firestore();
  const record = doc(db, "volunteerApplications", "volunteer-a");
  await assertSucceeds(setDoc(record, intake("volunteer-a")));
  await env.withSecurityRulesDisabled(async ctx => {
    await updateDoc(doc(ctx.firestore(), "users", "volunteer-a"), {status:"revoked", approved:false});
  });
  await assertFails(getDoc(record));
  await assertFails(updateDoc(record, {weeklyHours:"9-12", updatedAt:serverTimestamp()}));
  await assertFails(setDoc(record, intake("volunteer-a")));
});

test("pending, rejected and suspended accounts cannot read existing intake", async () => {
  await seed("volunteer-a", "volunteer");
  const approved = env.authenticatedContext("volunteer-a").firestore();
  const record = doc(approved, "volunteerApplications", "volunteer-a");
  await assertSucceeds(setDoc(record, intake("volunteer-a")));
  for (const status of ["pending", "rejected", "suspended"]) {
    await env.withSecurityRulesDisabled(async ctx => {
      await updateDoc(doc(ctx.firestore(), "users", "volunteer-a"), {status, approved:false});
    });
    await assertFails(getDoc(record));
    await assertFails(updateDoc(record, {weeklyHours:"9-12", updatedAt:serverTimestamp()}));
  }
});

test("unauthenticated applicants cannot read, create or edit volunteer intake", async () => {
  await seed("volunteer-a", "volunteer");
  const approved = env.authenticatedContext("volunteer-a").firestore();
  await assertSucceeds(setDoc(doc(approved, "volunteerApplications", "volunteer-a"), intake("volunteer-a")));
  const anonymous = env.unauthenticatedContext().firestore();
  const record = doc(anonymous, "volunteerApplications", "volunteer-a");
  await assertFails(getDoc(record));
  await assertFails(setDoc(record, intake("volunteer-a")));
  await assertFails(updateDoc(record, {weeklyHours:"9-12", updatedAt:serverTimestamp()}));
});

test("coordinator cannot assign a volunteer with failed assessment or blocked safeguarding", async () => {
  await seed("volunteer-a", "volunteer");
  await seed("admin-a", "admin");
  const vdb = env.authenticatedContext("volunteer-a").firestore();
  const adb = env.authenticatedContext("admin-a").firestore();
  await assertSucceeds(setDoc(doc(vdb, "volunteerApplications", "volunteer-a"), intake("volunteer-a")));
  const record = doc(adb, "volunteerApplications", "volunteer-a");
  await assertFails(updateDoc(record, {
    reviewStage:"active", assessmentStatus:"failed", safeguardingStatus:"cleared",
    placementStatus:"assigned", updatedAt:serverTimestamp()
  }));
  await assertFails(updateDoc(record, {
    reviewStage:"active", assessmentStatus:"passed", safeguardingStatus:"blocked",
    placementStatus:"assigned", updatedAt:serverTimestamp()
  }));
});

const assignment = uid => ({
  volunteerId:uid,roleTitle:"Community Education Volunteer",
  coordinatorName:"Synthetic Coordinator",
  coordinatorEmail:"coordinator@example.test",
  scope:"Support community education under direct supervision only.",
  reportingInstructions:"Send weekly updates by official email.",
  updatedAt:serverTimestamp()
});

test("coordinator is published only by admins after verified active placement", async()=>{
  for(const [uid,role] of [["volunteer-a","volunteer"],["volunteer-b","volunteer"],["admin-a","admin"]])
    await seed(uid,role);
  const owner = env.authenticatedContext("volunteer-a").firestore();
  const other = env.authenticatedContext("volunteer-b").firestore();
  const admin = env.authenticatedContext("admin-a").firestore();
  const intakeDoc = doc(owner,"volunteerApplications","volunteer-a");
  const assignedDoc = doc(owner,"volunteerAssignments","volunteer-a");
  await assertSucceeds(setDoc(intakeDoc,intake("volunteer-a")));
  await assertFails(setDoc(assignedDoc,assignment("volunteer-a")));
  await assertFails(setDoc(doc(other,"volunteerAssignments","volunteer-a"),assignment("volunteer-a")));
  await assertFails(setDoc(doc(admin,"volunteerAssignments","volunteer-a"),assignment("volunteer-a")));
  await assertFails(getDoc(assignedDoc));
  await assertSucceeds(updateDoc(doc(admin,"volunteerApplications","volunteer-a"), {
    reviewStage:"active",assessmentStatus:"passed",safeguardingStatus:"cleared",
    placementStatus:"assigned",updatedAt:serverTimestamp()
  }));
  await assertSucceeds(setDoc(doc(admin,"volunteerAssignments","volunteer-a"),assignment("volunteer-a")));
  await assertSucceeds(getDoc(assignedDoc));
  await assertFails(getDoc(doc(other,"volunteerAssignments","volunteer-a")));
  await assertFails(updateDoc(assignedDoc,{coordinatorName:"Volunteer impersonator",updatedAt:serverTimestamp()}));
  await assertFails(setDoc(doc(admin,"volunteerAssignments","volunteer-b"),assignment("volunteer-b")));
  await assertFails(setDoc(doc(admin,"volunteerAssignments","volunteer-a"),{...assignment("volunteer-a"), patientNotes:"unsafe"}));
  await assertFails(setDoc(doc(admin,"volunteerAssignments","volunteer-a"),{...assignment("volunteer-a"), coordinatorEmail:"not-an-email"}));
});

test("revoked or paused volunteers cannot read an old coordinator assignment",async()=>{
  await seed("volunteer-a","volunteer");await seed("admin-a","admin");
  const owner = env.authenticatedContext("volunteer-a").firestore();
  const admin = env.authenticatedContext("admin-a").firestore();
  await assertSucceeds(setDoc(doc(owner,"volunteerApplications","volunteer-a"),intake("volunteer-a")));
  await assertSucceeds(updateDoc(doc(admin,"volunteerApplications","volunteer-a"),{
    reviewStage:"active",assessmentStatus:"passed",safeguardingStatus:"cleared",
    placementStatus:"assigned",updatedAt:serverTimestamp()
  }));
  const assignedDoc=doc(owner,"volunteerAssignments","volunteer-a");
  await assertSucceeds(setDoc(doc(admin,"volunteerAssignments","volunteer-a"),assignment("volunteer-a")));
  await assertSucceeds(getDoc(assignedDoc));
  await assertSucceeds(updateDoc(doc(admin,"volunteerApplications","volunteer-a"),{
    reviewStage:"paused",placementStatus:"paused",updatedAt:serverTimestamp()
  }));
  await assertFails(getDoc(assignedDoc));
  await assertSucceeds(updateDoc(doc(admin,"volunteerApplications","volunteer-a"),{
    reviewStage:"active",placementStatus:"assigned",updatedAt:serverTimestamp()
  }));
  await env.withSecurityRulesDisabled(async ctx=>{
    await updateDoc(doc(ctx.firestore(),"users","volunteer-a"),{status:"revoked",approved:false});
  });
  await assertFails(getDoc(assignedDoc));
});

const message = (uid, senderUid="admin-a") => ({
  recipientUid:uid, senderUid, category:"onboarding",
  title:"Your next volunteer steps", body:"Sign in to review your next steps.",
  createdAt:serverTimestamp(), readAt:null
});
test("admin may send notification only to an approved volunteer; volunteers cannot forge messages",async()=>{
  await seed("volunteer-a","volunteer");
  await seed("volunteer-b","volunteer");
  await seed("pending-v","volunteer","pending");
  await seed("admin-a","admin");
  const a=env.authenticatedContext("volunteer-a").firestore();
  const b=env.authenticatedContext("volunteer-b").firestore();
  const admin=env.authenticatedContext("admin-a").firestore();
  const pathA=doc(admin,"volunteerNotifications","volunteer-a","messages","message-1");
  await assertFails(setDoc(doc(a,"volunteerNotifications","volunteer-a","messages","forged"),message("volunteer-a","volunteer-a")));
  await assertFails(setDoc(doc(b,"volunteerNotifications","volunteer-a","messages","forged"),message("volunteer-a","volunteer-b")));
  await assertFails(setDoc(doc(admin,"volunteerNotifications","pending-v","messages","m1"),message("pending-v")));
  await assertFails(setDoc(pathA,{...message("volunteer-a"),patientHistory:"never"}));
  await assertFails(setDoc(pathA,{...message("volunteer-a"),senderUid:"someone-else"}));
  await assertFails(setDoc(pathA,{...message("volunteer-a"),body:"too"}));
  await assertSucceeds(setDoc(pathA,message("volunteer-a")));
  await assertSucceeds(getDoc(doc(a,"volunteerNotifications","volunteer-a","messages","message-1")));
  await assertFails(getDoc(doc(b,"volunteerNotifications","volunteer-a","messages","message-1")));
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(),"volunteerNotifications","volunteer-a","messages","message-1")));
  await assertFails(deleteDoc(pathA));
  await assertFails(updateDoc(pathA,{body:"Edited after sending",updatedAt:serverTimestamp()}));
});
test("owner can mark one notice read, cannot edit message or clear unread status",async()=>{
  await seed("volunteer-a","volunteer");
  await seed("admin-a","admin");
  const admin=env.authenticatedContext("admin-a").firestore();
  const owner=env.authenticatedContext("volunteer-a").firestore();
  const pathAdmin=doc(admin,"volunteerNotifications","volunteer-a","messages","m1");
  const pathOwner=doc(owner,"volunteerNotifications","volunteer-a","messages","m1");
  await assertSucceeds(setDoc(pathAdmin,message("volunteer-a")));
  await assertFails(updateDoc(pathOwner,{title:"Change sender message",readAt:serverTimestamp()}));
  await assertSucceeds(updateDoc(pathOwner,{readAt:serverTimestamp()}));
  await assertFails(updateDoc(pathOwner,{readAt:null}));
  await assertFails(updateDoc(pathOwner,{readAt:serverTimestamp()}));
  await assertFails(deleteDoc(pathOwner));
});
test("revoked volunteers lose inbox access without deleting message history",async()=>{
  await seed("volunteer-a","volunteer");
  await seed("admin-a","admin");
  const admin=env.authenticatedContext("admin-a").firestore();
  const owner=env.authenticatedContext("volunteer-a").firestore();
  await assertSucceeds(setDoc(doc(admin,"volunteerNotifications","volunteer-a","messages","m1"),message("volunteer-a")));
  await env.withSecurityRulesDisabled(async ctx=>{
    await updateDoc(doc(ctx.firestore(),"users","volunteer-a"),{status:"revoked",approved:false});
  });
  await assertFails(getDoc(doc(owner,"volunteerNotifications","volunteer-a","messages","m1")));
  await assertFails(updateDoc(doc(owner,"volunteerNotifications","volunteer-a","messages","m1"),{readAt:serverTimestamp()}));
});
