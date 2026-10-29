import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {chromium} from "playwright";
const html=await readFile(new URL("../volunteer-dashboard.html",import.meta.url),"utf8");
const app=await readFile(new URL("../js/volunteer-onboarding.js",import.meta.url),"utf8");
const credentialApp=await readFile(new URL("../js/volunteer-credential.js",import.meta.url),"utf8");
const nextActions=await readFile(new URL("../js/volunteer-next-actions.js",import.meta.url),"utf8");
const inboxApp=await readFile(new URL("../js/volunteer-inbox.js",import.meta.url),"utf8");
const fixture={status:"approved",record:null,assignment:null,credential:null,writes:0,notifications:[{id:"notice-1",title:"Welcome to SpeakOut",body:"Please check your next volunteer steps.",category:"onboarding",readAt:null}]};
const roleMock=[`export function renderRoleNav(){}`,`export async function requireRoles(roles,cb){const p=await (await fetch("/profile")).json();if(p.status!=="approved"){document.body.dataset.access="denied";document.querySelector("#intakeForm").remove();return;}document.body.dataset.access="approved";await cb({uid:"synthetic-volunteer"},{firstName:"Synthetic",role:"volunteer"});}`].join("\n");
const firestoreMock=[
`export const doc=(_db,...parts)=>parts.join("/");`,
`export const collection=(_db,...parts)=>parts.join("/");`,
`export const orderBy=()=>null;export const limit=()=>null;export const query=(ref)=>ref;`,
`export const serverTimestamp=()=> "synthetic-time";`,
`export async function getDoc(id){const path=String(id);const endpoint=path.startsWith("volunteerAssignments/")?"/assignment":path.startsWith("volunteerCredentialClaims/")?"/credential":"/record";const data=await (await fetch(endpoint)).json();return {exists:()=>!!data,data:()=>data};}`,
`export async function setDoc(id,data){const response=await fetch(String(id).startsWith("volunteerCredentialClaims/")?"/credential-write":"/write",{method:"POST",body:JSON.stringify(data)});if(!response.ok)throw Error("Denied");}`,
`let listener=null;export const onSnapshot=(_q,onData)=>{listener=onData;emit();return ()=>{listener=null};};`,
`async function emit(){if(!listener)return;const rows=await(await fetch("/notices")).json();listener({empty:rows.length===0,forEach(cb){rows.forEach(x=>cb({id:x.id,data:()=>x}));}});}`,
`export async function updateDoc(id,data){if(String(id).includes("volunteerNotifications/")){const response=await fetch("/mark-read",{method:"POST",body:JSON.stringify({id:String(id).split("/").at(-1)})});if(!response.ok)throw Error("Denied");await emit();return;}return setDoc(id,data);}`
].join("\n");
const server=createServer((req,res)=>{
 const send=(type,data)=>{res.writeHead(200,{"content-type":type});res.end(data);};
 if(req.url==="/volunteer-dashboard.html")return send("text/html",html);
 if(req.url==="/js/volunteer-onboarding.js")return send("text/javascript",app);
 if(req.url==="/js/volunteer-credential.js")return send("text/javascript",credentialApp);
 if(req.url==="/js/volunteer-next-actions.js")return send("text/javascript",nextActions);
 if(req.url==="/js/volunteer-inbox.js")return send("text/javascript",inboxApp);
 if(req.url==="/firebase-config.js")return send("text/javascript","export const auth={};export const db={};");
 if(req.url==="/launch-role-guard.js")return send("text/javascript",roleMock);
 if(req.url==="/profile")return send("application/json",JSON.stringify({status:fixture.status}));
 if(req.url==="/record")return send("application/json",JSON.stringify(fixture.record));
 if(req.url==="/assignment")return send("application/json",JSON.stringify(fixture.assignment));
 if(req.url==="/credential")return send("application/json",JSON.stringify(fixture.credential));
 if(req.url==="/credential-write"&&req.method==="POST"){let body="";req.on("data",chunk=>body+=chunk);req.on("end",()=>{if(fixture.status!=="approved"){res.writeHead(403);res.end();return;}fixture.credential={...fixture.credential,...JSON.parse(body)};send("application/json",JSON.stringify(fixture.credential));});return;}
 if(req.url==="/notices")return send("application/json",JSON.stringify(fixture.notifications));
 if(req.url==="/mark-read"&&req.method==="POST"){
   let body="";req.on("data",chunk=>body+=chunk);req.on("end",()=>{
     if(fixture.status!=="approved"){res.writeHead(403);res.end();return;}
     const {id}=JSON.parse(body);
     const item=fixture.notifications.find(x=>x.id===id);
     if(!item||item.readAt){res.writeHead(403);res.end();return;}
     item.readAt="synthetic-time";
     send("application/json",JSON.stringify({ok:true}));
   });return;
 }

 if(req.url==="/write"&&req.method==="POST"){let body="";req.on("data",x=>body+=x);req.on("end",()=>{if(fixture.status!=="approved"){res.writeHead(403);res.end();return;}const data=JSON.parse(body);fixture.record={...fixture.record,...data};fixture.writes++;send("application/json",JSON.stringify(fixture.record));});return;}
 res.writeHead(404);res.end("Not found");
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
let browser;
try {
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage();
 await page.route("https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js",route=>route.fulfill({contentType:"text/javascript",body:firestoreMock}));
 const url="http://127.0.0.1:"+server.address().port+"/volunteer-dashboard.html";
 await page.goto(url);
 await page.waitForFunction(()=>document.body.dataset.access==="approved");
 await page.locator("#notificationList").getByText("Welcome to SpeakOut").waitFor();
 assert.equal(await page.locator("#notificationUnread").textContent(),"1");
 await page.locator(".notice-read").click();
 await page.locator("#notificationState").getByText("You're up to date.").waitFor();
 assert.equal(fixture.notifications[0].readAt,"synthetic-time");
 await page.locator("#city").fill("Keffi");
 await page.locator("#state").fill("Nasarawa");
 await page.locator("#languages").fill("English, Hausa");
 await page.locator('input[name="availabilityDays"][value="Friday"]').check();
 await page.locator('input[name="focusAreas"][value="research"]').check();
 await page.locator("#safeguardingAcknowledged").check();
 await page.locator("#saveIntake").click();
 await page.locator("#formMessage").getByText("Volunteer information saved.",{exact:false}).waitFor();
 assert.equal(fixture.writes,1);assert.equal(fixture.record.reviewStage,"intake_received");assert.equal(fixture.record.assessmentStatus,"not_verified");
 assert.equal(await page.locator("#intakeDisclosure").evaluate(node=>node.open),false,"Editor must close after save");
 await page.locator("#profileSummary").getByText("Keffi, Nasarawa").waitFor();
 await page.locator("#journeySteps").getByText("Already have a certificate?").waitFor();
 await page.locator("#certificateReference").fill("MC-CERT-20261029-ABCD");
 await page.locator("#submitCredential").click();
 await page.locator("#credentialFeedback").getByText("Certificate reference received.",{exact:false}).waitFor();
 await page.locator("#journeySteps").getByText("Certificate submitted — awaiting verification").waitFor();
 assert.equal(fixture.credential.reviewStatus,"pending");
 await page.locator("#profileSummary").getByText("Research").waitFor();
 await page.locator("#intakeToggle").click();
 assert.equal(await page.locator("#intakeDisclosure").evaluate(node=>node.open),true,"Edit profile must reopen the form");
 await page.locator("#weeklyHours").selectOption("9-12");
 await page.locator("#experience").fill("Community research and volunteer education");
 await page.locator("#saveIntake").click();
 await page.locator("#formMessage").getByText("Volunteer information saved.",{exact:false}).waitFor();
 assert.equal(fixture.writes,2);assert.equal(fixture.record.weeklyHours,"9-12");
 assert.equal(await page.locator("#intakeDisclosure").evaluate(node=>node.open),false,"Editor must close after profile update");
 await page.locator("#profileSummary").getByText("Community research and volunteer education").waitFor();
 await page.reload();
 await page.waitForFunction(()=>document.body.dataset.access==="approved");
 await page.locator("#profileSummary").getByText("Community research and volunteer education").waitFor();
 assert.equal(await page.locator("#intakeDisclosure").evaluate(node=>node.open),false,"Saved profile should load collapsed");
 // The volunteer must not be told to contact an unnamed coordinator.
 fixture.record={...fixture.record,reviewStage:"active",assessmentStatus:"passed",
   safeguardingStatus:"cleared",placementStatus:"assigned"};
 await page.reload();
 await page.waitForFunction(()=>document.body.dataset.access==="approved");
 await page.locator("#assignmentFallback").waitFor({state:"visible"});
 assert.equal(await page.locator("#assignmentEmail").isVisible(),false);
 fixture.assignment={
   roleTitle:"Community Education Volunteer",coordinatorName:"Synthetic Coordinator",
   coordinatorEmail:"coordinator@example.test",
   scope:"Only supervised public education, no private records",
   reportingInstructions:"Email a weekly status report"
 };
 await page.reload();
 await page.waitForFunction(()=>document.body.dataset.access==="approved");
 await page.locator("#assignmentDetails").getByText("Synthetic Coordinator").waitFor();
 await page.locator("#assignmentDetails").getByText("Community Education Volunteer").waitFor();
 await page.locator("#assignmentEmail").waitFor({state:"visible"});
 assert.match(await page.locator("#assignmentEmail").getAttribute("href"),/coordinator%40example.test/);
 for(const status of ["revoked","pending"]){fixture.status=status;await page.reload();await page.waitForFunction(()=>document.body.dataset.access==="denied");assert.equal(await page.locator("#intakeForm").count(),0);}
 console.log("PASS: synthetic volunteer intake, collapsed save, bio summary, edit, persistence and access checks");
} finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
