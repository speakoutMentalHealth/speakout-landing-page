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
  for(const [device,viewport] of [['compact-phone',{width:320,height:780}],['mobile',{width:390,height:844}],['desktop',{width:1440,height:900}]]){
   const page=await browser.newPage({viewport,deviceScaleFactor:1});
   await page.route('https://kiddies.test/**',route=>{
    const name=new URL(route.request().url()).pathname.slice(1);
    try{
     // Deliberately serve incompatible legacy assets if requested.
     if(['css/kiddies-tv.css','js/kiddies-tv-library.js'].includes(name)) {
       route.fulfill({body:name.endsWith('.css')?'body{background:orange!important}':'throw Error("cached old JavaScript executed")',contentType:name.endsWith('.css')?'text/css':'application/javascript'});
       return;
     }
     const type=name.endsWith('.js')?'application/javascript':name.endsWith('.json')?'application/json':name.endsWith('.css')?'text/css':'text/html';
     route.fulfill({body:readFileSync(path.join(root,name)),contentType:type});
    }catch{route.fulfill({status:404,body:''});}
   });
   await page.route('https://firestore.googleapis.com/**',route=>route.fulfill({status:404,headers:{'access-control-allow-origin':'*'},body:'{}',contentType:'application/json'}));
   await page.route('https://i.ytimg.com/**',route=>route.abort());
   await page.route('https://www.youtube-nocookie.com/**',route=>route.fulfill({body:'<!doctype html><title>Mock video</title>',contentType:'text/html'}));
   await page.goto('https://kiddies.test/kiddies-tv.html');
   await page.waitForSelector('.tile');
   assert.equal(await page.locator('#player').isHidden(),true,'player should not dominate initial page');
   assert.equal(await page.locator('.tile').count(),30,'the five owner-approved teen lessons must be published');
   const assetLinks=await page.evaluate(()=>({css:[...document.querySelectorAll('link[rel="stylesheet"]')].map(n=>new URL(n.href).pathname),js:[...document.querySelectorAll('script[src]')].map(n=>new URL(n.src).pathname)}));
   assert(assetLinks.css.includes('/css/kiddies-tv-curriculum-20261101.css'),device+' needs fresh CSS URL');
   assert(assetLinks.js.includes('/js/kiddies-tv-managed-20261101.js'),device+' needs fresh JS URL');
   assert(!assetLinks.css.includes('/css/kiddies-tv.css')&&!assetLinks.js.includes('/js/kiddies-tv-library.js'),device+' must not use stale URL');
   const rendered=await page.evaluate(()=>({searchBackground:getComputedStyle(document.querySelector('.search-field')).backgroundColor,navHome:getComputedStyle(document.querySelector('.nav-home')).display}));
   if(device!=='desktop') assert.equal(rendered.navHome,'none','mobile navigation must fit phone');
   assert.notEqual(rendered.searchBackground,'rgba(0, 0, 0, 0)','new CSS applies to search input');
   assert.equal(await page.locator('.rail-section').count(),6,'five subjects plus secondary-school showcase');
   assert.equal(await page.locator('.rail-section--teen .tile').count(),5,'all five approved teen lessons appear on the dedicated shelf');
   assert.equal(await page.locator('.chip').count(),17,'sixteen subjects and All lessons');
   assert.equal(await page.locator('.hero.has-feature').count(),1,'feature must use approved content');
   assert.match(await page.locator('#hero-image').getAttribute('src'),/mxzyANgHrS0/,'default spotlight must be an approved science video');
   assert.equal(await page.locator('#hero-feature-count').textContent(),'01 / 03');
   await page.locator('#hero-next').click();
   assert.equal(await page.locator('#hero-feature-count').textContent(),'02 / 03');
   assert.match(await page.locator('#hero-image').getAttribute('src'),/ZN2rjEVlsmc/,'next spotlight remains approved');
   await page.locator('#hero-next').click();
   await page.locator('#hero-next').click();
   assert.equal(await page.locator('#hero-feature-count').textContent(),'01 / 03','feature cycles back to start');
   assert.equal(await page.locator('#surprise-video').isEnabled(),true);
   assert.equal(await page.locator('#stop-video-quick').count(),0);
   const width=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:innerWidth}));
   assert(width.scroll<=width.viewport+2,device+' horizontal page overflow: '+JSON.stringify(width));
   const contentBounds=await page.evaluate(()=>{
     const sel=['.hero','.hero-content','.hero-actions','.primary','.explore','.filter-bar'];
     return sel.map(s=>{const r=document.querySelector(s).getBoundingClientRect();return {selector:s,left:r.left,right:r.right,width:r.width};});
   });
   assert(contentBounds.every(r=>r.left>=-2 && r.right<=viewport.width+2),device+' key controls clipped: '+JSON.stringify(contentBounds));
   await page.screenshot({path:path.join(artifact,device+'-home.png'),fullPage:true,animations:'disabled'});
   await page.locator('.tile-watch').first().click();
   await page.waitForSelector('#player-frame iframe');
   assert.equal(new URL(page.url()).pathname,'/kiddies-tv.html');
   await page.screenshot({path:path.join(artifact,device+'-watch.png'),fullPage:true,animations:'disabled'});
   await page.locator('#close-video').click();
   assert.equal(await page.locator('#player').isHidden(),true);
   await page.getByRole('button',{name:'Geography & Culture',exact:true}).click();
   assert.equal(await page.locator('#subject-review-status').isVisible(),true,'geography displays pending-review message, not a broken empty shelf');
   assert.equal(await page.locator('#empty').isHidden(),true,'geography should not show an unexplained no-results message');
   await page.getByRole('button',{name:'Coding & Digital Literacy',exact:true}).click();
   assert.equal(await page.locator('#subject-review-status').isVisible(),true,'coding displays pending-review message');
   await page.getByRole('button',{name:'All lessons',exact:true}).click();
   assert.equal(await page.locator('#subject-review-status').isHidden(),true,'review message disappears on All lessons');
   await page.selectOption('#age','0-2');
   assert.equal(await page.locator('#caregiver-status').isVisible(),true,'under-two pathway must be caregiver-led');
   assert.equal(await page.locator('.tile').count(),0,'no infant video playback recommendations');
   assert.equal(await page.locator('#empty').isHidden(),true,'caregiver area should not look broken');
   assert.equal(await page.locator('#surprise-video').isDisabled(),true,'no featured infant video');
   await page.selectOption('#age','');
   await page.getByRole('button',{name:'Literature & Storytelling',exact:true}).click();
   assert.equal(await page.locator('#subject-review-status').isVisible(),true,'new literature collection is being reviewed');
   await page.getByRole('button',{name:'All lessons',exact:true}).click();
   await page.locator('#search').fill('THIS TOPIC DOES NOT EXIST');
   assert.equal(await page.locator('.tile').count(),0);
   assert.equal(await page.locator('#empty').isVisible(),true);
   await page.locator('#search').fill('');
   await page.selectOption('#age','13-17');
   assert.equal(await page.locator('.tile').count(),5,'five explicitly owner-approved teen lessons load');
   assert.equal(await page.locator('#teen-review-status').isHidden(),true,'a populated teen collection must not show pending state');
   assert.equal(await page.locator('#empty').isHidden(),true);
   assert.equal(await page.locator('.rail-section--teen').count(),1,'age 13–17 is a dedicated collection');
   await page.close();
  }
  console.log('PASS: premium design mobile/desktop, thumbnails and shelves, no page overflow, on-site playback, close player and empty search. Images/video mocked; screenshots in artifacts/kiddies-tv-cinema.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
