import assert from "node:assert/strict";
import { chromium } from "playwright";

const base=process.env.GOOGLE_AUTH_BASE_URL||"http://127.0.0.1:4173";
const browser=await chromium.launch({headless:true});
const user={uid:"google-test-user",email:"google-test@example.test",displayName:"Google Learner",providerData:[{providerId:"google.com"}]};
const authModule=`
export class GoogleAuthProvider { setCustomParameters(value){window.testState.providerParameters=value;} }
export const browserSessionPersistence="session", browserLocalPersistence="local";
export async function setPersistence(auth,value){window.testState.persistence=value;}
export function onAuthStateChanged(auth,callback){window.authCallback=callback;queueMicrotask(()=>callback(auth.currentUser));}
export async function signInWithPopup(auth){
 const state=window.testState; state.popupCalls++;
 if(state.error) throw {code:state.error};
 auth.currentUser=state.user; await window.authCallback?.(state.user);
 return {user:state.user};
}
export async function signOut(auth){window.testState.signouts++;auth.currentUser=null;await window.authCallback?.(null);}
export async function deleteUser(){window.testState.deletes++;}
export async function createUserWithEmailAndPassword(){throw new Error("Google onboarding must not create a password user");}
export async function signInWithEmailAndPassword(){throw new Error("Unexpected password login");}
export async function sendPasswordResetEmail(){}`;
const firestoreModule=`
export function doc(db,collection,uid){return {collection,uid};}
const snapshot=()=>({exists:()=>Boolean(window.testState.profile),data:()=>window.testState.profile});
export async function getDoc(){return snapshot();}
export function serverTimestamp(){return "server-time";}
export async function runTransaction(db,callback){await callback({get:async()=>window.testState.raceProfile?{exists:()=>true,data:()=>window.testState.raceProfile}:snapshot(),set:(ref,data)=>{window.testState.writes.push(data);window.testState.profile=data;}});}`;
const apiModule=`export const onboardingApi={
resolveSchool:async()=>({school:{schoolCode:"TEST",schoolId:"school-test",schoolName:"Test School"}}),
joinSchool:async data=>{window.testState.schoolRequests.push(data);window.testState.profile={...data,uid:window.testState.user.uid,email:window.testState.user.email,status:"pending_school_approval",approved:false};}
};`;

async function setup(route,options={}){
 const context=await browser.newContext();
 await context.addInitScript(({user,options})=>{
   window.testState={user,profile:null,error:null,writes:[],schoolRequests:[],signouts:0,deletes:0,popupCalls:0,...options};
   window.authMock={currentUser:options.resume?user:null};
 },{user,options});
 await context.route("**/js/firebase-config.js",r=>r.fulfill({contentType:"application/javascript",body:"export const auth=window.authMock;export const db={};"}));
 await context.route("**/firebase-auth.js",r=>r.fulfill({contentType:"application/javascript",body:authModule}));
 await context.route("**/firebase-firestore.js",r=>r.fulfill({contentType:"application/javascript",body:firestoreModule}));
 await context.route("**/js/platform-api.js",r=>r.fulfill({contentType:"application/javascript",body:apiModule}));
 await context.route("**/student-dashboard.html",r=>r.fulfill({contentType:"text/html",body:"<h1>Student dashboard</h1>"}));
 const page=await context.newPage();
 await page.goto(`${base}/${route}`);
 await page.waitForFunction(()=>Boolean(window.authCallback));
 return {page,context};
}
async function connect(page){await page.locator("#loginPanel [data-google-signin]").click();}
async function state(page){return page.evaluate(()=>window.testState);}
try{
 for(const route of ["auth.html","auth/auth.html"]){
  for(const status of ["pending","rejected","suspended"]){
   const {page,context}=await setup(route,{profile:{uid:user.uid,role:"student",status,approved:true}});
   await connect(page);
   await page.locator("#loginMsg").getByText(status==="pending"?"Your account is pending approval.":status==="rejected"?"Your account is not approved. Please contact SpeakOut if you believe this is an error.":"Your account is suspended. Please contact SpeakOut for assistance.",{exact:true}).waitFor();
   const s=await state(page);assert.equal(s.signouts,1);assert.equal(s.writes.length,0);assert.equal(s.profile.status,status);
   await context.close();
  }
  {
   const {page,context}=await setup(route,{profile:{uid:user.uid,role:"student",status:"approved",approved:false}});
   await connect(page);await page.waitForURL("**/student-dashboard.html");await context.close();
  }
  {
   const {page,context}=await setup(route);
   await connect(page);await page.locator("#googleProfileNote").waitFor();
   assert.equal(await page.locator("#password").isVisible(),false);
   assert.equal(await page.locator("#password").isDisabled(),true);
   assert.equal(await page.locator("#email").inputValue(),user.email);
   assert.equal(await page.locator("#email").getAttribute("readonly"),"");
   await page.locator("#role").selectOption("student");await page.locator("#terms").check();
   await page.getByRole("button",{name:"Submit application",exact:true}).click();
   await page.locator("#regMsg").getByText("Account created successfully. Your application is now pending approval.",{exact:true}).waitFor();
   const s=await state(page);assert.equal(s.writes.length,1);assert.equal(s.writes[0].email,user.email);assert.equal(s.writes[0].status,"pending");assert.equal(s.writes[0].approved,false);assert.equal(s.deletes,0);assert.equal(s.persistence,"session");
   await context.close();
  }
  {
   const {page,context}=await setup(route);
   await connect(page);await page.locator("#googleProfileNote").waitFor();
   await page.locator("#role").selectOption("student");await page.locator("#schoolCode").fill("TEST");await page.locator("#verifySchoolBtn").click();
   await page.locator("#registrationNumber").fill("STU-01");await page.locator("#terms").check();
   await page.getByRole("button",{name:"Submit application",exact:true}).click();
   await page.locator("#regMsg").getByText("Account created. Your school must verify your details before institutional access is approved.",{exact:true}).waitFor();
   const s=await state(page);assert.equal(s.writes.length,0);assert.equal(s.schoolRequests.length,1);assert.equal(s.schoolRequests[0].registrationNumber,"STU-01");assert.equal(s.profile.approved,false);await context.close();
  }
  {
   const {page,context}=await setup(route);
   await connect(page);await page.locator("#googleProfileNote").waitFor();
   await page.evaluate(()=>window.testState.raceProfile={role:"admin",status:"approved",approved:true});
   await page.locator("#role").selectOption("student");await page.locator("#terms").check();
   await page.getByRole("button",{name:"Submit application",exact:true}).click();
   await page.locator("#regMsg").getByText("A SpeakOut profile already exists. Sign in to continue.",{exact:true}).waitFor();
   const s=await state(page);assert.equal(s.writes.length,0);assert.equal(s.deletes,0);assert.equal(s.raceProfile.role,"admin");await context.close();
  }
  {
   const {page,context}=await setup(route,{error:"auth/popup-blocked"});
   await connect(page);await page.locator("#loginMsg").getByText("Allow pop-ups for this site, then select Continue with Google again.",{exact:true}).waitFor();
   assert.equal((await state(page)).writes.length,0);assert.equal(await page.locator("#loginPanel [data-google-signin]").isEnabled(),true);await context.close();
  }
  {
   const {page,context}=await setup(route,{error:"auth/account-exists-with-different-credential"});
   await connect(page);await page.locator("#loginMsg").getByText(/This email already uses another sign-in method/).waitFor();
   const s=await state(page);assert.equal(s.writes.length,0);assert.equal(s.deletes,0);await context.close();
  }
  {
   const {page,context}=await setup(route);
   await connect(page);await page.locator("#googleProfileNote").waitFor();await page.locator("#cancelGoogleProfile").click();
   await page.locator("#regMsg").getByText(/Google profile setup cancelled/).waitFor();
   assert.equal(await page.locator("#password").isEnabled(),true);assert.equal((await state(page)).deletes,0);await context.close();
  }
  {
   const {page,context}=await setup(route,{resume:true});
   await page.locator("#googleProfileNote").waitFor();assert.equal((await state(page)).popupCalls,0);await context.close();
  }
  console.log(`${route}: Google application, school verification, approval denial, approved routing, popup/collision errors, cancellation and resumed setup passed.`);
 }
 console.log("Google gateway browser checks passed with mocked Firebase modules; real Google OAuth remains a separate acceptance check.");
}finally{await browser.close();}
