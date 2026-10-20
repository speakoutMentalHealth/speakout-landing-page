// Isolated UI fixtures; these do not prove live authentication or provider delivery.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.PORTAL_BASE_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true});
const fixture={window:{},mindcheck:{status:'ready',visits:42,pages:[{path:'/index.html',visits:32}]},logins:{status:'ready',signIns:8,accounts:5,daily:[{day:'2026-10-18',signIns:8}]},updatedAt:'2026-10-18T12:00:00Z'};
try{
for(const width of [320,390,1280]){
 const context=await browser.newContext({viewport:{width,height:850}});
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.pathname==='/launch-role-guard.js')return route.fulfill({contentType:'text/javascript',body:'export function requireRoles(roles,cb){if(!roles.includes("admin"))throw Error("guard");queueMicrotask(cb)}'});
  if(url.pathname==='/js/firebase-config.js')return route.fulfill({contentType:'text/javascript',body:'export const auth={currentUser:{uid:"fixture"}}'});
  if(url.hostname==='www.gstatic.com'&&url.pathname.endsWith('/firebase-auth.js'))return route.fulfill({contentType:'text/javascript',body:'export function onAuthStateChanged(auth,cb){queueMicrotask(()=>cb(auth.currentUser));globalThis.fixtureLogout=()=>{auth.currentUser=null;cb(null)};return ()=>{}}'});
  if(url.pathname==='/js/platform-api.js')return route.fulfill({contentType:'text/javascript',body:`export const adminApi={trafficSummary:async period=>{globalThis.fixturePeriod=period;if(globalThis.fixtureError){const e=Error(globalThis.fixtureSupport?'Exit school support mode to view organisation traffic.':'unavailable');e.status=globalThis.fixtureStatus;throw e;}if(globalThis.fixtureOverride)return globalThis.fixtureOverride;return globalThis.fixtureMissing?{...${JSON.stringify(fixture)},mindcheck:{status:'not_configured',visits:null,pages:[]}}:${JSON.stringify(fixture)}}}`});
  if(url.pathname==='/js/account-controls.js')return route.fulfill({contentType:'text/javascript',body:''});
  if(url.origin!==base)return route.abort();return route.continue();
 });
 const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(base+'/admin-traffic.html');try{await page.locator('#report').waitFor({state:'visible'})}catch(error){console.error({errors,status:await page.locator('#status').textContent(),body:await page.locator('body').innerText()});throw error}
 assert.equal(await page.locator('#visits').textContent(),'42');assert.equal(await page.locator('#signins').textContent(),'8');assert.equal(await page.locator('#accounts').textContent(),'5');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.selectOption('#period','week');await page.waitForFunction(()=>globalThis.fixturePeriod==='week');
 await page.selectOption('#period','month');await page.waitForFunction(()=>globalThis.fixturePeriod==='month');
 await page.evaluate(()=>{globalThis.fixtureMissing=true});await page.click('#refresh');await page.locator('#connection').waitFor({state:'visible'});assert.equal(await page.locator('#visits').textContent(),'—');assert.equal(await page.locator('#signins').textContent(),'8');
 if(width===390){
  for(const [reason,text] of [['provider_unauthorized','saved connection (401)'],['provider_forbidden','statistics request (403)'],['provider_bad_request','date range'],['provider_redirect','not forwarded'],['provider_rate_limited','rate-limiting'],['provider_response','could not be validated'],['provider_timeout','did not respond in time'],['provider_network','could not reach'],['provider_blocked','before returning an API response']]){
   await page.evaluate(({fixture,reason})=>{globalThis.fixtureMissing=false;globalThis.fixtureOverride={...fixture,mindcheck:{status:'unavailable',visits:null,pages:[],reason,pagesStatus:'unavailable'}}},{fixture,reason});await page.click('#refresh');await page.waitForFunction(text=>document.querySelector('#connection').textContent.includes(text),text);assert.equal(await page.locator('#signins').textContent(),'8');assert.equal(await page.locator('#visits').textContent(),'—');
  }
  await page.evaluate(fixture=>{globalThis.fixtureOverride={...fixture,mindcheck:{status:'partial',visits:42,pages:[],pagesStatus:'unavailable',reason:'provider_forbidden'}}},fixture);await page.click('#refresh');await page.waitForFunction(()=>document.querySelector('#visits').textContent==='42');assert.match(await page.locator('#pages-status').innerText(),/figures will appear/);
  await page.evaluate(fixture=>{globalThis.fixtureOverride={...fixture,mindcheck:{status:'ready',visits:0,pages:[],pagesStatus:'ready'}}},fixture);await page.click('#refresh');await page.waitForFunction(()=>document.querySelector('#visits').textContent==='0');assert.equal(await page.locator('#connection').isVisible(),false);assert.match(await page.locator('#pages-status').innerText(),/No public page/);
  await page.evaluate(()=>globalThis.fixtureOverride=null);
 }
 await page.evaluate(()=>{globalThis.fixtureError=true});await page.click('#refresh');await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Unable'));assert.equal(await page.locator('#report').isVisible(),false);
 for(const [status,text] of [[401,'session needs'],[403,'administrator access'],[404,'endpoint is unavailable'],[500,'server error']]){await page.evaluate(status=>{globalThis.fixtureStatus=status},status);await page.click('#refresh');await page.waitForFunction(text=>document.querySelector('#status').textContent.includes(text),text)}
 await page.evaluate(()=>{globalThis.fixtureSupport=true});await page.click('#refresh');await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Exit school support mode'));
 await page.evaluate(()=>{globalThis.fixtureError=false;globalThis.fixtureSupport=false;globalThis.fixtureStatus=undefined;globalThis.fixtureMissing=false});await page.click('#refresh');await page.locator('#report').waitFor({state:'visible'});
 await page.evaluate(()=>globalThis.fixtureLogout());assert.equal(await page.locator('#report').isVisible(),false);assert.equal(await page.locator('#visits').textContent(),'—');assert.deepEqual(errors,[]);
 await context.close();console.log('Traffic UI passed at '+width+'px');
}
}finally{await browser.close()}
