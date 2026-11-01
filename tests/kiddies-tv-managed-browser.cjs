/* Browser integration for the Firestore-published Kiddies TV overlay.
 * Uses a mocked Firestore REST endpoint; real credentials/rules are tested in emulator. */
'use strict';
const {chromium}=require('playwright');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const mkfields=v=>Object.fromEntries(Object.entries(v).map(([k,val])=>[k,Array.isArray(val)?{arrayValue:{values:val.map(x=>({stringValue:x}))}}:typeof val==='boolean'?{booleanValue:val}:{stringValue:val}]));
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const failure of [false,true]){
   const page=await browser.newPage({viewport:{width:390,height:844}});
   await page.route('https://kiddies.test/**',route=>{
    const name=new URL(route.request().url()).pathname.slice(1);
    try{route.fulfill({body:readFileSync(path.join(root,name)),contentType:name.endsWith('.js')?'application/javascript':name.endsWith('.json')?'application/json':name.endsWith('.css')?'text/css':'text/html'});}
    catch{route.fulfill({status:404,body:''});}
   });
   await page.route('https://i.ytimg.com/**',route=>route.abort());
   await page.route('https://firestore.googleapis.com/**',route=>{
    const u=route.request().url();
    if(failure)return route.fulfill({status:403,headers:{'access-control-allow-origin':'*'},contentType:'application/json',body:'{}'});
    if(u.includes('/kiddiesTvConfig/live'))return route.fulfill({status:200,headers:{'access-control-allow-origin':'*'},contentType:'application/json',body:JSON.stringify({fields:mkfields({mode:'overlay',hiddenLegacyIds:['xg4_gWt8N_Q']})})});
    const video={youtubeId:'G0F2PiVP_FI',title:'African Countries Song',category:'Geography & Culture',description:'A verified educational song about African countries.',source:'Bino and Fino',ages:['6-9'],status:'published',approved:true,reviewConfirmed:true};
    return route.fulfill({status:200,headers:{'access-control-allow-origin':'*'},contentType:'application/json',body:JSON.stringify([{document:{fields:mkfields(video)}}])});
   });
   await page.goto('https://kiddies.test/kiddies-tv.html');
   await page.waitForFunction(()=>document.querySelector('#video-count').textContent!=='Loading the collection…');
   if(failure){
    assert.equal(await page.locator('.tile').count(),0,'Firestore outage must not resurrect hidden legacy clips');
    assert.match(await page.locator('#empty').textContent(),/temporarily unavailable/);
   }else{
    assert.equal(await page.locator('.tile').count(),30,'replace one archived legacy with one newly reviewed video');
    assert.equal(await page.locator('[data-report-video="xg4_gWt8N_Q"]').count(),0,'hidden legacy video must not reappear');
    assert.equal(await page.locator('[data-report-video="G0F2PiVP_FI"]').count(),1,'published managed video is visible');
   }
   await page.close();
  }
  console.log('PASS: live Firestore overlay, legacy archival, no redeployment needed, fail-closed read errors.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
