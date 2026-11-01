/* Responsive UX acceptance for the Kiddies TV design. Thumbnails and video are mocked. */
'use strict';
const {chromium}=require('playwright');
const {readFileSync,mkdirSync}=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'..');
 const artifact=path.join(root,'artifacts','kiddies-tv-cinema');
 mkdirSync(artifact,{recursive:true});
 const browser=await chromium.launch({headless:true});
 try{
  for(const [device,viewport] of [['mobile',{width:390,height:844}],['desktop',{width:1440,height:900}]]){
   const page=await browser.newPage({viewport,deviceScaleFactor:1});
   await page.route('https://kiddies.test/**',route=>{
    const name=new URL(route.request().url()).pathname.slice(1);
    try{
     const type=name.endsWith('.js')?'application/javascript':name.endsWith('.json')?'application/json':name.endsWith('.css')?'text/css':'text/html';
     route.fulfill({body:readFileSync(path.join(root,name)),contentType:type});
    }catch{route.fulfill({status:404,body:''});}
   });
   await page.route('https://i.ytimg.com/**',route=>route.abort());
   await page.route('https://www.youtube-nocookie.com/**',route=>route.fulfill({body:'<!doctype html><title>Mock video</title>',contentType:'text/html'}));
   await page.goto('https://kiddies.test/kiddies-tv.html');
   await page.waitForSelector('.tile');
   assert.equal(await page.locator('#player').isHidden(),true,'player should not dominate initial page');
   assert.equal(await page.locator('.tile').count(),25,'no unreviewed candidates published');
   assert.equal(await page.locator('.rail-section').count(),5,'only nonempty subject shelves render');
   assert.equal(await page.locator('.chip').count(),7,'six subjects and All lessons');
   assert.equal(await page.locator('.hero.has-feature').count(),1,'feature must use approved content');
   assert.equal(await page.locator('#surprise-video').isEnabled(),true);
   assert.equal(await page.locator('#stop-video-quick').count(),0);
   const width=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:innerWidth}));
   assert(width.scroll<=width.viewport+2,device+' horizontal page overflow: '+JSON.stringify(width));
   await page.screenshot({path:path.join(artifact,device+'-home.png'),fullPage:true,animations:'disabled'});
   await page.locator('.tile-watch').first().click();
   await page.waitForSelector('#player-frame iframe');
   assert.equal(new URL(page.url()).pathname,'/kiddies-tv.html');
   await page.screenshot({path:path.join(artifact,device+'-watch.png'),fullPage:true,animations:'disabled'});
   await page.locator('#close-video').click();
   assert.equal(await page.locator('#player').isHidden(),true);
   await page.locator('#search').fill('THIS TOPIC DOES NOT EXIST');
   assert.equal(await page.locator('.tile').count(),0);
   assert.equal(await page.locator('#empty').isVisible(),true);
   await page.close();
  }
  console.log('PASS: premium design mobile/desktop, thumbnails and shelves, no page overflow, on-site playback, close player and empty search. Images/video mocked; screenshots in artifacts/kiddies-tv-cinema.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
