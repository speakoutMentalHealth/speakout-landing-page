import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {chromium} from "playwright";

const pageHtml=await readFile(new URL("../admin-volunteers.html",import.meta.url),"utf8");
const adminScript=await readFile(new URL("../js/admin-volunteers.js",import.meta.url),"utf8");
const authMock=`export async function requireRoles(_roles,fn){await fn({uid:"synthetic-admin"});}`;
const aiMock=`export function setupCoordinatorDirectory(){};export function aiAssignmentPanel(){const p=document.createElement("details");p.className="assignment-editor ai-assignment";const s=document.createElement("summary");s.textContent="Gemini proposed role and coordinator";p.append(s);return p;}`;
const dbMock=`export const db={};`;
const firestoreMock=`
const people=[
  {id:"vol-a",record:{city:"Wuse",state:"FCT",reviewStage:"intake_received",assessmentStatus:"not_verified",safeguardingStatus:"pending",placementStatus:"not_assigned",focusAreas:["community_outreach"],emailUpdates:false}},
  {id:"vol-b",record:{city:"Keffi",state:"Nasarawa",reviewStage:"active",assessmentStatus:"passed",safeguardingStatus:"cleared",placementStatus:"assigned",focusAreas:["research"],emailUpdates:true}}
];
const names={"vol-a":"Abdulhameed Ibrahim","vol-b":"Bisi Adedun"};
export const collection=(_db,...args)=>args.join("/");
export const doc=(_db,...args)=>args.join("/");
export const query=ref=>ref;
export const limit=()=>null;
export const serverTimestamp=()=>({server:true});
export async function getDocs(){return {empty:false,size:people.length,docs:people.map(x=>({id:x.id,data:()=>({...x.record})}))};}
export async function getDoc(path){
  if(String(path).startsWith("users/")){
    const uid=path.split("/").at(-1);
    return {exists:()=>!!names[uid],data:()=>({fullName:names[uid],email:uid+"@example.test"})};
  }
  return {exists:()=>false,data:()=>({})};
}
export function writeBatch(){
  const actions=[];
  return {
    update(path,payload){actions.push([path,payload]);},
    set(path,payload){actions.push([path,payload]);},
    async commit(){for(const [path,payload] of actions){if(String(path).startsWith("volunteerApplications/")){
      const person=people.find(x=>x.id===path.split("/").at(-1));
      if(person)Object.assign(person.record,payload);
    }}}
  };
}
export const addDoc=async()=>({id:"synthetic-notification"});
export const updateDoc=async()=>{};
export const setDoc=async()=>{};
`;
const server=createServer((req,res)=>{
  const send=(type,data)=>{res.writeHead(200,{"content-type":type});res.end(data);};
  if(req.url==="/admin-volunteers.html")return send("text/html",pageHtml);
  if(req.url==="/js/admin-volunteers.js")return send("text/javascript",adminScript);
  if(req.url==="/js/admin-volunteer-ai.js")return send("text/javascript",aiMock);
  if(req.url==="/firebase-config.js")return send("text/javascript",dbMock);
  if(req.url==="/launch-role-guard.js")return send("text/javascript",authMock);
  res.writeHead(404);res.end("not found");
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
let browser;
try{
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.route("https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js",r=>r.fulfill({contentType:"text/javascript",body:firestoreMock}));
  await page.goto("http://127.0.0.1:"+server.address().port+"/admin-volunteers.html");
  await page.locator(".application").first().waitFor();
  assert.equal(await page.locator(".application").count(),2);
  assert.equal(await page.locator(".application-accordion[open]").count(),0,"volunteers must be folded by default");
  assert.equal(await page.locator(".review-editor .actions").first().isVisible(),false,"review controls hidden until expanded");
  await page.locator(".application-accordion > summary").first().click();
  assert.equal(await page.locator(".application-accordion[open]").count(),1);
  assert.equal(await page.locator(".application-content > details").first().count(),1);
  assert.equal(await page.locator(".application-content > details").count(),12,"each volunteer has six nested sections including Gemini review");
  assert.equal(await page.locator(".application-content > details[open]").count(),0,"all inner sections start collapsed");
  await page.locator(".review-editor > summary").first().click();
  assert.equal(await page.locator(".review-editor[open]").count(),1);
  await page.locator(".review-editor select").first().selectOption("orientation");
  await page.locator(".review-editor button").first().click();
  await page.locator(".review-editor [role=status]").first().getByText("Review saved.",{exact:false}).waitFor();
  assert.match(await page.locator(".application-summary").first().textContent(),/Review: orientation/);
  await page.locator("#stageFilter").selectOption("orientation");
  assert.equal(await page.locator(".application:visible").count(),1);
  await page.locator("#stageFilter").selectOption("all");
  await page.locator("#volunteerSearch").fill("Bisi");
  assert.equal(await page.locator(".application:visible").count(),1);
  assert.match(await page.locator(".application:visible .application-summary").textContent(),/Bisi Adedun/);
  await page.locator("#volunteerSearch").fill("");
  await page.locator(".application-accordion > summary").first().click();
  assert.equal(await page.locator(".application-accordion[open]").count(),0);
  for(const width of [320,375,390,768,1280]){
    await page.setViewportSize({width,height:844});
    const widthInfo=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:window.innerWidth}));
    assert.ok(widthInfo.scroll<=widthInfo.viewport,"horizontal overflow at "+width+": "+JSON.stringify(widthInfo));
  }
  await page.locator(".application-accordion > summary").nth(1).focus();
  await page.keyboard.press("Enter");
  assert.equal(await page.locator(".application-accordion[open]").count(),1,"keyboard should expand volunteer");
  console.log("PASS: collapsed volunteer cards, nested controls, saved review, search, stage filter, mobile widths and keyboard.");
}finally{
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
}
