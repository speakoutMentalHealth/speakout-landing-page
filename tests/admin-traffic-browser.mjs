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
  if(url.pathname==='/js/platform-api.js')return route.fulfill({contentType:'text/javascript',body:`export const adminApi={trafficSummary:async period=>{globalThis.fixturePeriod=period;if(globalThis.fixtureError)throw Error('unavailable');return globalThis.fixtureMissing?{...${JSON.stringify(fixture)},mindcheck:{status:'not_configured',visits:null,pages:[]}}:${JSON.stringify(fixture)}}`});
  if(url.pathname==='/js/account-controls.js')return route.fulfill({contentType:'text/javascript',body:''});
  if(url.origin!==base)return route.abort();return route.continue();
 });
 const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(base+'/admin-traffic.html');await page.locator('#report').waitFor({state:'visible'});
 assert.equal(await page.locator('#visits').textContent(),'42');assert.equal(await page.locator('#signins').textContent(),'8');assert.equal(await page.locator('#accounts').textContent(),'5');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.selectOption('#period','week');await page.waitForFunction(()=>globalThis.fixturePeriod==='week');
 await page.selectOption('#period','month');await page.waitForFunction(()=>globalThis.fixturePeriod==='month');
 await page.evaluate(()=>{globalThis.fixtureMissing=true});await page.click('#refresh');await page.locator('#connection').waitFor({state:'visible'});assert.equal(await page.locator('#visits').textContent(),'—');assert.equal(await page.locator('#signins').textContent(),'8');
 await page.evaluate(()=>{globalThis.fixtureError=true});await page.click('#refresh');await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Unable'));assert.equal(await page.locator('#report').isVisible(),false);
 await page.evaluate(()=>{globalThis.fixtureError=false;globalThis.fixtureMissing=false});await page.click('#refresh');await page.locator('#report').waitFor({state:'visible'});
 await page.evaluate(()=>globalThis.fixtureLogout());assert.equal(await page.locator('#report').isVisible(),false);assert.equal(await page.locator('#visits').textContent(),'—');assert.deepEqual(errors,[]);
 await context.close();console.log('Traffic UI passed at '+width+'px');
}
}finally{await browser.close()}
