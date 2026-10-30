import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {chromium} from "playwright";

const app=await readFile(new URL("../js/admin-volunteer-ai.js",import.meta.url),"utf8");
const html=String.raw`<!doctype html><html><body>
<details id="coordinatorDirectory"><summary>Directory</summary>
<div id="coordinatorList"></div><button id="newCoordinator">Add coordinator</button>
<form id="coordinatorForm" hidden><input type="hidden" name="coordinatorId">
<input name="name"><input name="email"><input name="capacity"><input name="baselineLoad"><input name="city"><input name="state"><input type="checkbox" name="active">
<button type="submit">Save</button></form><p id="coordinatorMessage"></p>
</details><div id="app"></div>
<script type="module">
import {setupCoordinatorDirectory,aiAssignmentPanel} from "/js/admin-volunteer-ai.js";
setupCoordinatorDirectory();
document.getElementById("app").append(aiAssignmentPanel("synthetic-volunteer",{reviewStage:"eligible",assessmentStatus:"passed",safeguardingStatus:"cleared",placementStatus:"not_assigned"}));
</script></body></html>`;
const stub=String.raw`let coordinator=null,draft=null;
export async function platformRequest(path,body={}){
 if(path.endsWith("coordinators/list"))return {coordinators:coordinator?[coordinator]:[]};
 if(path.endsWith("coordinators/save")){coordinator={...body.coordinator,id:"coordinator-a",assignedCount:0};return {ok:true,id:coordinator.id};}
 if(path.endsWith("ai/draft"))return {draft};
 if(path.endsWith("ai/suggest")){draft={
   draftId:"draft-synthetic",volunteerId:body.volunteerId,coordinatorId:"coordinator-a",
   coordinatorName:"Synthetic Coordinator",coordinatorLoad:0,coordinatorCapacity:5,
   roleTitle:"Community mental health education volunteer",scope:"Support supervised outreach and prepare approved awareness materials",
   reportingInstructions:"Submit a weekly activity summary to the designated coordinator",status:"pending"
 };return {ok:true,draft};}
 if(path.endsWith("ai/approve")){if(body.draftId!=="draft-synthetic")throw Error("invalid draft");return {ok:true};}
 if(path.endsWith("ai/revise"))return {ok:true};
 if(path.endsWith("ai/pause")){if(!body.reason||body.reason.length<8)throw Error("Missing reason");draft={...draft,status:"paused"};return {ok:true,remainingAllocated:0};}
 throw Error("Unexpected API request "+path);
}`;
const server=createServer((req,res)=>{
 const send=(type,text)=>{res.writeHead(200,{"content-type":type});res.end(text);};
 if(req.url==="/")return send("text/html",html);
 if(req.url==="/js/admin-volunteer-ai.js")return send("text/javascript",app);
 if(req.url==="/js/platform-api.js")return send("text/javascript",stub);
 res.writeHead(404);res.end();
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
let browser;
try{
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[];
 page.on("pageerror",e=>errors.push(e.message));
 await page.goto("http://127.0.0.1:"+server.address().port+"/");
 await page.locator("#coordinatorDirectory summary").click();
 await page.locator("#newCoordinator").click();
 await page.locator('#coordinatorForm [name="name"]').fill("Synthetic Coordinator");
 await page.locator('#coordinatorForm [name="email"]').fill("synthetic@example.org");
 await page.locator('#coordinatorForm [name="capacity"]').fill("5");
 await page.locator('#coordinatorForm [name="baselineLoad"]').fill("0");
 await page.locator('#coordinatorForm fieldset').first().locator('input').first().check();
 await page.locator('#coordinatorForm fieldset').nth(1).locator('input').first().check();
 await page.locator('#coordinatorForm fieldset').nth(2).locator('input').first().check();
 await page.locator('#coordinatorForm button[type="submit"]').click();
 await page.locator("#coordinatorList").getByText("Synthetic Coordinator").waitFor();
 // Opening the review panel must start generation on its own.
 await page.locator(".ai-assignment > summary").click();
 await page.locator(".ai-preview").getByText("Community mental health education volunteer").waitFor();
 assert.equal(await page.locator(".ai-assignment .ai-field").count(),6);
 await page.locator(".ai-assignment button").getByText("Approve and publish").click();
 await page.locator(".ai-status").getByText("Approved. Assignment published",{exact:false}).waitFor();
 assert.equal(await page.locator(".ai-assignment button").getByText("Approve and publish").isVisible(),false);
 page.on("dialog",async dialog=>{
   if(dialog.type()==="prompt")await dialog.accept("Volunteer moved to another programme");
   else await dialog.accept();
 });
 await page.locator(".ai-assignment button").getByText("Pause assignment & release coordinator slot").click();
 await page.locator(".ai-status").getByText("Placement paused",{exact:false}).waitFor();
 assert.equal(await page.locator(".ai-assignment button").getByText("Pause assignment & release coordinator slot").isVisible(),false);
 assert.deepEqual(errors,[]);
 console.log("PASS: coordinator registration, automatic Gemini draft fill and administrator-only approval.");
}finally{
 await browser?.close();
 await new Promise(resolve=>server.close(resolve));
}
