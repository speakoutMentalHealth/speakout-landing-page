import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {chromium} from "playwright";
const html=await readFile(new URL("../volunteer-dashboard.html",import.meta.url),"utf8");
const app=await readFile(new URL("../js/volunteer-onboarding.js",import.meta.url),"utf8");
const fixture={status:"approved",record:null,writes:0};
const roleMock=[`export function renderRoleNav(){}`,`export async function requireRoles(roles,cb){const p=await (await fetch("/profile")).json();if(p.status!=="approved"){document.body.dataset.access="denied";document.querySelector("#intakeForm").remove();return;}document.body.dataset.access="approved";await cb({uid:"synthetic-volunteer"},{firstName:"Synthetic",role:"volunteer"});}`].join("\n");
const firestoreMock=[`export const doc=(_db,_collection,id)=>id;`,`export const serverTimestamp=()=> "synthetic-time";`,`export async function getDoc(){const data=await (await fetch("/record")).json();return {exists:()=>!!data,data:()=>data};}`,`export async function setDoc(_id,data){const response=await fetch("/write",{method:"POST",body:JSON.stringify(data)});if(!response.ok)throw Error("Denied");}`,`export const updateDoc=setDoc;`].join("\n");
const server=createServer((req,res)=>{
 const send=(type,data)=>{res.writeHead(200,{"content-type":type});res.end(data);};
 if(req.url==="/volunteer-dashboard.html")return send("text/html",html);
 if(req.url==="/js/volunteer-onboarding.js")return send("text/javascript",app);
 if(req.url==="/firebase-config.js")return send("text/javascript","export const auth={};export const db={};");
 if(req.url==="/launch-role-guard.js")return send("text/javascript",roleMock);
 if(req.url==="/profile")return send("application/json",JSON.stringify({status:fixture.status}));
 if(req.url==="/record")return send("application/json",JSON.stringify(fixture.record));
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
 for(const status of ["revoked","pending"]){fixture.status=status;await page.reload();await page.waitForFunction(()=>document.body.dataset.access==="denied");assert.equal(await page.locator("#intakeForm").count(),0);}
 console.log("PASS: synthetic volunteer intake, collapsed save, bio summary, edit, persistence and access checks");
} finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
