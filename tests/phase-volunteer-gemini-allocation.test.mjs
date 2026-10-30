import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fairCandidates, validateCoordinator, validateModelDraft, modelInput } from "../workers/platform-api/src/volunteer-allocation.js";

const sample={focusAreas:["mental_health_education","outreach"],availabilityDays:["Friday","Saturday"],participationMode:"hybrid",state:"Nasarawa",weeklyHours:"4-8",name:"PRIVATE VOLUNTEER",email:"never-send@example.test",experience:"No private free text"};
const coordinator=(id,assignedCount=0,options={})=>({
 id,name:"Coordinator "+id,email:id+"@speakoutmentalhealth.org",active:true,
 capacity:5,baselineLoad:0,assignedCount,
 focusAreas:["mental_health_education","outreach"],
 availabilityDays:["Friday","Saturday"],participationModes:["hybrid","remote"],
 city:"Keffi",state:"Nasarawa",...options
});
test("two equally qualified coordinators alternate at equal capacity",()=>{
 const group=[coordinator("a"),coordinator("b")],results=[];
 for(let i=0;i<10;i++){
   const top=fairCandidates(sample,group);
   assert.ok(top.length>=1,"capacity at iteration "+i);
   const winner=top[0];results.push(winner.id);
   group.find(x=>x.id===winner.id).assignedCount++;
 }
 assert.equal(group[0].assignedCount,5);
 assert.equal(group[1].assignedCount,5);
 assert.deepEqual(results,["a","b","a","b","a","b","a","b","a","b"]);
 assert.deepEqual(fairCandidates(sample,group),[]);
});
test("capacity, expertise, location and availability are hard limits",()=>{
 assert.deepEqual(fairCandidates(sample,[
   coordinator("full",5),
   coordinator("wrongExpertise",0,{focusAreas:["technology"]}),
   coordinator("wrongDay",0,{availabilityDays:["Monday"]}),
   coordinator("wrongState",0,{state:"Abuja"}),
   coordinator("notActive",0,{active:false}),
   coordinator("matched",0)
 ]).map(x=>x.id),["matched"]);
});
test("unequal capacities balance by utilization ratio, not simple headcount",()=>{
 const out=fairCandidates(sample,[coordinator("a",3,{capacity:5}),coordinator("b",1,{capacity:2})]);
 assert.equal(out[0].id,"b");
});
test("Gemini only sees categorical non-sensitive profile fields and pseudonymous IDs",()=>{
 const c=fairCandidates(sample,[coordinator("a")]);
 const input=modelInput(sample,c);
 const serialized=JSON.stringify(input);
 assert.doesNotMatch(serialized,/PRIVATE VOLUNTEER|never-send@example|No private free text|speakoutmentalhealth.org/i);
 assert.equal(input.options[0].coordinatorId,"a");
});
test("AI cannot select another coordinator or suggest independent clinical authority",()=>{
 const shortlist=fairCandidates(sample,[coordinator("a")]);
 const base={coordinatorId:"a",roleTitle:"Community outreach assistant",scope:"Prepare mental health awareness materials and supervised outreach",reportingInstructions:"Submit a supervised weekly report"};
 assert.deepEqual(validateModelDraft(base,shortlist),base);
 assert.throws(()=>validateModelDraft({...base,coordinatorId:"unknown"},shortlist));
 assert.throws(()=>validateModelDraft({...base,scope:"Provide independent counselling and diagnosis"},shortlist));
});
test("coordinator records cannot be submitted with invalid loads",()=>{
 assert.throws(()=>validateCoordinator(coordinator("a",6)));
 assert.throws(()=>validateCoordinator(coordinator("a",0,{capacity:-1})));
 assert.throws(()=>validateCoordinator(coordinator("a",0,{email:"invalid"})));
});
test("AI workflow is server-authenticated, transactional, and does not bypass clearance",()=>{
 const worker=readFileSync(new URL("../workers/platform-api/src/index.js",import.meta.url),"utf8");
 const rules=readFileSync(new URL("../firebase/firestore.rules",import.meta.url),"utf8");
 const admin=readFileSync(new URL("../js/admin-volunteer-ai.js",import.meta.url),"utf8");
 const html=readFileSync(new URL("../admin-volunteers.html",import.meta.url),"utf8");
 assert.match(worker,/if\(!env\.GEMINI_API_KEY\)/);
 assert.match(worker,/x-goog-api-key/);
 assert.match(worker,/volunteerAdmin\(user\)/);
 assert.match(worker,/application\.assessmentStatus!=="passed"/);
 assert.match(worker,/application\.safeguardingStatus!=="cleared"/);
 assert.match(worker,/Number\(c\.baselineLoad\)\+Number\(c\.assignedCount\)>=Number\(c\.capacity\)/);
 assert.match(worker,/tx\.patch\("volunteerCoordinators\/"\+draft\.coordinatorId/);
 assert.match(worker,/tx\.set\("volunteerAllocationAudits\/"\+eventId/);
 assert.match(worker,/volunteerNotifications\/"\+volunteerId/);
 assert.match(rules,/match \/volunteerCoordinators\/\{coordinatorId\} \{ allow read, write: if false/);
 assert.match(rules,/match \/volunteerAllocationDrafts\/\{volunteerId\} \{ allow read, write: if false/);
 assert.match(admin,/Request revision/);
 assert.match(admin,/Approve and publish/);
 assert.match(html,/id="coordinatorDirectory"/);
 assert.doesNotMatch(admin,/GEMINI_API_KEY/);
});
